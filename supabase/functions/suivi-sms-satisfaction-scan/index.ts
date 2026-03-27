import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');
const GLOBAL_ALLMYSMS_API_KEY = Deno.env.get('ALLMYSMS_API_KEY');
const GLOBAL_ALLMYSMS_LOGIN = Deno.env.get('ALLMYSMS_LOGIN');
const GLOBAL_ALLMYSMS_SENDER = Deno.env.get('ALLMYSMS_SENDER') || 'HelpConfort';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const DELAY_MINUTES = 15;

/**
 * Normalize a French phone number to international format (+33...)
 */
function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  // Remove spaces, dots, dashes
  let cleaned = phone.replace(/[\s.\-()]/g, '');
  // Already international
  if (cleaned.startsWith('+33')) return cleaned;
  if (cleaned.startsWith('0033')) return '+33' + cleaned.slice(4);
  // French local format
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+33' + cleaned.slice(1);
  }
  return null;
}

/**
 * Find the history entry containing "AVIS OK" and return it (with userStr for technician name)
 */
function findAvisOkEntry(history: any[]): any | null {
  if (!Array.isArray(history)) return null;
  return history.find((entry: any) => {
    const content = entry?.data?.content;
    if (typeof content !== 'string') return false;
    return content.toUpperCase().includes('AVIS OK');
  }) || null;
}

/**
 * Extract first name from a "PRENOM NOM" or "NOM PRENOM" string (all caps)
 * e.g. "SEBASTIEN CARON" → "Sebastien"
 */
/**
 * Extract "Tél. favoris" from client generiquesDFields
 */
function extractTelFavoris(client: any): string | null {
  const fields = client.generiquesDFields || client.data?.generiquesDFields;
  if (!Array.isArray(fields)) return null;
  const telField = fields.find((f: any) =>
    f.freeFieldLabel?.toLowerCase().includes('favoris')
  );
  return telField?.value || null;
}

function extractFirstName(userStr: string): string {
  if (!userStr) return '';
  const parts = userStr.trim().split(/\s+/);
  if (parts.length === 0) return '';
  // Capitalize: first letter upper, rest lower
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return capitalize(parts[0]);
}

/**
 * Fetch data from Apogée API
 */
async function fetchFromApogee(apiSubdomain: string, endpoint: string): Promise<any> {
  const url = `https://${apiSubdomain}.hc-apogee.fr/api/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ API_KEY: APOGEE_API_KEY }),
  });

  if (!response.ok) {
    console.error(`Apogée API error for ${endpoint}:`, response.status);
    return [];
  }

  const text = await response.text();
  if (!text || text.trim() === '') return [];

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`Apogée API JSON parse error for ${endpoint}:`, e);
    return [];
  }
}

/**
 * Send SMS via AllMySMS API
 */
async function sendSms(
  phone: string,
  message: string,
  credentials: { apiKey: string; login: string; sender: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const authToken = btoa(`${credentials.login}:${credentials.apiKey}`);
    const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone;

    const response = await fetch('https://api.allmysms.com/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authToken}`,
        'cache-control': 'no-cache',
      },
      body: JSON.stringify({
        from: credentials.sender,
        to: cleanPhone,
        text: message,
      }),
    });

    const result = await response.json();
    console.log(`AllMySMS response for ${cleanPhone}:`, JSON.stringify(result));

    if (result.code && result.code >= 100 && result.code < 200) {
      return { success: true };
    }
    return { success: false, error: result.description || `Code ${result.code}` };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`AllMySMS send error:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Build satisfaction email HTML
 */
function buildSatisfactionEmailHtml(params: {
  clientPrenom: string;
  technicienPrenom: string;
  agencyName: string;
  googleReviewsUrl: string;
}): string {
  const { clientPrenom, technicienPrenom, agencyName, googleReviewsUrl } = params;
  const greeting = clientPrenom ? `Bonjour ${clientPrenom},` : 'Bonjour,';
  const techLine = technicienPrenom
    ? `Suite à l'intervention réalisée récemment par <strong>${technicienPrenom}</strong>, nous espérons que tout s'est parfaitement déroulé et que la prestation a été à la hauteur de vos attentes.`
    : `Suite à notre récente intervention, nous espérons que tout s'est parfaitement déroulé et que la prestation a été à la hauteur de vos attentes.`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background-color:#007ab8;padding:30px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">HELP Confort</h1>
          <p style="color:#d1ecf9;margin:8px 0 0;font-size:14px;">${agencyName}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="font-size:16px;color:#1f2937;margin:0 0 20px;">${greeting}</p>
          <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">${techLine}</p>
          <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Votre retour est précieux : il nous permet d'améliorer en continu la qualité de nos interventions et d'accompagner au mieux nos équipes sur le terrain.</p>
          <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">Si vous avez quelques secondes, nous vous serions reconnaissants de partager votre expérience :</p>
          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 28px;">
            <a href="${googleReviewsUrl}" target="_blank" style="display:inline-block;background-color:#007ab8;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">
              ⭐ Laisser un avis — En 10 secondes
            </a>
          </td></tr></table>
          <p style="font-size:14px;color:#6b7280;margin:0 0 8px;">Merci pour votre confiance.</p>
          <p style="font-size:15px;color:#1f2937;font-weight:600;margin:0;">L'équipe ${agencyName}</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">Cet email a été envoyé automatiquement suite à votre intervention.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send satisfaction email via Resend
 */
