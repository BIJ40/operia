import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default fallback values (Dax)
const DAX_DEFAULTS = {
  contact_email: "dax@helpconfort.com",
  name: "HelpConfort Dax",
  api_subdomain: "dax"
};

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface EmpechementRequest {
  refDossier: string;
  clientFirstName: string;
  clientLastName: string;
  appointmentDate: string;
  motif: string;
  agencySlug?: string;
  codePostal: string;
}

// HTML sanitization to prevent XSS
function sanitizeForHtml(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

async function getAgencyInfo(agencySlug: string | undefined): Promise<{ email: string; name: string; apiSubdomain: string }> {
  if (!agencySlug) {
    return { email: DAX_DEFAULTS.contact_email, name: DAX_DEFAULTS.name, apiSubdomain: DAX_DEFAULTS.api_subdomain };
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return { email: DAX_DEFAULTS.contact_email, name: DAX_DEFAULTS.name, apiSubdomain: DAX_DEFAULTS.api_subdomain };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from("agencies")
      .select("contact_email, name, api_subdomain")
      .eq("slug", agencySlug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return { email: DAX_DEFAULTS.contact_email, name: DAX_DEFAULTS.name, apiSubdomain: DAX_DEFAULTS.api_subdomain };
    }

    return { email: data.contact_email, name: data.name, apiSubdomain: data.api_subdomain };
  } catch (err) {
    console.error("Error fetching agency:", err);
    return { email: DAX_DEFAULTS.contact_email, name: DAX_DEFAULTS.name, apiSubdomain: DAX_DEFAULTS.api_subdomain };
  }
}

async function checkRateLimit(supabase: any, ipAddress: string, refDossier: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const cutoffTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('rate_limit_attempts')
    .select('id')
    .eq('ip_address', ipAddress)
    .eq('ref_dossier', refDossier)
    .eq('success', false)
    .gte('attempted_at', cutoffTime);

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const failedAttempts = data?.length || 0;
  const allowed = failedAttempts < MAX_ATTEMPTS;
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - failedAttempts);

  return { allowed, remainingAttempts };
}

async function recordAttempt(supabase: any, ipAddress: string, refDossier: string, success: boolean): Promise<void> {
  await supabase
    .from('rate_limit_attempts')
    .insert({
      ip_address: ipAddress,
      ref_dossier: refDossier,
      success,
    });
}

// Verify postal code against Apogée data
async function verifyPostalCode(apiSubdomain: string, refDossier: string, codePostal: string): Promise<boolean> {
  try {
    // Fetch project
    const projectResponse = await fetch(`https://${apiSubdomain}.hc-apogee.fr/api/apiGetProjectByRef`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: APOGEE_API_KEY, ref: refDossier }),
    });

    if (!projectResponse.ok) return false;
    
    const project = await projectResponse.json();
    const projectData = Array.isArray(project) ? project[0] : project;
    
    if (!projectData?.clientId) return false;

    // Fetch client
    const clientsResponse = await fetch(`https://${apiSubdomain}.hc-apogee.fr/api/apiGetClients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: APOGEE_API_KEY }),
    });

    if (!clientsResponse.ok) return false;
    
    const clients = await clientsResponse.json();
    const client = Array.isArray(clients) ? clients.find((c: any) => c.id === projectData.clientId) : null;
    
    if (!client) return false;

    // Extract and verify postal code
    let clientPostalCode = client.codePostal;
    if (!clientPostalCode && client.address) {
      const match = client.address.match(/\b\d{5}\b/);
      if (match) clientPostalCode = match[0];
    }

    return clientPostalCode === codePostal.trim();
  } catch (err) {
    console.error("Verification error:", err);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { refDossier, clientFirstName, clientLastName, appointmentDate, motif, agencySlug, codePostal }: EmpechementRequest = await req.json();

    // Input validation
    if (!refDossier || !codePostal || !appointmentDate || !motif) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('cf-connecting-ip') || 
                      'unknown';

    // Check rate limit
    const { allowed, remainingAttempts } = await checkRateLimit(supabase, ipAddress, refDossier);
    
    if (!allowed) {
      console.log(`Rate limit exceeded for IP ${ipAddress} on dossier ${refDossier}`);
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Réessayez dans 15 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Signalement d'empêchement - vérification en cours");

    // Get agency info
    const { email: agencyEmail, name: agencyName, apiSubdomain } = await getAgencyInfo(agencySlug);

    // SECURITY: Verify postal code before processing
    const isVerified = await verifyPostalCode(apiSubdomain, refDossier, codePostal);
    
    if (!isVerified) {
      await recordAttempt(supabase, ipAddress, refDossier, false);
      console.log("Empêchement refusé: vérification échouée");
      return new Response(
        JSON.stringify({ error: "Accès refusé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await recordAttempt(supabase, ipAddress, refDossier, true);
    console.log("Vérification OK, envoi de l'email");

    const formattedDate = new Date(appointmentDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Sanitize all user inputs for XSS prevention
    const safeRefDossier = sanitizeForHtml(refDossier);
    const safeClientFirstName = sanitizeForHtml(clientFirstName);
    const safeClientLastName = sanitizeForHtml(clientLastName);
    const safeMotif = sanitizeForHtml(motif);

    const emailResponse = await resend.emails.send({
      from: `${agencyName} - Suivi Client <noreply@helpconfort.services>`,
      to: [agencyEmail],
      subject: `🚨 Empêchement client - Dossier ${safeRefDossier}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Empêchement Client</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${agencyName}</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 16px;">
                🔴 Action requise : Rendez-vous à annuler et replanifier
              </p>
            </div>

            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 8px;">
              Informations du dossier
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr style="background-color: white;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563; width: 40%;">
                  Référence dossier
                </td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937; font-weight: 600;">
                  ${safeRefDossier}
                </td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">
                  Client
                </td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937; font-weight: 600;">
                  ${safeClientFirstName} ${safeClientLastName}
                </td>
              </tr>
              <tr style="background-color: white;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">
                  RDV à annuler
                </td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">
                  ${formattedDate}
                </td>
              </tr>
              <tr style="background-color: #fef2f2;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">
                  Motif
                </td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; color: #1f2937;">
                  ${safeMotif}
                </td>
              </tr>
            </table>

            <div style="background-color: #e0e7ff; border-left: 4px solid #4f46e5; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #312e81; font-size: 16px;">📋 Actions à effectuer :</h3>
              <ol style="color: #312e81; margin: 8px 0 0 0; padding-left: 20px; line-height: 1.8;">
                <li>Annuler le rendez-vous actuel dans le système</li>
                <li>Contacter le client pour fixer un nouveau rendez-vous</li>
                <li>Mettre à jour le statut du dossier</li>
              </ol>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              Ce message a été généré automatiquement depuis l'espace client ${agencyName}.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email envoyé avec succès:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erreur dans signaler-empechement:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
