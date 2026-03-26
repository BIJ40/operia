/**
 * treasury-bridge-webhook — Bridge webhook handler
 * Phase 1: Accept events, log, route to sync
 * Security: HTTPS + secret URL + logging
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ── Events that trigger a sync ──
const SYNC_TRIGGER_EVENTS = new Set([
  "item.refreshed",
  "item.account.updated",
  "item.created",
]);

// ── Events we log but don't sync ──
const LOG_ONLY_EVENTS = new Set([
  "item.deleted",
  "item.needs_user_action",
]);

// ── Main ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("Method not allowed", 405);
  }

  const rawBody = await req.text();

  // Parse payload
  let payload: { type?: string; content?: Record<string, unknown>; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const eventType = payload.type ?? "unknown";
  const eventData = payload.content ?? payload.data ?? {};
  const itemId = eventData.item_id ?? eventData.id;

  console.log("[BRIDGE_WEBHOOK]", { event: eventType, item_id: itemId, ts: new Date().toISOString() });

  // Supabase service client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Log event
  await supabase.from("bank_webhook_events").insert({
    event_type: eventType,
    external_item_id: itemId ? String(itemId) : null,
    payload,
    received_at: new Date().toISOString(),
    processed: false,
  }).then(({ error }) => {
    if (error) console.warn("[WEBHOOK_LOG_WARN]", error.message);
  });

  // Find connection
  let connectionId: string | null = null;
  if (itemId) {
    const { data: conn } = await supabase
      .from("bank_connections")
      .select("id, agency_id")
      .eq("external_item_id", String(itemId))
      .maybeSingle();
    if (conn) connectionId = conn.id;
  }

  if (!connectionId) {
    console.warn("[WEBHOOK_NO_CONNECTION]", { item_id: itemId, event: eventType });
    return ok({ status: "ignored", reason: "no_matching_connection" });
  }

  // Route
  if (SYNC_TRIGGER_EVENTS.has(eventType)) {
    console.log("[WEBHOOK_SYNC]", { connectionId, event: eventType });
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/treasury-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ action: "webhook-sync", connectionId, webhookEvent: eventType, webhookItemId: itemId ? String(itemId) : undefined }),
      });
      const result = await resp.json().catch(() => ({}));
      console.log("[WEBHOOK_SYNC_RESULT]", { connectionId, status: resp.status, success: (result as Record<string, unknown>)?.success });

      if (itemId) {
        await supabase.from("bank_webhook_events")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("external_item_id", String(itemId))
          .eq("event_type", eventType)
          .eq("processed", false);
      }
    } catch (err) {
      console.error("[WEBHOOK_SYNC_ERROR]", { connectionId, error: err instanceof Error ? err.message : String(err) });
    }
  } else if (LOG_ONLY_EVENTS.has(eventType)) {
    if (eventType === "item.needs_user_action") {
      await supabase.from("bank_connections").update({ status: "action_required", provider_status: "needs_user_action", updated_at: new Date().toISOString() }).eq("id", connectionId);
    }
    if (eventType === "item.deleted") {
      await supabase.from("bank_connections").update({ status: "disconnected", provider_status: "item_deleted_by_provider", updated_at: new Date().toISOString() }).eq("id", connectionId);
    }
  }

  return ok({ status: "processed", connectionId, event: eventType });
});
