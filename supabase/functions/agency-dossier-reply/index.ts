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

    // Send email notification to apporteur
    try {
      // Find apporteur email via dossier_ref → apporteur link
      const { data: exchangeData } = await supabaseAdmin
        .from('dossier_exchanges')
        .select('metadata')
        .eq('agency_id', profile.agency_id)
        .eq('dossier_ref', dossierRef)
        .eq('sender_type', 'apporteur')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Try to find apporteur email from apporteur_managers → apporteurs
      const { data: apporteurData } = await supabaseAdmin
        .from('apporteurs')
        .select('email, name')
        .eq('agency_id', profile.agency_id)
        .limit(100);

      // Get agency label for email
      const { data: agency } = await supabaseAdmin
        .from('apogee_agencies')
        .select('label, contact_email')
        .eq('id', profile.agency_id)
        .single();

      const agencyLabel = agency?.label ?? 'l\'agence';

      // Find apporteur linked to this dossier via apporteur_managers
      const { data: managers } = await supabaseAdmin
        .from('apporteur_managers')
        .select('apporteur_id, apporteurs:apporteur_id(email, name)')
        .eq('agency_id', profile.agency_id)
        .eq('is_active', true);

      // Look for apporteur who has exchanges on this dossier
      let apporteurEmail: string | null = null;
      let apporteurName: string | null = null;

      if (exchangeData?.metadata && typeof exchangeData.metadata === 'object') {
        const meta = exchangeData.metadata as Record<string, unknown>;
        if (meta.apporteur_email && typeof meta.apporteur_email === 'string') {
          apporteurEmail = meta.apporteur_email;
        }
      }

      // Fallback: search in dossier_exchanges for the apporteur sender
      if (!apporteurEmail) {
        const { data: apporteurExchange } = await supabaseAdmin
          .from('dossier_exchanges')
          .select('sender_name, metadata')
          .eq('agency_id', profile.agency_id)
          .eq('dossier_ref', dossierRef)
          .eq('sender_type', 'apporteur')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (apporteurExchange) {
          apporteurName = apporteurExchange.sender_name;
          // Try to find matching apporteur by name
          if (managers?.length) {
            for (const m of managers) {
              const ap = m.apporteurs as unknown as { email: string | null; name: string } | null;
              if (ap?.name === apporteurName && ap?.email) {
                apporteurEmail = ap.email;
                break;
              }
            }
          }
        }
      }

      if (apporteurEmail) {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          const displaySender = roleLabel
            ? `${senderName} (${roleLabel})`
            : senderName;

          const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333; margin-bottom: 16px;">Nouveau message de ${agencyLabel}</h2>
  <p style="color: #555; margin-bottom: 8px;">
    <strong>${displaySender}</strong> vous a envoyé un message concernant le dossier <strong>#${dossierRef}</strong> :
  </p>
  <div style="background: #f5f5f5; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 4px;">
    <p style="color: #333; margin: 0; white-space: pre-wrap;">${message.trim()}</p>
  </div>
  <p style="color: #888; font-size: 13px; margin-top: 24px;">
    Connectez-vous à votre espace apporteur pour répondre.
  </p>
</div>`;

          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${agencyLabel} <noreply@helpconfort.services>`,
              to: [apporteurEmail],
              subject: `[Dossier #${dossierRef}] Nouveau message de ${agencyLabel}`,
              html: emailBody,
            }),
          });

          if (!resendResponse.ok) {
            const resendError = await resendResponse.text();
            console.warn('[agency-dossier-reply] Resend error (non-blocking):', resendError);
          } else {
            console.log('[agency-dossier-reply] Email sent to apporteur:', apporteurEmail);
          }
        } else {
          console.warn('[agency-dossier-reply] RESEND_API_KEY not configured, skipping email');
        }
      } else {
        console.warn('[agency-dossier-reply] Could not find apporteur email for dossier:', dossierRef);
      }
    } catch (emailError) {
      // Non-blocking: log but don't fail the response
      console.warn('[agency-dossier-reply] Email notification error (non-blocking):', emailError);
    }

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
