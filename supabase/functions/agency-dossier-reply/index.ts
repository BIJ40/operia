/**
 * Edge Function: agency-dossier-reply
 * Permet à un utilisateur OPERIA (agence) de répondre dans le fil d'échanges d'un dossier apporteur.
 * 
 * Vérification serveur : seuls les N2 (franchisee_admin) et les N1 assistantes/secrétaires peuvent répondre.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

function canReplyToApporteur(
  globalRole: string | null,
  roleAgence: string | null
): boolean {
  if (globalRole === 'franchisee_admin') return true;
  const isAgencyUser =
    globalRole === 'franchisee_user' ||
    globalRole === 'user' ||
    globalRole === 'agency_user';
  if (isAgencyUser) {
    const poste = roleAgence?.toLowerCase() ?? '';
    return poste.includes('assistante') || poste.includes('secretaire');
  }
  return false;
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Authenticate via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Get profile
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('global_role, role_agence, first_name, last_name, agency_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[agency-dossier-reply] Profile error:', profileError?.message);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Profil introuvable' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Server-side authorization check
    if (!canReplyToApporteur(profile.global_role, profile.role_agence)) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé à répondre aux apporteurs' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!profile.agency_id) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Aucune agence associée' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Parse request body
    const { dossierRef, message } = await req.json();
    if (!dossierRef || !message?.trim()) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'dossierRef et message requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Build sender name with role label
    const firstName = profile.first_name ?? '';
    const lastName = profile.last_name ?? '';
    const senderName = `${firstName} ${lastName}`.trim() || 'Agence';
    const roleLabel = profile.role_agence ?? '';

    // Insert exchange
    const { error: insertError } = await supabaseAdmin
      .from('dossier_exchanges')
      .insert({
        agency_id: profile.agency_id,
        dossier_ref: dossierRef,
        sender_type: 'agence',
        sender_name: senderName,
        action_type: 'message',
        message: message.trim(),
        metadata: { role_label: roleLabel, user_id: user.id },
      });

    if (insertError) {
      console.error('[agency-dossier-reply] Insert error:', insertError.message);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // TODO V2: Send email notification to apporteur via Resend
    // Requires RESEND_API_KEY secret + apporteur email lookup

    return withCors(req, new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[agency-dossier-reply] Error:', message);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
