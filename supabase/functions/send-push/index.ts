import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import webpush from "https://esm.sh/web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:support@helpconfort.services",
  vapidPublicKey,
  vapidPrivateKey
);

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

const handler = async (req: Request): Promise<Response> => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ));
    }

    const payload: PushPayload = await req.json();
    const { user_id, user_ids, title, body, icon, badge, url, tag, data } = payload;

    // Determine target user IDs
    const targetUserIds = user_ids || (user_id ? [user_id] : []);
    
    if (targetUserIds.length === 0) {
      return withCors(req, new Response(
        JSON.stringify({ error: "No target users specified" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    console.log(`[SEND-PUSH] Sending push to ${targetUserIds.length} user(s)`);

    // Get active subscriptions for target users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds)
      .eq("is_active", true);

    if (subError) {
      console.error("[SEND-PUSH] Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[SEND-PUSH] No active subscriptions found");
      return withCors(req, new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active subscriptions" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    const pushPayload = JSON.stringify({
      title,
      body,
      icon: icon || "/icons/icon-192x192.png",
      badge: badge || "/icons/icon-72x72.png",
      url: url || "/",
      tag: tag || "default",
      data: data || {},
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };
          
          await webpush.sendNotification(pushSubscription, pushPayload);
          
          // Update last_used_at
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", sub.id);
          
          return { success: true, id: sub.id };
        } catch (error: any) {
          console.error(`[SEND-PUSH] Error sending to ${sub.id}:`, error);
          
          // 410 Gone or 404 = subscription expired, deactivate it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[SEND-PUSH] Subscription ${sub.id} expired, deactivating`);
            await supabase
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id);
          }
          
          return { success: false, id: sub.id, error: String(error) };
        }
      })
    );

    const successful = results.filter(r => r.status === "fulfilled" && (r.value as any).success).length;
    const failed = results.length - successful;

    console.log(`[SEND-PUSH] Sent ${successful}/${results.length} notifications`);

    return withCors(req, new Response(
      JSON.stringify({ success: true, sent: successful, failed }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

  } catch (error: any) {
    console.error("[SEND-PUSH] Error:", error);
    return withCors(req, new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
};

serve(handler);
