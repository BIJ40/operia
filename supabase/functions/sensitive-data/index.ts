/**
 * SENSITIVE-DATA - Edge Function pour données RGPD sensibles
 * 
 * P0: CORS hardened, contrôles d'accès stricts
 * P2: Defense-in-depth — agency scope verification, enhanced audit logging
 * 
 * NOTE: SERVICE_ROLE_KEY is required here because:
 * 1. collaborator_sensitive_data has RLS that blocks direct user access by design
 * 2. The function itself enforces access control programmatically (isSelf / isAdmin / isSameAgency+RH)
 * 3. Encryption/decryption happens server-side only — data never stored in plaintext
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureEdgeException } from '../_shared/sentry.ts';
import { requireAal2 } from '../_shared/mfa.ts';
import { getRoleLevel } from '../_shared/roles.ts';

// AES-256-GCM encryption using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('SENSITIVE_DATA_ENCRYPTION_KEY');
  if (!keyString) {
    throw new Error('SENSITIVE_DATA_ENCRYPTION_KEY not configured');
  }
  
  // Derive a 256-bit key from the secret using SHA-256
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(keyString));
  
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) return '';
  
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and ciphertext
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

serve(async (req) => {
  // P0: CORS hardened
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // P0: Rate limiting (100 req/min pour données sensibles - augmenté pour hover cards)
    const rateLimitKey = `sensitive-data:${user.id}`;
    const rateCheck = await checkRateLimit(rateLimitKey, { limit: 100, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      console.log(`[SENSITIVE-DATA] Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    const { action, collaboratorId, data } = await req.json();

    // P2: Validate collaboratorId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!collaboratorId || !uuidRegex.test(collaboratorId)) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Invalid collaboratorId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Verify user has access to this collaborator's data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('agency_id, global_role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Check access permissions
    const { data: collaborator } = await supabaseClient
      .from('collaborators')
      .select('agency_id, user_id')
      .eq('id', collaboratorId)
      .single();

    if (!collaborator) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Collaborator not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Check RH admin via user_modules (source de vérité unique)
    const { data: rhAdminModule } = await supabaseClient
      .from('user_modules')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_key', 'rh')
      .maybeSingle();
    
    const hasRhOption = rhAdminModule != null;

    // Access check: user is the collaborator, or is admin/RH of same agency
    const isSelf = collaborator.user_id === user.id;
    const isSameAgency = collaborator.agency_id === profile.agency_id;
    const isAdmin = ['platform_admin', 'superadmin'].includes(profile.global_role);
    const isDirigeant = ['franchisee_admin', 'franchisor_admin', 'franchisor_user'].includes(profile.global_role);

    // P2: Defense-in-depth — non-admin users MUST be in the same agency
    if (!isAdmin && !isSameAgency) {
      console.warn(`[SENSITIVE-DATA] Cross-agency access blocked: user ${user.id} (agency ${profile.agency_id}) → collaborator ${collaboratorId} (agency ${collaborator.agency_id})`);
      return withCors(req, new Response(
        JSON.stringify({ error: 'Access denied to sensitive data' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const hasAccess = isSelf || isAdmin || (isSameAgency && (hasRhOption || isDirigeant));

    if (!hasAccess) {
      console.warn(`[SENSITIVE-DATA] Access denied: user ${user.id} (role=${profile.global_role}, sameAgency=${isSameAgency}, rh=${hasRhOption}) → collaborator ${collaboratorId}`);
      return withCors(req, new Response(
        JSON.stringify({ error: 'Access denied to sensitive data' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // P2: Validate action
    if (action !== 'read' && action !== 'write') {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (action === 'read') {
      // Read and decrypt sensitive data
      const { data: sensitiveData, error } = await supabaseClient
        .from('collaborator_sensitive_data')
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .maybeSingle();

      if (error) throw error;

      if (!sensitiveData) {
        return withCors(req, new Response(
          JSON.stringify({
            birth_date: null,
            social_security_number: null,
            emergency_contact: null,
            emergency_phone: null,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        ));
      }

      // Log access for audit
      await supabaseClient
        .from('collaborator_sensitive_data')
        .update({
          last_accessed_by: user.id,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('collaborator_id', collaboratorId);

      // P2: Structured audit log
      console.log(`[SENSITIVE-DATA] READ by=${user.id} role=${profile.global_role} collaborator=${collaboratorId} agency=${profile.agency_id} isSelf=${isSelf}`);

      // Decrypt all fields
      const decrypted = {
        birth_date: await decrypt(sensitiveData.birth_date_encrypted || ''),
        social_security_number: await decrypt(sensitiveData.social_security_number_encrypted || ''),
        emergency_contact: await decrypt(sensitiveData.emergency_contact_encrypted || ''),
        emergency_phone: await decrypt(sensitiveData.emergency_phone_encrypted || ''),
      };

      return withCors(req, new Response(
        JSON.stringify(decrypted),
        { headers: { 'Content-Type': 'application/json' } }
      ));

    } else if (action === 'write') {
      // D'abord, lire les données existantes pour les fusionner
      const { data: existingData } = await supabaseClient
        .from('collaborator_sensitive_data')
        .select('*')
        .eq('collaborator_id', collaboratorId)
        .maybeSingle();

      // Déchiffrer les données existantes si elles existent
      const existingDecrypted = existingData ? {
        birth_date: await decrypt(existingData.birth_date_encrypted || ''),
        social_security_number: await decrypt(existingData.social_security_number_encrypted || ''),
        emergency_contact: await decrypt(existingData.emergency_contact_encrypted || ''),
        emergency_phone: await decrypt(existingData.emergency_phone_encrypted || ''),
      } : {
        birth_date: '',
        social_security_number: '',
        emergency_contact: '',
        emergency_phone: '',
      };

      // Fusionner les nouvelles données avec les existantes (seuls les champs fournis sont mis à jour)
      const mergedData = {
        birth_date: data.birth_date !== undefined ? data.birth_date : existingDecrypted.birth_date,
        social_security_number: data.social_security_number !== undefined ? data.social_security_number : existingDecrypted.social_security_number,
        emergency_contact: data.emergency_contact !== undefined ? data.emergency_contact : existingDecrypted.emergency_contact,
        emergency_phone: data.emergency_phone !== undefined ? data.emergency_phone : existingDecrypted.emergency_phone,
      };

      // Encrypt and write sensitive data
      const encryptedData = {
        collaborator_id: collaboratorId,
        birth_date_encrypted: mergedData.birth_date ? await encrypt(mergedData.birth_date) : null,
        social_security_number_encrypted: mergedData.social_security_number ? await encrypt(mergedData.social_security_number) : null,
        emergency_contact_encrypted: mergedData.emergency_contact ? await encrypt(mergedData.emergency_contact) : null,
        emergency_phone_encrypted: mergedData.emergency_phone ? await encrypt(mergedData.emergency_phone) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseClient
        .from('collaborator_sensitive_data')
        .upsert(encryptedData, { onConflict: 'collaborator_id' });

      if (error) throw error;

      // P2: Structured audit log
      console.log(`[SENSITIVE-DATA] WRITE by=${user.id} role=${profile.global_role} collaborator=${collaboratorId} agency=${profile.agency_id} fields=${Object.keys(data).join(',')}`);

      return withCors(req, new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Unreachable due to validation above, but defensive
    return withCors(req, new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[SENSITIVE-DATA] Error:', error);
    captureEdgeException(error, { function: 'sensitive-data' });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return withCors(req, new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