async function sendSatisfactionEmail(
  to: string,
  params: { clientPrenom: string; technicienPrenom: string; agencyName: string; googleReviewsUrl: string }
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'No RESEND_API_KEY configured' };
  }
  try {
    const html = buildSatisfactionEmailHtml(params);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Suivi ${params.agencyName} <noreply@helpconfort.services>`,
        to: [to],
        subject: `Votre avis compte${params.clientPrenom ? ', ' + params.clientPrenom : ''} !`,
        html,
      }),
    });

    const result = await response.json();
    console.log(`Resend response for ${to}:`, JSON.stringify(result));

    if (response.ok && result.id) {
      return { success: true };
    }
    return { success: false, error: result.message || `HTTP ${response.status}` };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error(`Resend send error:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify this is called by cron (via Authorization header with anon key) or internal
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get all active agencies
    const { data: agencies, error: agencyError } = await supabase
      .from('agencies')
      .select('slug, api_subdomain, name, google_reviews_url, allmysms_api_key, allmysms_login, allmysms_sender')
      .eq('is_active', true);

    if (agencyError || !agencies) {
      console.error('Error fetching agencies:', agencyError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch agencies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`SMS Scan: Processing ${agencies.length} agencies`);

    let totalSent = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const agency of agencies) {
      console.log(`SMS Scan: Processing agency "${agency.name}" (${agency.api_subdomain})`);

      // 2. Fetch all projects from Apogée
      const projects = await fetchFromApogee(agency.api_subdomain, 'apiGetProjects');
      if (!Array.isArray(projects) || projects.length === 0) {
        console.log(`SMS Scan: No projects for agency "${agency.name}"`);
        continue;
      }

      // 3. Filter projects that have "AVIS OK" in history AND eligible state
      const ELIGIBLE_STATES = ['to_be_invoiced', 'invoiced', 'done'];
      const avisOkProjects: { project: any; avisEntry: any }[] = [];
      let tooRecentCount = 0;
      for (const p of projects) {
        const entry = findAvisOkEntry(p.data?.history);
        if (!entry) continue;
        const state = p.state || p.data?.state;
        if (!ELIGIBLE_STATES.includes(state)) {
          console.log(`SMS Scan: Project ${p.ref} has "AVIS OK" but state="${state}", skipping`);
          continue;
        }

        // Check delay: skip if "AVIS OK" was set less than 15 minutes ago
        const avisDateRaw = entry?.data?.date || entry?.date || entry?.data?.createdAt;
        const avisDate = avisDateRaw ? new Date(avisDateRaw) : null;
        if (avisDate && !isNaN(avisDate.getTime())) {
          const diffMinutes = (Date.now() - avisDate.getTime()) / (1000 * 60);
          console.log(`SMS Scan: Project ${p.ref} "AVIS OK" timestamp=${avisDateRaw}, ${Math.round(diffMinutes)}min ago`);
          if (diffMinutes < DELAY_MINUTES) {
            console.log(`SMS Scan: Project ${p.ref} "AVIS OK" only ${Math.round(diffMinutes)}min ago, waiting`);
            tooRecentCount++;
            continue;
          }
        } else {
          console.log(`SMS Scan: Project ${p.ref} "AVIS OK" no valid timestamp (raw=${avisDateRaw}), processing immediately`);
        }

        avisOkProjects.push({ project: p, avisEntry: entry });
      }
      if (tooRecentCount > 0) {
        console.log(`SMS Scan: ${tooRecentCount} projects too recent (< ${DELAY_MINUTES}min), will retry later`);
      }
      if (avisOkProjects.length === 0) {
        console.log(`SMS Scan: No eligible "AVIS OK" projects for agency "${agency.name}"`);
        continue;
      }

      console.log(`SMS Scan: Found ${avisOkProjects.length} eligible projects for "${agency.name}"`);

      // 4. Get refs to check against sms_sent_log (SMS and email separately)
      const refs = avisOkProjects.map((item) => item.project.ref);
      const { data: alreadySentSms } = await supabase
        .from('sms_sent_log')
        .select('ref_dossier')
        .in('ref_dossier', refs)
        .eq('trigger_type', 'avis_ok');

      const { data: alreadySentEmail } = await supabase
        .from('sms_sent_log')
        .select('ref_dossier')
        .in('ref_dossier', refs)
        .eq('trigger_type', 'avis_ok_email');

      const sentSmsRefs = new Set((alreadySentSms || []).map((r: any) => r.ref_dossier));
      const sentEmailRefs = new Set((alreadySentEmail || []).map((r: any) => r.ref_dossier));
      const newProjects = avisOkProjects.filter((item) =>
        !sentSmsRefs.has(item.project.ref) || !sentEmailRefs.has(item.project.ref)
      );

      if (newProjects.length === 0) {
        console.log(`SMS Scan: All "AVIS OK" for "${agency.name}" already processed`);
        totalSkipped += avisOkProjects.length;
        continue;
      }

      console.log(`SMS Scan: ${newProjects.length} new "AVIS OK" to process for "${agency.name}"`);

      // 5. Fetch clients to get phone numbers and emails
      const clients = await fetchFromApogee(agency.api_subdomain, 'apiGetClients');
      const clientsMap = new Map<number, any>();
      if (Array.isArray(clients)) {
        clients.forEach((c: any) => clientsMap.set(c.id, c));
      }

      // 6. Send SMS + email for each new project
      for (const { project, avisEntry } of newProjects) {
        const clientId = project.data?.clientId || project.clientId;
        const projectRef = project.ref;
        const client = clientsMap.get(clientId);

        if (!client) {
          console.warn(`SMS Scan: No client found for project ${project.ref} (clientId=${clientId})`);
          totalErrors++;
          continue;
        }

        // Extract common data
        const technicienPrenom = extractFirstName(avisEntry?.data?.userStr || avisEntry?.userStr || '');
        const prenom = client.prenom || '';
        const googleUrl = agency.google_reviews_url || '';

        // --- SMS ---
        if (!sentSmsRefs.has(project.ref)) {
          const rawPhone = client.tel2 || client.data?.tel2
            || extractTelFavoris(client)
            || client.tel || client.data?.tel;
          const phone = normalizePhone(rawPhone);

          if (!phone) {
            console.warn(`SMS Scan: No valid phone for project ${project.ref}, raw="${rawPhone}"`);
            await supabase.from('sms_sent_log').insert({
              ref_dossier: project.ref,
              agency_slug: agency.slug,
              trigger_type: 'avis_ok',
              phone_number: rawPhone || 'unknown',
              status: 'no_phone',
              error_message: 'No valid phone number found',
            });
            totalErrors++;
          } else {
            let message = `Merci${prenom ? ' ' + prenom : ''} !`;
            if (technicienPrenom) {
              message += ` ${technicienPrenom} espere que tout est OK.`;
            }
            if (googleUrl) {
              message += ` Un avis Google nous aiderait : ${googleUrl}.`;
            }
            message += ` L'equipe ${agency.name}`;

            const smsCredentials = {
              apiKey: agency.allmysms_api_key || GLOBAL_ALLMYSMS_API_KEY || '',
              login: agency.allmysms_login || GLOBAL_ALLMYSMS_LOGIN || '',
              sender: agency.allmysms_sender || GLOBAL_ALLMYSMS_SENDER,
            };

            if (!smsCredentials.apiKey || !smsCredentials.login) {
              console.warn(`SMS Scan: No AllMySMS credentials for agency "${agency.name}", skipping SMS`);
              await supabase.from('sms_sent_log').insert({
                ref_dossier: project.ref,
                agency_slug: agency.slug,
                trigger_type: 'avis_ok',
                phone_number: phone,
                status: 'error',
                error_message: 'No AllMySMS credentials configured',
              });
              totalErrors++;
            } else {
              const result = await sendSms(phone, message, smsCredentials);
              await supabase.from('sms_sent_log').insert({
                ref_dossier: project.ref,
                agency_slug: agency.slug,
                trigger_type: 'avis_ok',
                phone_number: phone,
                status: result.success ? 'sent' : 'error',
                error_message: result.error || null,
              });
              if (result.success) {
                console.log(`SMS Scan: SMS sent to ${phone} for project ${project.ref}`);
                totalSent++;
              } else {
                console.error(`SMS Scan: Failed to send SMS for ${project.ref}: ${result.error}`);
                totalErrors++;
              }
            }
          }
        }

        // --- EMAIL ---
        if (!sentEmailRefs.has(project.ref)) {
          const clientEmail = client.email || client.data?.email || '';
          if (clientEmail && clientEmail.includes('@') && googleUrl) {
            console.log(`SMS Scan: Sending satisfaction email to ${clientEmail} for project ${project.ref}`);
            const emailResult = await sendSatisfactionEmail(clientEmail, {
              clientPrenom: prenom,
              technicienPrenom,
              agencyName: agency.name,
              googleReviewsUrl: googleUrl,
            });
            await supabase.from('sms_sent_log').insert({
              ref_dossier: project.ref,
              agency_slug: agency.slug,
              trigger_type: 'avis_ok_email',
              phone_number: clientEmail,
              status: emailResult.success ? 'sent' : 'error',
              error_message: emailResult.error || null,
            });
            if (emailResult.success) {
              console.log(`SMS Scan: Email sent to ${clientEmail} for project ${project.ref}`);
              totalSent++;
            } else {
              console.error(`SMS Scan: Failed to send email for ${project.ref}: ${emailResult.error}`);
              totalErrors++;
            }
          } else {
            console.log(`SMS Scan: No email or no Google URL for project ${project.ref}, skipping email`);
            await supabase.from('sms_sent_log').insert({
              ref_dossier: project.ref,
              agency_slug: agency.slug,
              trigger_type: 'avis_ok_email',
              phone_number: clientEmail || 'no_email',
              status: 'no_email',
              error_message: clientEmail ? 'No Google Reviews URL configured' : 'No client email found',
            });
          }
        }
      }
    }

    const summary = { totalSent, totalSkipped, totalErrors, timestamp: new Date().toISOString() };
    console.log('SMS Scan complete:', JSON.stringify(summary));

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SMS Scan error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
