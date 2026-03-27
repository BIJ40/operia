/**
 * Edge Function: notify-new-ticket
 * Sends email notifications when a new ticket is created.
 * Called from the frontend after ticket insertion.
 * 
 * verify_jwt = false in config.toml — validates JWT in code
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, getCorsHeaders } from "../_shared/cors.ts";

interface TicketPayload {
  ticket_id: string;
  ticket_number: number;
  subject: string;
  description?: string;
  heat_priority?: number;
  module?: string;
  created_from?: string;
  initiator_name?: string;
  initiator_email?: string;
}

function getPriorityLabel(heat: number | undefined): string {
  if (!heat) return "Non définie";
  if (heat >= 10) return "🔴 Bloquant";
  if (heat >= 8) return "🟠 Urgent";
  if (heat >= 5) return "🟡 Important";
  if (heat >= 3) return "🔵 Normal";
  return "⚪ Faible";
}

function truncate(text: string | undefined, max: number): string {
  if (!text) return "(aucune description)";
  const clean = text.replace(/<[^>]*>/g, "").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

Deno.serve(async (req) => {
  // CORS
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin") ?? "";

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      });
    }

    const body: TicketPayload = await req.json();

    if (!body.ticket_id || !body.ticket_number || !body.subject) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      });
    }

    // Fetch active recipients using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: recipients, error: recipientsErr } = await supabaseAdmin
      .from("ticket_notification_recipients")
      .select("email, label")
      .eq("is_active", true);

    if (recipientsErr) {
      console.error("Failed to fetch recipients:", recipientsErr);
      return new Response(JSON.stringify({ error: "Failed to fetch recipients" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      });
    }

    if (!recipients || recipients.length === 0) {
      console.log("No active recipients configured, skipping notification");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      });
    }

    // Build email
    const appUrl = Deno.env.get("APP_URL") || "https://www.helpconfort.services";
    const ticketUrl = `${appUrl}/?tab=ticketing&ticket=${body.ticket_id}`;
    const priorityLabel = getPriorityLabel(body.heat_priority);
    const descriptionPreview = truncate(body.description, 300);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #1a1a2e; color: #ffffff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 18px;">🎫 Nouveau ticket TKT-${body.ticket_number}</h1>
    </div>
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="padding: 8px 0; color: #71717a; width: 120px;">Sujet</td>
          <td style="padding: 8px 0; font-weight: 600;">${body.subject}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #71717a;">Priorité</td>
          <td style="padding: 8px 0;">${priorityLabel}</td>
        </tr>
        ${body.module ? `<tr><td style="padding: 8px 0; color: #71717a;">Module</td><td style="padding: 8px 0;">${body.module}</td></tr>` : ""}
        ${body.initiator_name ? `<tr><td style="padding: 8px 0; color: #71717a;">Créé par</td><td style="padding: 8px 0;">${body.initiator_name}${body.initiator_email ? ` (${body.initiator_email})` : ""}</td></tr>` : ""}
        ${body.created_from ? `<tr><td style="padding: 8px 0; color: #71717a;">Source</td><td style="padding: 8px 0;">${body.created_from}</td></tr>` : ""}
      </table>
      <div style="background: #f4f4f5; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0; color: #3f3f46; font-size: 14px; line-height: 1.5;">${descriptionPreview}</p>
      </div>
      <a href="${ticketUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">
        Voir le ticket →
      </a>
    </div>
    <div style="padding: 16px 24px; background: #fafafa; color: #a1a1aa; font-size: 12px; text-align: center;">
      HelpConfort – Notification automatique
    </div>
  </div>
</body>
</html>`;

    // Send via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      });
    }

    const toEmails = recipients.map((r) => r.email);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Tickets HelpConfort <tickets@ticket.helpconfort.services>",
        to: toEmails,
        subject: `[TKT-${body.ticket_number}] ${body.subject}`,
        html: htmlBody,
      }),
    });

    const resendResult = await resendResponse.text();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResult);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: resendResult }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
      });
    }

    console.log(`Notification sent to ${toEmails.length} recipients for TKT-${body.ticket_number}`);

    return new Response(JSON.stringify({ success: true, sent: toEmails.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
    });
  } catch (error) {
    console.error("notify-new-ticket error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) },
    });
  }
});
