/**
 * treasury-bridge-callback
 * 
 * Handles the return from Bridge Connect.
 * After the user completes bank consent in Bridge, they are redirected back.
 * This function finalizes the connection status and triggers initial sync.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ErrorCode = "AUTH" | "NO_AGENCY" | "VALIDATION" | "NOT_FOUND" | "FORBIDDEN_SCOPE" | "BRIDGE_ERROR" | "DB" | "INTERNAL";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function successResponse(data?: unknown) {
  return new Response(
    JSON.stringify({ success: true, ...(data !== undefined ? { data } : {}) }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("AUTH", "Non authentifié", 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse("AUTH", "Token invalide", 401);
    }

    const userId = claimsData.claims.sub as string;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .single();

    if (!profile?.agency_id) {
      return errorResponse("NO_AGENCY", "Agence introuvable", 400);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("VALIDATION", "JSON invalide", 400);
    }

    const { connectionId, bridgeStatus } = body;
    if (!connectionId || typeof connectionId !== "string") {
      return errorResponse("VALIDATION", "connectionId requis", 400);
    }

    // Verify ownership
    const { data: conn, error: connErr } = await serviceClient
      .from("bank_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connErr || !conn) {
      return errorResponse("NOT_FOUND", "Connexion introuvable", 404);
    }

    if (conn.agency_id !== profile.agency_id) {
      return errorResponse("FORBIDDEN_SCOPE", "Connexion hors périmètre", 403);
    }

    // Determine status from Bridge callback
    // Bridge Connect redirects with status parameter: success, consent_declined, etc.
    const status = typeof bridgeStatus === "string" ? bridgeStatus : "unknown";

    let newInternalStatus: string;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    switch (status) {
      case "success":
      case "item_created":
        newInternalStatus = "active";
        break;
      case "consent_declined":
        newInternalStatus = "error";
        errorCode = "CONSENT_DECLINED";
        errorMessage = "L'utilisateur a refusé le consentement bancaire";
        break;
      case "sca_failed":
        newInternalStatus = "error";
        errorCode = "SCA_FAILED";
        errorMessage = "Authentification forte (SCA) échouée";
        break;
      case "error":
        newInternalStatus = "error";
        errorCode = "BRIDGE_CONNECT_ERROR";
        errorMessage = "Erreur lors de la connexion Bridge";
        break;
      default:
        // If unknown, mark as pending and let sync determine real status
        newInternalStatus = conn.status === "connecting" ? "pending" : conn.status as string;
        break;
    }

    const updatePayload: Record<string, unknown> = {
      status: newInternalStatus,
      provider_status: status,
      updated_at: new Date().toISOString(),
    };

    if (errorCode) {
      updatePayload.error_code = errorCode;
      updatePayload.error_message = errorMessage;
      updatePayload.last_error_at = new Date().toISOString();
    } else {
      updatePayload.error_code = null;
      updatePayload.error_message = null;
    }

    await serviceClient.from("bank_connections")
      .update(updatePayload)
      .eq("id", connectionId);

    // Log
    try {
      await serviceClient.from("activity_log").insert({
        actor_id: userId,
        actor_type: "user",
        agency_id: profile.agency_id,
        module: "tresorerie",
        entity_type: "bank_connection",
        entity_id: connectionId,
        action: `bank_connection.bridge_callback.${status}`,
        metadata: { bridgeStatus: status },
      });
    } catch (e) {
      console.error("[CALLBACK_LOG_FAILED]", e);
    }

    return successResponse({
      connectionId,
      status: newInternalStatus,
      bridgeStatus: status,
      needsSync: newInternalStatus === "active",
    });

  } catch (err) {
    console.error("[TREASURY_CALLBACK_ERROR]", err instanceof Error ? err.message : err);
    return errorResponse("INTERNAL", "Erreur serveur inattendue", 500);
  }
});
