/**
 * Edge Function: reply-ticket-email
 * Sends an email reply to the ticket requester via Resend.
 * Called from the frontend when an agent replies to an email-originated ticket.
 * 
 * Requires JWT auth (agent must be authenticated).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // HTML escape helper to prevent injection
  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const { ticket_id, message } = await req.json();

    if (!ticket_id || !message) {
      return new Response(JSON.stringify({ error: "ticket_id and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ticket details with service role for full access
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: ticket, error: ticketError } = await adminClient
      .from("apogee_tickets")
      .select("id, ticket_number, element_concerne, notes_internes, initiator_profile, created_from")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract requester email from initiator_profile or notes_internes
    let requesterEmail: string | null = null;

    // Try initiator_profile first
    if (ticket.initiator_profile && typeof ticket.initiator_profile === "object") {
      const profile = ticket.initiator_profile as Record<string, string>;
      requesterEmail = profile.email || null;
    }

    // Fallback: parse from notes_internes
    if (!requesterEmail && ticket.notes_internes) {
      const match = ticket.notes_internes.match(/Email expéditeur:\s*(\S+@\S+)/i);
      if (match) requesterEmail = match[1];
    }

    if (!requesterEmail) {
      return new Response(
        JSON.stringify({ error: "No requester email found for this ticket" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ticketRef = `TKT-${ticket.ticket_number}`;
    const emailSubject = `Re: [${ticketRef}] ${ticket.element_concerne}`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Support Apogée / Help <support@ticket.helpconfort.services>",
        to: [requesterEmail],
        subject: emailSubject,
        text: message,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Référence ticket: ${ticketRef}<br>
            Pour répondre, répondez directement à cet email.
          </p>
        </div>`,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResult);
      return new Response(
        JSON.stringify({ error: "Failed to send email", detail: resendResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Also save the exchange in the database
    await adminClient.from("apogee_ticket_support_exchanges").insert({
      ticket_id: ticket.id,
      message: `📧 Réponse envoyée à ${requesterEmail}:\n\n${message}`,
      is_from_support: true,
      sender_user_id: userId,
    });

    console.log(`Email reply sent for ${ticketRef} to ${requesterEmail}`);

    return new Response(
      JSON.stringify({ ok: true, email_id: resendResult.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
