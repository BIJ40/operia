/**
 * treasury-bridge-webhook — Production-grade Bridge webhook handler
 *
 * Receives Bridge events (item.updated, account.updated, transaction.created/updated)
 * Verifies RSA signature (X-Webhook-Signature) per Bridge docs
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
// Bridge RSA Signature verification
// Per https://docs.bridgeapi.io — X-Webhook-Signature: t=<ts>,v0=<base64sig>
// Digest = SHA256(timestamp + "." + rawBody)
// Verify with RSA public key
// ═══════════════════════════════════════════════════════════

const MAX_REPLAY_AGE_MS = 10 * 60 * 1000; // 10 minutes

function parseSignatureHeader(header: string): { timestamp: string; signature: string } | null {
  const parts: Record<string, string> = {};
  for (const segment of header.split(",")) {
    const eqIdx = segment.indexOf("=");
    if (eqIdx === -1) continue;
    const key = segment.slice(0, eqIdx).trim();
    const value = segment.slice(eqIdx + 1).trim();
    parts[key] = value;
  }
  if (!parts.t || !parts.v0) return null;
  return { timestamp: parts.t, signature: parts.v0 };
}

async function verifyBridgeSignature(
  rawBody: string,
  signatureHeader: string | null,
  publicKeyPem: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!signatureHeader) {
    return { valid: false, reason: "missing_header" };
  }

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    return { valid: false, reason: "malformed_header" };
  }

  // Anti-replay: reject events older than 10 min
  const tsMs = parseInt(parsed.timestamp, 10);
  if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > MAX_REPLAY_AGE_MS) {
    return { valid: false, reason: "replay_rejected" };
  }

  try {
    // Step 1: SHA256 digest of "timestamp.body"
    const message = `${parsed.timestamp}.${rawBody}`;
    const msgBuffer = new TextEncoder().encode(message);
    const digest = await crypto.subtle.digest("SHA-256", msgBuffer);

    // Step 2: Decode base64 signature
    const sigBytes = Uint8Array.from(atob(parsed.signature), (c) => c.charCodeAt(0));

    // Step 3: Import RSA public key
    const pemBody = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\s/g, "");
    const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      keyBytes.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Step 4: Verify — Bridge does double-hash: sign(SHA256(timestamp.body))
    // The digest is the data that was signed
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      sigBytes.buffer,
      digest
    );

    return { valid };
  } catch (err) {
    console.error("[WEBHOOK_SIG_VERIFY_ERROR]", err);
    return { valid: false, reason: "crypto_error" };
  }
}

// ═══════════════════════════════════════════════════════════
// Sync events we care about
// ═══════════════════════════════════════════════════════════

const SYNC_TRIGGER_EVENTS = new Set([
  "item.refreshed",
  "item.updated",
  "account.updated",
  "transaction.created",
  "transaction.updated",
]);

// Events we log but don't sync
const LOG_ONLY_EVENTS = new Set([
  "item.created",
  "item.deleted",
  "item.needs_user_action",
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

  // ── 1. Signature verification ──
  const publicKey = Deno.env.get("BRIDGE_WEBHOOK_PUBLIC_KEY");
  const signatureHeader = req.headers.get("X-Webhook-Signature") ?? req.headers.get("x-webhook-signature");

  if (publicKey) {
    const sigResult = await verifyBridgeSignature(rawBody, signatureHeader, publicKey);
    if (!sigResult.valid) {
      console.error("[WEBHOOK_SIG_REJECTED]", sigResult.reason);
      return fail(`Signature verification failed: ${sigResult.reason}`, 401);
    }
  } else {
    // Sandbox tolerance — log but allow
    console.warn("[WEBHOOK_SIG_SKIP] BRIDGE_WEBHOOK_PUBLIC_KEY not set — accepting without verification (sandbox only)");
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
  let connectionUserId: string | null = null;

  if (itemId) {
    const { data: conn } = await supabase
      .from("bank_connections")
      .select("id, agency_id, user_id, external_user_id, status")
      .eq("external_item_id", String(itemId))
      .maybeSingle();

    if (conn) {
      connectionId = conn.id;
      connectionAgencyId = conn.agency_id;
      connectionUserId = conn.user_id;
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
      // Internal call to treasury-connection sync action
      // Using service role key to bypass auth since this is a server-to-server call
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
      // Still return 200 — we don't want Bridge to retry, we'll handle it
    }
  } else if (LOG_ONLY_EVENTS.has(eventType)) {
    console.log("[WEBHOOK_LOG_ONLY]", { connectionId, event: eventType });

    // For item.needs_user_action, update connection status
    if (eventType === "item.needs_user_action") {
      await supabase.from("bank_connections")
        .update({
          status: "action_required",
          provider_status: "needs_user_action",
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);
    }

    // For item.deleted, mark as disconnected
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
