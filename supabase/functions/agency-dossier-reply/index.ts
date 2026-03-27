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
  // N3+ (platform admins, superadmins, network_admin) → toujours
  const superRoles = ['platform_admin', 'superadmin', 'network_admin'];
  if (globalRole && superRoles.includes(globalRole)) return true;

  // N2 (franchisee_admin) → toujours
  if (globalRole === 'franchisee_admin') return true;

  // N1 (franchisee_user / user / agency_user)
  const isAgencyUser =
    globalRole === 'franchisee_user' ||
    globalRole === 'user' ||
    globalRole === 'agency_user';
  if (isAgencyUser) {
    const poste = (roleAgence ?? '').toLowerCase();
    return (
      poste.includes('dirigeant') ||
      poste.includes('administratif') ||
      poste.includes('assistante') ||
      poste.includes('secretaire')
    );
  }
  return false;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type EmailSource = 'manager_id' | 'apporteur_user_fallback' | 'apporteur_manager_fallback' | 'apporteur_name_fallback' | 'previous_exchange_fallback' | 'not_found';

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
      let emailSource: EmailSource = 'not_found';

      // PRIORITÉ 1 : sender_email historisé dans le dernier message apporteur du thread
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
        emailSource = 'previous_exchange_fallback';
      }

      // PRIORITÉ 2 : manager_id stocké dans metadata du dernier message apporteur
      if (!apporteurEmail) {
        const { data: prevMetaExchange } = await supabaseAdmin
          .from('dossier_exchanges')
          .select('metadata, sender_name')
          .eq('agency_id', profile.agency_id)
          .eq('dossier_ref', dossierRef)
          .eq('sender_type', 'apporteur')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const managerId = (prevMetaExchange?.metadata as Record<string, unknown>)?.manager_id as string | undefined;
        if (managerId) {
          const { data: manager } = await supabaseAdmin
            .from('apporteur_managers')
            .select('email, first_name, last_name')
            .eq('id', managerId)
            .eq('is_active', true)
            .maybeSingle();

          if (manager?.email) {
            apporteurEmail = manager.email;
            apporteurName = [manager.first_name, manager.last_name].filter(Boolean).join(' ') || prevMetaExchange?.sender_name || null;
            emailSource = 'manager_id';
          }
        }
      }

      // PRIORITÉ 3 : dossier_ref → apporteur_intervention_requests → apporteur_manager_id → email
      if (!apporteurEmail) {
        const { data: request } = await supabaseAdmin
          .from('apporteur_intervention_requests')
          .select('apporteur_manager_id, apporteur_id, tenant_name')
          .eq('agency_id', profile.agency_id)
          .eq('reference', dossierRef)
          .maybeSingle();

        if (request?.apporteur_manager_id) {
          const { data: manager } = await supabaseAdmin
            .from('apporteur_managers')
            .select('email, first_name, last_name')
            .eq('id', request.apporteur_manager_id)
            .eq('is_active', true)
            .maybeSingle();

          if (manager?.email) {
            apporteurEmail = manager.email;
            apporteurName = [manager.first_name, manager.last_name].filter(Boolean).join(' ') || null;
            emailSource = 'manager_id';
          }
        }

        // Fallback : apporteur_users
        if (!apporteurEmail && request?.apporteur_id) {
          const { data: appUsers } = await supabaseAdmin
            .from('apporteur_users')
            .select('email, first_name, last_name')
            .eq('apporteur_id', request.apporteur_id)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1);

          if (appUsers?.length && appUsers[0].email) {
            apporteurEmail = appUsers[0].email;
            apporteurName = [appUsers[0].first_name, appUsers[0].last_name].filter(Boolean).join(' ') || null;
            emailSource = 'apporteur_user_fallback';
          }
        }

        // Fallback : premier manager actif
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
            emailSource = 'apporteur_manager_fallback';
          }
        }
      }

      // PRIORITÉ 4 : retrouver l'apporteur par son nom dans le thread
      if (!apporteurEmail) {
        const { data: prevApporteurMessage } = await supabaseAdmin
          .from('dossier_exchanges')
          .select('sender_name')
          .eq('agency_id', profile.agency_id)
          .eq('dossier_ref', dossierRef)
          .eq('sender_type', 'apporteur')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevApporteurMessage?.sender_name) {
          const { data: apporteur } = await supabaseAdmin
            .from('apporteurs')
            .select('id')
            .eq('agency_id', profile.agency_id)
            .eq('name', prevApporteurMessage.sender_name)
            .maybeSingle();

          if (apporteur?.id) {
            const { data: managers } = await supabaseAdmin
              .from('apporteur_managers')
              .select('email, first_name, last_name')
              .eq('apporteur_id', apporteur.id)
              .eq('is_active', true)
              .order('created_at', { ascending: true })
              .limit(1);

            if (managers?.length && managers[0].email) {
              apporteurEmail = managers[0].email;
              apporteurName = [managers[0].first_name, managers[0].last_name].filter(Boolean).join(' ') || prevApporteurMessage.sender_name;
              emailSource = 'apporteur_name_fallback';
            }
          }
        }
      }

      // 5. Envoi email via Resend
      if (!apporteurEmail) {
        emailWarning = 'Email apporteur introuvable pour ce dossier';
        console.warn('[agency-dossier-reply] Email not found', {
          dossierRef,
          agencyId: profile.agency_id,
          source: emailSource,
        });
      } else {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
          emailWarning = 'RESEND_API_KEY non configurée';
          console.warn('[agency-dossier-reply]', emailWarning);
        } else {
          // Get agency label + client name
          const { data: agency } = await supabaseAdmin
            .from('apogee_agencies')
            .select('label')
            .eq('id', profile.agency_id)
            .maybeSingle();

          // Get client name from intervention request
          const { data: irData } = await supabaseAdmin
            .from('apporteur_intervention_requests')
            .select('tenant_name')
            .eq('agency_id', profile.agency_id)
            .eq('reference', dossierRef)
            .maybeSingle();
          const clientName = irData?.tenant_name || null;

          const agencyLabel = agency?.label ?? 'HelpConfort';
          const displaySender = senderName;
          const greeting = apporteurName ? `Bonjour ${escapeHtml(apporteurName)},` : 'Bonjour,';
          const escapedMessage = escapeHtml(message.trim()).replace(/\n/g, '<br/>');
          const dossierLabel = clientName
            ? `dossier <strong>"${escapeHtml(clientName)}"</strong> (réf. #${escapeHtml(dossierRef)})`
            : `dossier <strong>#${escapeHtml(dossierRef)}</strong>`;

          const emailBody = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
  <tr><td style="background:#2563eb;padding:24px 32px;">
    <h1 style="color:#ffffff;font-size:18px;margin:0;">Nouveau message de ${escapeHtml(agencyLabel)}</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
      <strong>${escapeHtml(displaySender)}</strong> vous a envoyé un message concernant le ${dossierLabel} :
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr><td style="background:#f3f4f6;border-left:4px solid #2563eb;padding:16px;border-radius:4px;">
      <p style="color:#1f2937;font-size:14px;line-height:1.6;margin:0;">${escapedMessage}</p>
    </td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:24px 0 0;">
      Connectez-vous à votre espace apporteur pour consulter et répondre à ce message.
    </p>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;"/>
    <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
      Ce message a été envoyé automatiquement par ${escapeHtml(agencyLabel)}. Merci de ne pas répondre directement à cet email.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

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
            console.log('[agency-dossier-reply] Email sent', {
              dossierRef,
              agencyId: profile.agency_id,
              recipient: apporteurEmail,
              source: emailSource,
            });
          }
        }
      }
    } catch (emailError) {
      emailWarning = emailError instanceof Error ? emailError.message : 'Erreur inconnue email';
      console.warn('[agency-dossier-reply] Email notification error (non-blocking):', emailError);
    }

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
