import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface NotifyRequest {
  request_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const { request_id }: NotifyRequest = await req.json();

    if (!request_id) {
      return withCors(req, new Response(
        JSON.stringify({ error: "request_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the request with apporteur and agency info
    const { data: request, error: requestError } = await supabaseAdmin
      .from("apporteur_intervention_requests")
      .select(`
        *,
        apporteur:apporteurs(name),
        agency:apogee_agencies(label, contact_email)
      `)
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      return withCors(req, new Response(
        JSON.stringify({ error: "Request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      ));
    }

    const agencyEmail = request.agency?.contact_email;
    const agencyName = request.agency?.label || "Agence";
    const apporteurName = request.apporteur?.name || "Apporteur";

    if (!agencyEmail) {
      console.log("No agency email configured, skipping notification");
      return withCors(req, new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No agency email" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Build urgency label
    const urgencyLabels: Record<string, string> = {
      normal: "Normal",
      urgent: "Urgent",
      tres_urgent: "Très urgent"
    };
    const urgencyLabel = urgencyLabels[request.urgency] || request.urgency;

    // Build request type label
    const typeLabels: Record<string, string> = {
      depannage: "Dépannage",
      travaux: "Travaux",
      maintenance: "Maintenance",
      diagnostic: "Diagnostic"
    };
    const typeLabel = typeLabels[request.request_type] || request.request_type;

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0066CC; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Nouvelle demande d'intervention</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Une nouvelle demande d'intervention a été soumise par <strong>${apporteurName}</strong>.
              </p>
              
              <!-- Request Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;">
                      <strong>Type :</strong> ${typeLabel}
                    </p>
                    <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;">
                      <strong>Urgence :</strong> <span style="color: ${request.urgency === 'tres_urgent' ? '#dc2626' : request.urgency === 'urgent' ? '#f59e0b' : '#059669'};">${urgencyLabel}</span>
                    </p>
                    <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;">
                      <strong>Locataire :</strong> ${request.tenant_name}
                    </p>
                    ${request.tenant_phone ? `<p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;"><strong>Téléphone :</strong> ${request.tenant_phone}</p>` : ''}
                    <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;">
                      <strong>Adresse :</strong> ${request.address}${request.postal_code ? `, ${request.postal_code}` : ''}${request.city ? ` ${request.city}` : ''}
                    </p>
                    <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;">
                      <strong>Description :</strong>
                    </p>
                    <p style="color: #666666; font-size: 14px; margin: 0; padding: 10px; background-color: #ffffff; border-radius: 4px;">
                      ${request.description}
                    </p>
                    ${request.availability ? `<p style="color: #333333; font-size: 14px; margin: 10px 0 0 0;"><strong>Disponibilités :</strong> ${request.availability}</p>` : ''}
                    ${request.comments ? `<p style="color: #333333; font-size: 14px; margin: 10px 0 0 0;"><strong>Commentaires :</strong> ${request.comments}</p>` : ''}
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Connectez-vous à votre espace HelpConfort pour traiter cette demande.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2025 HelpConfort. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "HelpConfort <onboarding@resend.dev>",
      to: [agencyEmail],
      subject: `[${urgencyLabel}] Nouvelle demande - ${apporteurName} - ${request.tenant_name}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return withCors(req, new Response(
      JSON.stringify({ success: true, response: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

  } catch (error: any) {
    console.error("Error in notify-apporteur-request:", error);
    return withCors(req, new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});
