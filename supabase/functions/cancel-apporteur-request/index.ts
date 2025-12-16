import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CancelRequest {
  request_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const { request_id }: CancelRequest = await req.json();

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

    // Fetch the request with apporteur, agency and user info
    const { data: request, error: requestError } = await supabaseAdmin
      .from("apporteur_intervention_requests")
      .select(`
        *,
        apporteur:apporteurs(name),
        agency:apogee_agencies(label, contact_email),
        apporteur_user:apporteur_users(first_name, last_name, email)
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

    // Check if request can be cancelled (only pending or submitted)
    if (request.status === 'cancelled') {
      return withCors(req, new Response(
        JSON.stringify({ error: "Request is already cancelled" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    if (request.status === 'in_progress' || request.apogee_project_id) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Cannot cancel a request that has already been processed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Update request status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from("apporteur_intervention_requests")
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq("id", request_id);

    if (updateError) {
      console.error("Error updating request:", updateError);
      return withCors(req, new Response(
        JSON.stringify({ error: "Failed to cancel request" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Send cancellation email to agency
    const agencyEmail = request.agency?.contact_email;
    const agencyName = request.agency?.label || "Agence";
    const apporteurName = request.apporteur?.name || "Apporteur";
    const userName = [request.apporteur_user?.first_name, request.apporteur_user?.last_name].filter(Boolean).join(' ') || "Utilisateur";
    const userEmail = request.apporteur_user?.email || "";
    const requestReference = request.reference || "N/A";

    if (agencyEmail) {
      console.log("Sending cancellation email to:", agencyEmail);

      const typeLabels: Record<string, string> = {
        depannage: "Dépannage",
        travaux: "Travaux",
        maintenance: "Maintenance",
        diagnostic: "Diagnostic"
      };
      const typeLabel = typeLabels[request.request_type] || request.request_type;

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
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px;">❌ Demande annulée</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Réf. ${requestReference}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 17px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour,
              </p>
              <p style="color: #333333; font-size: 17px; line-height: 1.6; margin: 0 0 20px 0;">
                La demande d'intervention référence <strong>${requestReference}</strong> a été <strong style="color: #dc2626;">annulée</strong> par <strong>${apporteurName}</strong>.
              </p>
              
              <!-- Request Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Référence :</strong> <span style="color: #dc2626; font-weight: bold;">${requestReference}</span>
                    </p>
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Type :</strong> ${typeLabel}
                    </p>
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">
                      <strong>Locataire :</strong> ${request.tenant_name}
                    </p>
                    <p style="color: #333333; font-size: 15px; margin: 0;">
                      <strong>Adresse :</strong> ${request.address}${request.postal_code ? `, ${request.postal_code}` : ''}${request.city ? ` ${request.city}` : ''}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
                Si un dossier a déjà été créé dans Apogée pour cette demande, veuillez le clôturer manuellement.
              </p>
            </td>
          </tr>
          <!-- Signature -->
          <tr>
            <td style="padding: 0 30px 30px 30px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-top: 20px;">
                    <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.6;">
                      Cordialement,<br>
                      <strong style="color: #333333;">${userName}</strong><br>
                      <span style="color: #888888;">${apporteurName}</span><br>
                      ${userEmail ? `<a href="mailto:${userEmail}" style="color: #0066CC;">${userEmail}</a>` : ''}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
              <p style="color: #888888; font-size: 12px; margin: 0;">
                Cet email a été envoyé automatiquement via le Portail Apporteur HelpConfort
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

      try {
        const emailResult = await resend.emails.send({
          from: "HelpConfort <noreply@helpconfort.services>",
          to: [agencyEmail],
          subject: `❌ Demande annulée - Réf. ${requestReference} - ${request.tenant_name}`,
          html: emailHtml,
        });

        console.log("Cancellation email sent:", emailResult);
      } catch (emailError) {
        console.error("Error sending cancellation email:", emailError);
        // Don't fail the request if email fails - cancellation was successful
      }
    } else {
      console.log("No agency email configured, skipping notification");
    }

    return withCors(req, new Response(
      JSON.stringify({ success: true, message: "Request cancelled successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

  } catch (error: unknown) {
    console.error("Error in cancel-apporteur-request:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return withCors(req, new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});
