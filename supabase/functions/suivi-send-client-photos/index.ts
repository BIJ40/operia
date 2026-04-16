import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAX_DEFAULTS = {
  contact_email: "dax@helpconfort.com",
  name: "HelpConfort Dax",
  api_subdomain: "dax"
};

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

interface PhotoData {
  name: string;
  type: string;
  data: string; // base64
}

interface PhotoUploadRequest {
  refDossier: string;
  clientName: string;
  photos: PhotoData[]; // New: photos as base64 data
  photoUrls?: string[]; // Legacy: keep for backward compatibility
  commentaire?: string;
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
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS }; // Fail open
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

async function verifyPostalCode(apiSubdomain: string, refDossier: string, codePostal: string): Promise<boolean> {
  try {
    const projectResponse = await fetch(`https://${apiSubdomain}.hc-apogee.fr/api/apiGetProjectByRef`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: APOGEE_API_KEY, ref: refDossier }),
    });

    if (!projectResponse.ok) return false;
    
    const project = await projectResponse.json();
    const projectData = Array.isArray(project) ? project[0] : project;
    
    if (!projectData?.clientId) return false;

    const clientsResponse = await fetch(`https://${apiSubdomain}.hc-apogee.fr/api/apiGetClients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: APOGEE_API_KEY }),
    });

    if (!clientsResponse.ok) return false;
    
    const clients = await clientsResponse.json();
    const client = Array.isArray(clients) ? clients.find((c: any) => c.id === projectData.clientId) : null;
    
    if (!client) return false;

    let clientPostalCode = client.codePostal;
    if (!clientPostalCode && client.address) {
      const match = client.address.match(/\b\d{5}\b/);
      if (match) clientPostalCode = match[0];
    }

    return clientPostalCode === codePostal.trim();
  } catch (err) {
    return false;
  }
}

// Convert base64 to Uint8Array for storage upload
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { refDossier, clientName, photos, photoUrls, commentaire, agencySlug, codePostal }: PhotoUploadRequest = await req.json();

    // Input validation
    if (!refDossier || !codePostal) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Must have either photos (new) or photoUrls (legacy)
    if ((!photos || photos.length === 0) && (!photoUrls || photoUrls.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Aucune photo fournie" }),
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

    console.log("Photo upload - vérification en cours");

    const { email: recipientEmail, name: agencyName, apiSubdomain } = await getAgencyInfo(agencySlug);

    // SECURITY: Verify postal code before processing
    const isVerified = await verifyPostalCode(apiSubdomain, refDossier, codePostal);
    
    if (!isVerified) {
      // Record failed attempt
      await recordAttempt(supabase, ipAddress, refDossier, false);
      console.log(`Photo upload refusé: vérification échouée. ${remainingAttempts - 1} tentatives restantes`);
      return new Response(
        JSON.stringify({ error: "Accès refusé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record successful attempt
    await recordAttempt(supabase, ipAddress, refDossier, true);

    // Upload photos to storage and prepare attachments for email
    const attachments: { filename: string; content: string }[] = [];
    const photoFilenames: string[] = [];

    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const timestamp = Date.now();
        const randomId = crypto.randomUUID().substring(0, 8);
        const extension = photo.name.split('.').pop() || 'jpg';
        const fileName = `${refDossier}/${timestamp}-${randomId}.${extension}`;

        const fileData = base64ToUint8Array(photo.data);

        const { error } = await supabase.storage
          .from("client-photos")
          .upload(fileName, fileData, {
            contentType: photo.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          console.error("Upload error:", error);
          throw new Error(`Erreur lors de l'envoi de ${photo.name}`);
        }

        // Extract raw base64 for email attachment
        const rawBase64 = photo.data.includes(',') ? photo.data.split(',')[1] : photo.data;
        const attachmentFilename = `photo-${photoFilenames.length + 1}.${extension}`;
        
        attachments.push({
          filename: attachmentFilename,
          content: rawBase64,
        });
        photoFilenames.push(attachmentFilename);
      }
    } else if (photoUrls && photoUrls.length > 0) {
      for (let i = 0; i < photoUrls.length; i++) {
        try {
          const resp = await fetch(photoUrls[i]);
          const buffer = await resp.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let j = 0; j < bytes.length; j++) {
            binary += String.fromCharCode(bytes[j]);
          }
          const base64 = btoa(binary);
          const contentType = resp.headers.get('content-type') || 'image/jpeg';
          const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
          const attachmentFilename = `photo-${i + 1}.${ext}`;
          attachments.push({ filename: attachmentFilename, content: base64 });
          photoFilenames.push(attachmentFilename);
        } catch (e) {
          console.error("Failed to download legacy photo URL:", e);
        }
      }
    }

    console.log("Vérification OK, envoi de l'email avec", attachments.length, "photos en pièces jointes");

    // Build inline image previews using CID references
    const photoPreviewsHtml = attachments
      .map((att, index) => `
        <td style="padding: 0 10px 10px 0; text-align: center; vertical-align: top;">
          <img src="cid:preview-${index}" alt="${att.filename}" width="120" height="90" style="width: 120px; height: 90px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; display: block;" />
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">📎 ${att.filename}</p>
        </td>
      `)
      .join("");
    
    // Single attachment list with CID for inline preview + download
    const emailAttachments = attachments.map((att, index) => ({
      filename: att.filename,
      content: att.content,
      content_id: `preview-${index}`,
    }));

    // Sanitize user inputs for XSS prevention
    const safeClientName = sanitizeForHtml(clientName);
    const safeRefDossier = sanitizeForHtml(refDossier);
    const safeCommentaire = sanitizeForHtml(commentaire);

    const commentaireHtml = safeCommentaire 
      ? `
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 8px 0; font-weight: bold;">Commentaire du client :</p>
          <p style="margin: 0; white-space: pre-wrap;">${safeCommentaire}</p>
        </div>
      `
      : "";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Suivi ${agencyName} <noreply@helpconfort.services>`,
        to: [recipientEmail],
        subject: `[Photos] Dossier ${safeRefDossier} - ${safeClientName}`,
        attachments: emailAttachments,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0077b6 0%, #00a8e8 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📷 Photos reçues</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0;"><strong>Dossier :</strong> ${safeRefDossier}</p>
                <p style="margin: 5px 0 0 0;"><strong>Client :</strong> ${safeClientName}</p>
                <p style="margin: 5px 0 0 0;"><strong>Nombre de photos :</strong> ${attachments.length}</p>
              </div>
              
              ${commentaireHtml}
              
              <h2 style="color: #0077b6; border-bottom: 2px solid #0077b6; padding-bottom: 10px;">Photos jointes</h2>
              
              <p style="color: #555; font-size: 14px; margin-bottom: 15px;">
                📎 Les <strong>${attachments.length} photo(s)</strong> sont disponibles en <strong>pièces jointes</strong> de cet email.
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  ${photoPreviewsHtml}
                </tr>
              </table>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
              
              <p style="color: #666; font-size: 12px; margin: 0;">
                Ces photos ont été envoyées par le client via le portail de suivi.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error("Erreur lors de l'envoi de l'email");
    }

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Photos envoyées avec succès" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-client-photos function:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
