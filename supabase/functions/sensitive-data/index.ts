import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, collaboratorId, data } = await req.json();

    // Verify user has access to this collaborator's data
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('agency_id, global_role, enabled_modules')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check access permissions
    const { data: collaborator } = await supabaseClient
      .from('collaborators')
      .select('agency_id, user_id')
      .eq('id', collaboratorId)
      .single();

    if (!collaborator) {
      return new Response(
        JSON.stringify({ error: 'Collaborator not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Access check: user is the collaborator, or is admin/RH of same agency
    const isSelf = collaborator.user_id === user.id;
    const isSameAgency = collaborator.agency_id === profile.agency_id;
    const isAdmin = ['platform_admin', 'superadmin'].includes(profile.global_role);
    const isRHAdmin = profile.enabled_modules?.rh?.options?.rh_admin === true;
    const isDirigeant = ['franchisee_admin', 'franchisor_admin', 'franchisor_user'].includes(profile.global_role);

    const hasAccess = isSelf || isAdmin || (isSameAgency && (isRHAdmin || isDirigeant));

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied to sensitive data' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        return new Response(
          JSON.stringify({
            birth_date: null,
            social_security_number: null,
            emergency_contact: null,
            emergency_phone: null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log access
      await supabaseClient
        .from('collaborator_sensitive_data')
        .update({
          last_accessed_by: user.id,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('collaborator_id', collaboratorId);

      // Decrypt all fields
      const decrypted = {
        birth_date: await decrypt(sensitiveData.birth_date_encrypted || ''),
        social_security_number: await decrypt(sensitiveData.social_security_number_encrypted || ''),
        emergency_contact: await decrypt(sensitiveData.emergency_contact_encrypted || ''),
        emergency_phone: await decrypt(sensitiveData.emergency_phone_encrypted || ''),
      };

      return new Response(
        JSON.stringify(decrypted),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'write') {
      // Encrypt and write sensitive data
      const encryptedData = {
        collaborator_id: collaboratorId,
        birth_date_encrypted: data.birth_date ? await encrypt(data.birth_date) : null,
        social_security_number_encrypted: data.social_security_number ? await encrypt(data.social_security_number) : null,
        emergency_contact_encrypted: data.emergency_contact ? await encrypt(data.emergency_contact) : null,
        emergency_phone_encrypted: data.emergency_phone ? await encrypt(data.emergency_phone) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseClient
        .from('collaborator_sensitive_data')
        .upsert(encryptedData, { onConflict: 'collaborator_id' });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in sensitive-data function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
