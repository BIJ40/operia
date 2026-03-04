/**
 * Edge Function: email-to-ticket
 * Receives Resend inbound webhook (email.received) and creates/updates tickets
 * in apogee_tickets + apogee_ticket_support_exchanges.
 * 
 * verify_jwt = false — webhook is authenticated via Resend signature (svix)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Svix signature verification ──────────────────────────────────────

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function hmacSHA256(secret: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function base64Encode(buf: Uint8Array): string {
  let bin = "";
  for (const byte of buf) bin += String.fromCharCode(byte);
  return btoa(bin);
}

async function verifySvixSignature(
  body: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Tolerance: 5 minutes
  const ts = parseInt(svixTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  // Secret starts with "whsec_"
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const secretBytes = base64Decode(rawSecret);

  const toSign = `${svixId}.${svixTimestamp}.${body}`;
  const expected = await hmacSHA256(secretBytes, toSign);
  const expectedB64 = base64Encode(expected);

  // svix-signature can contain multiple signatures separated by spaces
  const signatures = svixSignature.split(" ");
  for (const sig of signatures) {
    const [version, hash] = sig.split(",");
    if (version === "v1" && hash === expectedB64) return true;
  }
  return false;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Extract ticket number from subject: [TKT-123] */
function extractTicketNumber(subject: string): number | null {
  const match = subject.match(/\[TKT-(\d+)\]/i);
  return match ? parseInt(match[1], 10) : null;
}

/** Parse email "from" field: "Name <email>" or just "email" */
function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  return { name: from.split("@")[0], email: from.trim().toLowerCase() };
}

/** Clean text for storage */
function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  // Remove excessive whitespace but preserve structure
  return text.replace(/\r\n/g, "\n").trim().slice(0, 10000);
}

// ── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("RESEND_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();

    // Verify Resend/Svix signature
    const isValid = await verifySvixSignature(body, req.headers, webhookSecret);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);
    console.log("Webhook event type:", payload.type);

    // Only process email.received events
    if (payload.type !== "email.received") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailData = payload.data;
    const emailId = emailData.email_id;

    const { name: senderName, email: senderEmail } = parseFrom(
      emailData.from || emailData.envelope?.from || "",
    );
    const subject = emailData.subject || "(Sans objet)";

    // Fetch actual email content via Resend API (webhook only contains metadata)
    let textBody = "";
    if (emailId) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        try {
          const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            headers: { "Authorization": `Bearer ${resendApiKey}` },
          });
          if (res.ok) {
            const emailDetail = await res.json();
            console.log("Resend email detail keys:", Object.keys(emailDetail));
            textBody = sanitizeText(emailDetail.text || emailDetail.html || "");
          } else {
            console.error("Resend API error:", res.status, await res.text());
          }
        } catch (fetchErr) {
          console.error("Error fetching email content:", fetchErr);
        }
      } else {
        console.warn("RESEND_API_KEY not configured, cannot fetch email body");
      }
    }

    // Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Check if this is a reply to an existing ticket ──
    const ticketNumber = extractTicketNumber(subject);

    if (ticketNumber) {
      // Find existing ticket
      const { data: existingTicket, error: findError } = await supabase
        .from("apogee_tickets")
        .select("id, ticket_number")
        .eq("ticket_number", ticketNumber)
        .maybeSingle();

      if (findError) {
        console.error("Error finding ticket:", findError);
      }

      if (existingTicket) {
        // Add message to existing ticket exchanges
        const { error: msgError } = await supabase
          .from("apogee_ticket_support_exchanges")
          .insert({
            ticket_id: existingTicket.id,
            message: `📧 De: ${senderName} <${senderEmail}>\n\n${textBody}`,
            is_from_support: false,
            sender_user_id: "00000000-0000-0000-0000-000000000000", // system placeholder
          });

        if (msgError) console.error("Error adding exchange:", msgError);

        // Update ticket timestamp
        await supabase
          .from("apogee_tickets")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", existingTicket.id);

        console.log(`Reply added to ticket TKT-${ticketNumber}`);

        return new Response(
          JSON.stringify({ ok: true, action: "reply_added", ticket_number: ticketNumber }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Route by destination address ──
    const toAddresses: string[] = emailData.to || [];
    const toAddress = toAddresses[0]?.toLowerCase() || "";
    const toLocal = toAddress.split("@")[0]; // e.g. "bug", "support", "dev"

    // Mapping: adresse destination → tag + priorité
    const EMAIL_ROUTING: Record<string, { tag: string; priority: number }> = {
      "bug":     { tag: "BUG",     priority: 12 },
      "dev":     { tag: "EVO",     priority: 4 },
      "support": { tag: "AIDE",    priority: 11 },
    };

    const route = EMAIL_ROUTING[toLocal] || { tag: "TICKET MAIL", priority: 10 };
    console.log(`Email routing: to=${toAddress}, local=${toLocal}, tag=${route.tag}, priority=${route.priority}`);

    // ── Create new ticket ──
    // Store requester email + destination in notes_internes for agent reply
    const notesInternes = `📧 Email expéditeur: ${senderEmail}\n👤 Nom: ${senderName}\n📬 Adresse contactée: ${toAddress}`;

    const { data: newTicket, error: createError } = await supabase
      .from("apogee_tickets")
      .insert({
        element_concerne: subject.replace(/\[TKT-\d+\]\s*/gi, "").trim() || "(Sans objet)",
        description: textBody.slice(0, 5000),
        kanban_status: "USER",
        created_from: "email",
        reported_by: "AUTRE",
        heat_priority: route.priority,
        notes_internes: notesInternes,
        impact_tags: ["EMAIL", route.tag],
        initiator_profile: {
          first_name: senderName,
          email: senderEmail,
        },
      })
      .select("id, ticket_number")
      .single();

    if (createError) {
      console.error("Error creating ticket:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create ticket", detail: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Add initial message as support exchange
    const { error: exchangeError } = await supabase
      .from("apogee_ticket_support_exchanges")
      .insert({
        ticket_id: newTicket.id,
        message: `📧 Email reçu de: ${senderName} <${senderEmail}>\n📋 Sujet: ${subject}\n\n${textBody}`,
        is_from_support: false,
        sender_user_id: "00000000-0000-0000-0000-000000000000", // system placeholder
      });

    if (exchangeError) console.error("Error adding initial exchange:", exchangeError);

    // Handle attachments if present
    if (emailData.attachments && Array.isArray(emailData.attachments)) {
      for (const attachment of emailData.attachments) {
        try {
          if (!attachment.content) continue;

          const fileBytes = base64Decode(attachment.content);
          const filePath = `${newTicket.id}/${Date.now()}-${attachment.filename || "attachment"}`;

          const { error: uploadError } = await supabase.storage
            .from("apogee-ticket-attachments")
            .upload(filePath, fileBytes, {
              contentType: attachment.content_type || "application/octet-stream",
            });

          if (uploadError) {
            console.error("Attachment upload error:", uploadError);
          } else {
            await supabase.from("apogee_ticket_attachments").insert({
              ticket_id: newTicket.id,
              file_name: attachment.filename || "attachment",
              file_path: filePath,
              file_size: fileBytes.length,
              file_type: attachment.content_type || "application/octet-stream",
            });
          }
        } catch (attErr) {
          console.error("Attachment processing error:", attErr);
        }
      }
    }

    console.log(`New ticket created: TKT-${newTicket.ticket_number} from ${senderEmail}`);

    return new Response(
      JSON.stringify({
        ok: true,
        action: "ticket_created",
        ticket_number: newTicket.ticket_number,
        ticket_id: newTicket.id,
      }),
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
