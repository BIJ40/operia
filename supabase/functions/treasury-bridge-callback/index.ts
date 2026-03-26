/**
 * treasury-bridge-callback
 * 
 * Processes the return from Bridge Connect.
 * Bridge callback_url receives: user_uuid, item_id, success, step, source, context.
 * This function finalizes the connection and prepares for initial sync.
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
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return errorResponse("AUTH", "Token invalide", 401);
    }

    const userId = userData.user.id;
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

    const { connectionId } = body;
    if (!connectionId || typeof connectionId !== "string") {
      return errorResponse("VALIDATION", "connectionId requis", 400);
    }

    // Bridge callback params (from callback_url query string, forwarded by front)
    const bridgeSuccess = body.success; // true/false from Bridge
    const bridgeItemId = body.item_id as string | undefined; // Bridge item ID
    const bridgeStep = body.step as string | undefined; // e.g. "item_created", "sca"
    const bridgeSource = body.source as string | undefined; // e.g. "connect"
    const bridgeContext = body.context as string | undefined;
    const bridgeUserUuid = body.user_uuid as string | undefined;

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

    // Determine internal status from Bridge callback params
    // IMPORTANT: never assume success — only explicit success=true counts
    const isExplicitSuccess = bridgeSuccess === true || bridgeSuccess === "true";
    const isExplicitFailure = bridgeSuccess === false || bridgeSuccess === "false";
    let newInternalStatus: string;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    if (isExplicitSuccess) {
      newInternalStatus = "active";
    } else if (bridgeStep === "consent_declined" || bridgeContext === "consent_declined") {
      newInternalStatus = "error";
      errorCode = "CONSENT_DECLINED";
      errorMessage = "L'utilisateur a refusé le consentement bancaire";
    } else if (bridgeStep === "sca_failed" || bridgeContext === "sca_failed") {
      newInternalStatus = "error";
      errorCode = "SCA_FAILED";
      errorMessage = "Authentification forte (SCA) échouée";
    } else if (isExplicitFailure) {
      newInternalStatus = "error";
      errorCode = "BRIDGE_CONNECT_FAILED";
      errorMessage = `Échec Connect Bridge (step=${bridgeStep ?? "unknown"})`;
    } else {
      // Ambiguous: success param absent — do NOT assume success, keep pending for verification
      newInternalStatus = "pending";
      errorCode = "CALLBACK_AMBIGUOUS";
      errorMessage = "Retour Bridge sans confirmation explicite de succès";
    }

    const updatePayload: Record<string, unknown> = {
      status: newInternalStatus,
      provider_status: bridgeStep ?? (isSuccess ? "success" : "failed"),
      updated_at: new Date().toISOString(),
    };

    // Store Bridge item_id if returned
    if (bridgeItemId) {
      updatePayload.external_item_id = bridgeItemId;
    }

    if (errorCode) {
      updatePayload.error_code = errorCode;
      updatePayload.error_message = errorMessage;
      updatePayload.last_error_at = new Date().toISOString();
    } else {
      updatePayload.error_code = null;
      updatePayload.error_message = null;
    }

    updatePayload.provider_last_payload = {
      success: bridgeSuccess,
      item_id: bridgeItemId,
      step: bridgeStep,
      source: bridgeSource,
      context: bridgeContext,
      user_uuid: bridgeUserUuid,
      processed_at: new Date().toISOString(),
    };

    await serviceClient.from("bank_connections")
      .update(updatePayload)
      .eq("id", connectionId);

    // Activity log (best effort)
    try {
      await serviceClient.from("activity_log").insert({
        actor_id: userId,
        actor_type: "user",
        agency_id: profile.agency_id,
        module: "tresorerie",
        entity_type: "bank_connection",
        entity_id: connectionId,
        action: `bank_connection.bridge_callback.${isSuccess ? "success" : "failed"}`,
        metadata: {
          success: bridgeSuccess,
          item_id: bridgeItemId,
          step: bridgeStep,
          source: bridgeSource,
        },
      });
    } catch (e) {
      console.error("[CALLBACK_LOG_FAILED]", e);
    }

    return successResponse({
      connectionId,
      status: newInternalStatus,
      itemId: bridgeItemId ?? null,
      needsSync: isSuccess,
    });

  } catch (err) {
    console.error("[TREASURY_CALLBACK_ERROR]", err instanceof Error ? err.message : err);
    return errorResponse("INTERNAL", "Erreur serveur inattendue", 500);
  }
});
