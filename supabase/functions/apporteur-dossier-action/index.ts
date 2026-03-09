/**
 * Edge Function: apporteur-dossier-action
 * Handles apporteur actions on dossiers:
 * - refuser_devis (single or bulk)
 * - facture_reglee (with date + payment type)
 * - dossier_inactif (annuler / relancer / donner_info)
 * All actions send email notifications to the agency.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { authenticateApporteur } from '../_shared/apporteurAuth.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

type ActionType = 'refuser_devis' | 'valider_devis' | 'facture_reglee' | 'dossier_inactif';
type InactifAction = 'annuler' | 'relancer' | 'donner_info';

interface ActionRequest {
  action: ActionType;
  dossierRefs: string[];  // one or more dossier refs
  // For facture_reglee
  dateReglement?: string;
  typeReglement?: string;
  // For dossier_inactif
  inactifAction?: InactifAction;
  message?: string;
}

const ACTION_LABELS: Record<ActionType, string> = {
  refuser_devis: 'Refus de devis',
  facture_reglee: 'Facture déclarée réglée',
  dossier_inactif: 'Action sur dossier inactif',
};

const INACTIF_LABELS: Record<InactifAction, string> = {
  annuler: 'Annuler le dossier',
  relancer: 'Relancer le dossier',
  donner_info: 'Information complémentaire',
};

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    // Authenticate apporteur
    const auth = await authenticateApporteur(req);
    if (!auth) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const body: ActionRequest = await req.json();
    const { action, dossierRefs, dateReglement, typeReglement, inactifAction, message } = body;

    // Validate
    if (!action || !['refuser_devis', 'facture_reglee', 'dossier_inactif'].includes(action)) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Action invalide' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!dossierRefs || !Array.isArray(dossierRefs) || dossierRefs.length === 0) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Au moins une référence dossier requise' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (action === 'facture_reglee' && (!dateReglement || !typeReglement)) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Date et type de règlement requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (action === 'dossier_inactif' && (!inactifAction || !['annuler', 'relancer', 'donner_info'].includes(inactifAction))) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Action inactif invalide' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Get agency email
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: agency } = await supabaseAdmin
      .from('apogee_agencies')
      .select('label, contact_email')
      .eq('id', auth.agencyId)
      .single();

    const agencyEmail = agency?.contact_email;
    const agencyName = agency?.label || 'Agence';

    if (!agencyEmail) {
      console.warn('[apporteur-dossier-action] No agency email for', auth.agencyId);
      return withCors(req, new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Pas d\'email agence configuré' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Build email content
    const refsStr = dossierRefs.join(', ');
    const isBulk = dossierRefs.length > 1;
    let subject = '';
    let detailHtml = '';

    switch (action) {
      case 'refuser_devis':
        subject = isBulk
          ? `[Portail Apporteur] ${auth.apporteurName} — Refus de ${dossierRefs.length} devis`
          : `[Portail Apporteur] ${auth.apporteurName} — Refus devis ${refsStr}`;
        detailHtml = `
          <p>L'apporteur <strong>${auth.apporteurName}</strong> a indiqué le <strong>refus</strong> du/des devis suivant(s) :</p>
          <ul style="color: #dc2626; font-weight: bold;">
            ${dossierRefs.map(r => `<li>${r}</li>`).join('')}
          </ul>
          ${message ? `<p><strong>Commentaire :</strong> ${message}</p>` : ''}
        `;
        break;

      case 'facture_reglee':
        subject = `[Portail Apporteur] ${auth.apporteurName} — Facture réglée ${refsStr}`;
        detailHtml = `
          <p>L'apporteur <strong>${auth.apporteurName}</strong> déclare avoir réglé la/les facture(s) :</p>
          <ul style="font-weight: bold;">
            ${dossierRefs.map(r => `<li>${r}</li>`).join('')}
          </ul>
          <table style="border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">Date de règlement</td>
              <td style="padding: 8px 16px;">${dateReglement}</td>
            </tr>
            <tr>
              <td style="padding: 8px 16px; background: #f3f4f6; font-weight: bold;">Type de règlement</td>
              <td style="padding: 8px 16px;">${typeReglement}</td>
            </tr>
          </table>
          ${message ? `<p><strong>Commentaire :</strong> ${message}</p>` : ''}
        `;
        break;

      case 'dossier_inactif': {
        const actionLabel = INACTIF_LABELS[inactifAction!] || inactifAction;
        subject = `[Portail Apporteur] ${auth.apporteurName} — ${actionLabel} — ${refsStr}`;
        detailHtml = `
          <p>L'apporteur <strong>${auth.apporteurName}</strong> demande une action sur le(s) dossier(s) inactif(s) :</p>
          <ul style="font-weight: bold;">
            ${dossierRefs.map(r => `<li>${r}</li>`).join('')}
          </ul>
          <p><strong>Action demandée :</strong> <span style="color: #0066CC; font-size: 16px;">${actionLabel}</span></p>
          ${message ? `<p><strong>Message :</strong></p><blockquote style="border-left: 3px solid #0066CC; padding-left: 12px; color: #555;">${message}</blockquote>` : ''}
        `;
        break;
      }
    }

    // Send email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <tr><td style="background-color: #0066CC; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${ACTION_LABELS[action]}</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 15px; opacity: 0.9;">${auth.apporteurName}</p>
        </td></tr>
        <tr><td style="padding: 30px;">
          ${detailHtml}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Action effectuée via le Portail Apporteur — ${new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const emailResult = await resend.emails.send({
      from: 'HelpConfort <noreply@helpconfort.services>',
      to: [agencyEmail],
      subject,
      html: emailHtml,
    });

    console.log(`[apporteur-dossier-action] Email sent: action=${action}, refs=${refsStr}, result=`, emailResult);

    // Log the action
    try {
      // Get manager info for logging
      const tokenHash = await sha256(extractToken(req));
      if (tokenHash) {
        const { data: session } = await supabaseAdmin
          .from('apporteur_sessions')
          .select('manager_id')
          .eq('token_hash', tokenHash)
          .maybeSingle();

        if (session?.manager_id) {
          const { data: manager } = await supabaseAdmin
            .from('apporteur_managers')
            .select('id')
            .eq('id', session.manager_id)
            .maybeSingle();

          // We could log to apporteur_access_logs here if needed
        }
      }
    } catch (logErr) {
      console.warn('[apporteur-dossier-action] Logging failed (non-critical):', logErr);
    }

    return withCors(req, new Response(
      JSON.stringify({ success: true, emailSent: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[apporteur-dossier-action] Error:', message);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});

// Helper
async function sha256(message: string | null): Promise<string | null> {
  if (!message) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function extractToken(req: Request): string | null {
  return req.headers.get('x-apporteur-token') ?? req.headers.get('X-Apporteur-Token') ?? null;
}
