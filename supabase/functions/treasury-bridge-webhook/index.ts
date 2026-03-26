/**
 * treasury-bridge-webhook — Production-grade Bridge webhook handler
 *
 * Receives Bridge events (item.refreshed, item.account.updated, etc.)
 * Verifies RSA signature (X-Webhook-Signature: t=<ts>,v0=<base64sig>)
 * Identifies the bank_connection by external_item_id
 * Triggers targeted sync via internal call to treasury-connection
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════
// CORS & helpers
// ═══════════════════════════════════════════════════════════

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

function ok(data: unknown = {}) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════════
// Bridge RSA Signature Verification
// Per Bridge docs: https://apidocs.bridge.xyz/platform/additional-information/webhooks/signature
//
// Header: X-Webhook-Signature
// Format: t=<timestamp_ms>,v0=<base64_encoded_signature>
//
// 1. Parse t= and v0= from header
// 2. digest = SHA256(timestamp + "." + rawBody)
// 3. Verify RSA signature(digest, decoded_v0, public_key)
// 4. Anti-replay: reject events older than 10 minutes
// ═══════════════════════════════════════════════════════════

const REPLAY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function parseSignatureHeader(header: string): { timestamp: string; signature: string } | null {
  // Format: t=1705854411204,v0=jz/0dmHJ63FA...
  const parts = header.split(",");
  let timestamp = "";
  let signature = "";

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("t=")) {
      timestamp = trimmed.slice(2);
    } else if (trimmed.startsWith("v0=")) {
      signature = trimmed.slice(3);
    }
  }

  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM header/footer and newlines
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/[\n\r\s]/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function verifyBridgeSignature(
  rawBody: string,
  req: Request,
  publicKeyPem: string
): Promise<{ valid: boolean; reason?: string }> {
  const sigHeader = req.headers.get("X-Webhook-Signature")
    ?? req.headers.get("x-webhook-signature");

  if (!sigHeader) {
    console.warn("[WEBHOOK_SIG] No X-Webhook-Signature header found");
    return { valid: false, reason: "no_signature_header" };
  }

  const parsed = parseSignatureHeader(sigHeader);
  if (!parsed) {
    console.error("[WEBHOOK_SIG] Failed to parse signature header:", sigHeader);
    return { valid: false, reason: "invalid_signature_format" };
  }

  // Anti-replay check
  const eventTimestamp = parseInt(parsed.timestamp, 10);
  const now = Date.now();
  if (isNaN(eventTimestamp) || Math.abs(now - eventTimestamp) > REPLAY_WINDOW_MS) {
    console.error("[WEBHOOK_SIG] Replay attack or stale event", {
      eventTimestamp,
      now,
      diff_ms: now - eventTimestamp,
    });
    return { valid: false, reason: "replay_or_stale" };
  }

  try {
    // Step 2: digest = SHA256(timestamp.rawBody)
    const dataToVerify = `${parsed.timestamp}.${rawBody}`;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(dataToVerify)
    );

    // Step 3: base64-decode the signature
    const decodedSignature = Uint8Array.from(
      atob(parsed.signature),
      (c) => c.charCodeAt(0)
    );

    // Step 4: Import RSA public key & verify
    const keyData = pemToArrayBuffer(publicKeyPem);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      keyData,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Bridge uses SHA256withRSA: the signature is over the raw digest bytes
    // We need to verify signature against the digest
    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decodedSignature,
      digest
    );

    if (isValid) {
      console.log("[WEBHOOK_SIG] RSA signature verified ✓");
      return { valid: true };
    }

    console.error("[WEBHOOK_SIG] RSA signature mismatch");
    return { valid: false, reason: "rsa_signature_mismatch" };
  } catch (err) {
    console.error("[WEBHOOK_SIG_ERROR]", err instanceof Error ? err.message : String(err));
    return { valid: false, reason: "crypto_error" };
  }
}

// ═══════════════════════════════════════════════════════════
// Bridge event types — exact names from Bridge v3 API
// ═══════════════════════════════════════════════════════════

const SYNC_TRIGGER_EVENTS = new Set([
  "item.refreshed",           // Item data has been refreshed
  "item.account.updated",     // An account within an item was updated
  "item.created",             // New item created (initial sync)
]);

// Events we log but don't trigger sync
const LOG_ONLY_EVENTS = new Set([
  "item.deleted",             // Item was deleted
  "item.needs_user_action",   // Requires user re-authentication
]);

// ═══════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return fail("Method not allowed", 405);
  }

  const rawBody = await req.text();

  // ── 1. RSA Signature verification ──
  const webhookPublicKey = Deno.env.get("BRIDGE_WEBHOOK_PUBLIC_KEY");

  if (webhookPublicKey) {
    const sigResult = await verifyBridgeSignature(rawBody, req, webhookPublicKey);
    if (!sigResult.valid) {
      console.error("[WEBHOOK_SIG_REJECTED]", sigResult.reason);
      return fail(`Signature verification failed: ${sigResult.reason}`, 401);
    }
  } else {
    // In development/transition: accept without verification but warn loudly
    console.warn("[WEBHOOK_SIG_SKIP] BRIDGE_WEBHOOK_PUBLIC_KEY not set — ACCEPTING WITHOUT VERIFICATION");
  }

  // ── 2. Parse payload ──
  let payload: { type?: string; content?: Record<string, unknown>; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const eventType = payload.type ?? "unknown";
  // Bridge v3 uses "content" for the event data
  const eventData = payload.content ?? payload.data ?? {};

  console.log("[BRIDGE_WEBHOOK]", {
    event: eventType,
    item_id: eventData.item_id ?? eventData.id,
    ts: new Date().toISOString(),
  });

  // ── 3. Init Supabase service client ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── 4. Log webhook event ──
  const itemId = eventData.item_id ?? eventData.id;
  await supabase.from("bank_webhook_events").insert({
    event_type: eventType,
    external_item_id: itemId ? String(itemId) : null,
    payload: payload,
    received_at: new Date().toISOString(),
    processed: false,
  }).then(({ error }) => {
    if (error) console.warn("[WEBHOOK_LOG_INSERT_WARN]", error.message);
  });

  // ── 5. Find connection by item_id ──
  let connectionId: string | null = null;
  let connectionAgencyId: string | null = null;

  if (itemId) {
    const { data: conn } = await supabase
      .from("bank_connections")
      .select("id, agency_id, user_id, external_user_id, status")
      .eq("external_item_id", String(itemId))
      .maybeSingle();

    if (conn) {
      connectionId = conn.id;
      connectionAgencyId = conn.agency_id;
    }
  }

  if (!connectionId) {
    console.warn("[WEBHOOK_NO_CONNECTION]", { item_id: itemId, event: eventType });
    // Still return 200 so Bridge doesn't retry
    return ok({ status: "ignored", reason: "no_matching_connection" });
  }

  // ── 6. Route event ──
  if (SYNC_TRIGGER_EVENTS.has(eventType)) {
    console.log("[WEBHOOK_SYNC_TRIGGER]", { connectionId, event: eventType });

    try {
      const syncResp = await fetch(`${supabaseUrl}/functions/v1/treasury-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          action: "webhook-sync",
          connectionId,
          webhookEvent: eventType,
          webhookItemId: itemId ? String(itemId) : undefined,
        }),
      });

      const syncResult = await syncResp.json().catch(() => ({}));

      // Update webhook log as processed
      if (itemId) {
        await supabase.from("bank_webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("external_item_id", String(itemId))
          .eq("event_type", eventType)
          .eq("processed", false);
      }

      console.log("[WEBHOOK_SYNC_RESULT]", {
        connectionId,
        status: syncResp.status,
        success: (syncResult as Record<string, unknown>)?.success,
      });
    } catch (err) {
      console.error("[WEBHOOK_SYNC_ERROR]", {
        connectionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else if (LOG_ONLY_EVENTS.has(eventType)) {
    console.log("[WEBHOOK_LOG_ONLY]", { connectionId, event: eventType });

    if (eventType === "item.needs_user_action") {
      await supabase.from("bank_connections")
        .update({
          status: "action_required",
          provider_status: "needs_user_action",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);
    }

    if (eventType === "item.deleted") {
      await supabase.from("bank_connections")
        .update({
          status: "disconnected",
          provider_status: "item_deleted_by_provider",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);
    }
  } else {
    console.log("[WEBHOOK_UNHANDLED_EVENT]", { event: eventType, connectionId });
  }

  return ok({ status: "processed", connectionId, event: eventType });
});
