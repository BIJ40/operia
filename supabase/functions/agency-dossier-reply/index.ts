/**
 * Edge Function: agency-dossier-reply
 * Permet à un utilisateur OPERIA (agence) de répondre dans le fil d'échanges d'un dossier apporteur.
 * 
 * Ordre : auth JWT → contrôle droit de réponse → insertion dossier_exchanges → lookup email → envoi Resend
 * L'envoi email est non-bloquant : si l'insertion réussit, on retourne succès même si l'email échoue.
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

    // 1. Auth JWT
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

    // 2. Get profile & check authorization
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

    // Build sender identity
    const firstName = profile.first_name ?? '';
    const lastName = profile.last_name ?? '';
    const senderName = `${firstName} ${lastName}`.trim() || 'Agence';
    const roleLabel = profile.role_agence ?? '';

    // 3. Insert exchange (source de vérité)
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

    // 4. Lookup apporteur email (non-bloquant à partir d'ici)
    let emailWarning: string | null = null;

    try {
      let apporteurEmail: string | null = null;
      let apporteurName: string | null = null;

      // Chemin principal : dossier_ref → apporteur_intervention_requests → apporteur_manager_id → email
      const { data: request } = await supabaseAdmin
        .from('apporteur_intervention_requests')
        .select('apporteur_manager_id, apporteur_id, tenant_name')
        .eq('agency_id', profile.agency_id)
        .eq('reference', dossierRef)
        .maybeSingle();

      if (request?.apporteur_manager_id) {
        // Lookup direct via manager_id
        const { data: manager } = await supabaseAdmin
          .from('apporteur_managers')
          .select('email, first_name, last_name')
          .eq('id', request.apporteur_manager_id)
          .eq('is_active', true)
          .maybeSingle();

        if (manager?.email) {
          apporteurEmail = manager.email;
          apporteurName = [manager.first_name, manager.last_name].filter(Boolean).join(' ') || null;
        }
      }

      // Fallback : si pas de manager_id, chercher un manager actif lié à l'apporteur_id
      if (!apporteurEmail && request?.apporteur_id) {
        const { data: managers } = await supabaseAdmin
          .from('apporteur_managers')
          .select('email, first_name, last_name')
          .eq('apporteur_id', request.apporteur_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1);

        if (managers?.length && managers[0].email) {
          apporteurEmail = managers[0].email;
          apporteurName = [managers[0].first_name, managers[0].last_name].filter(Boolean).join(' ') || null;
        }
      }

      // Fallback ultime : chercher le sender_email dans les échanges précédents de l'apporteur
      if (!apporteurEmail) {
        const { data: prevExchange } = await supabaseAdmin
          .from('dossier_exchanges')
          .select('sender_email, sender_name')
          .eq('agency_id', profile.agency_id)
          .eq('dossier_ref', dossierRef)
          .eq('sender_type', 'apporteur')
          .not('sender_email', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevExchange?.sender_email) {
          apporteurEmail = prevExchange.sender_email;
          apporteurName = prevExchange.sender_name;
        }
      }

      // 5. Envoi email via Resend
      if (!apporteurEmail) {
        emailWarning = 'Email apporteur introuvable pour ce dossier';
        console.warn(`[agency-dossier-reply] ${emailWarning}:`, dossierRef);
      } else {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
          emailWarning = 'RESEND_API_KEY non configurée';
          console.warn('[agency-dossier-reply]', emailWarning);
        } else {
          // Get agency label
          const { data: agency } = await supabaseAdmin
            .from('apogee_agencies')
            .select('label')
            .eq('id', profile.agency_id)
            .single();

          const agencyLabel = agency?.label ?? 'HelpConfort';
          const displaySender = roleLabel ? `${senderName} (${roleLabel})` : senderName;
          const greeting = apporteurName ? `Bonjour ${apporteurName},` : 'Bonjour,';

          const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333; margin-bottom: 16px;">Nouveau message de ${agencyLabel}</h2>
  <p style="color: #555;">${greeting}</p>
  <p style="color: #555; margin-bottom: 8px;">
    <strong>${displaySender}</strong> vous a envoyé un message concernant le dossier <strong>#${dossierRef}</strong> :
  </p>
  <div style="background: #f5f5f5; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 4px;">
    <p style="color: #333; margin: 0; white-space: pre-wrap;">${message.trim()}</p>
  </div>
  <p style="color: #555; margin-top: 24px;">
    Connectez-vous à votre espace apporteur pour consulter et répondre à ce message.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px;">
    Ce message a été envoyé automatiquement par ${agencyLabel}. Merci de ne pas répondre directement à cet email.
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
            emailWarning = `Erreur envoi email: ${resendError}`;
            console.warn('[agency-dossier-reply] Resend error (non-blocking):', resendError);
          } else {
            console.log('[agency-dossier-reply] Email envoyé à:', apporteurEmail);
          }
        }
      }
    } catch (emailError) {
      emailWarning = emailError instanceof Error ? emailError.message : 'Erreur inconnue email';
      console.warn('[agency-dossier-reply] Email notification error (non-blocking):', emailError);
    }

    // Retour : succès (message inséré), avec warning éventuel sur l'email
    return withCors(req, new Response(
      JSON.stringify({
        success: true,
        ...(emailWarning ? { warning: emailWarning } : {}),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[agency-dossier-reply] Error:', msg);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
