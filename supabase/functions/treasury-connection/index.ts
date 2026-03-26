import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════
// CORS
// ═══════════════════════════════════════════════════════════
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════
type ErrorCode =
  | "AUTH"
  | "NO_AGENCY"
  | "FORBIDDEN_ROLE"
  | "FORBIDDEN_SCOPE"
  | "VALIDATION"
  | "NOT_FOUND"
  | "DB"
  | "UNKNOWN_ACTION"
  | "INTERNAL";

interface UserContext {
  userId: string;
  agencyId: string;
  globalRole: string;
}

/**
 * Allowlist explicite des rôles autorisés pour les mutations trésorerie.
 * 
 * Décision métier : franchisor_user (N3) est EXCLU car son rôle réseau
 * ne justifie pas un accès aux opérations bancaires d'agence.
 * Seuls les dirigeants d'agence et les administrateurs sont autorisés.
 */
const TREASURY_WRITE_ALLOWED_ROLES = new Set([
  "franchisee_admin",  // N2 — dirigeant agence
  "franchisor_admin",  // N4 — directeur réseau
  "platform_admin",    // N5 — admin plateforme
  "superadmin",        // N6 — super admin
]);

/**
 * Vérifie si un rôle global est dans l'allowlist trésorerie.
 */
function isTreasuryManagerRole(role: string | null): boolean {
  if (!role) return false;
  return TREASURY_WRITE_ALLOWED_ROLES.has(role);
}

/**
 * Récupère le contexte utilisateur authentifié : userId, agencyId, globalRole.
 * Lève une Response HTTP en cas d'échec.
 */
async function getAuthenticatedUserContext(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceKey: string
): Promise<{ ctx: UserContext; serviceClient: ReturnType<typeof createClient> } | Response> {
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
    return errorResponse("AUTH", "Token invalide ou expiré", 401);
  }

  const userId = claimsData.claims.sub as string;
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileErr } = await serviceClient
    .from("profiles")
    .select("agency_id, global_role")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    return errorResponse("NO_AGENCY", "Profil utilisateur introuvable", 400);
  }

  if (!profile.agency_id) {
    return errorResponse("NO_AGENCY", "Aucune agence associée à cet utilisateur", 400);
  }

  return {
    ctx: {
      userId,
      agencyId: profile.agency_id,
      globalRole: profile.global_role ?? "base_user",
    },
    serviceClient,
  };
}

/**
 * Vérifie que l'utilisateur a le niveau de rôle N2+ requis pour les mutations trésorerie.
 * Retourne une Response 403 si refusé, null si autorisé.
 */
function assertTreasuryWriteAccess(ctx: UserContext): Response | null {
  if (!isTreasuryManagerRole(ctx.globalRole)) {
    return errorResponse(
      "FORBIDDEN_ROLE",
      "Accès réservé aux dirigeants ou administrateurs autorisés (niveau N2+).",
      403
    );
  }
  return null;
}

/**
 * Vérifie qu'une connexion bancaire existe et appartient à l'agence de l'utilisateur.
 */
async function assertConnectionOwnership(
  serviceClient: ReturnType<typeof createClient>,
  connectionId: string,
  agencyId: string
): Promise<{ conn: Record<string, unknown> } | Response> {
  if (!connectionId || typeof connectionId !== "string") {
    return errorResponse("VALIDATION", "connectionId requis", 400);
  }

  const { data: conn, error } = await serviceClient
    .from("bank_connections")
    .select("id, agency_id, user_id, display_name, status")
    .eq("id", connectionId)
    .single();

  if (error || !conn) {
    return errorResponse("NOT_FOUND", "Connexion bancaire introuvable", 404);
  }

  if (conn.agency_id !== agencyId) {
    return errorResponse("FORBIDDEN_SCOPE", "Cette connexion n'appartient pas à votre agence", 403);
  }

  return { conn };
}

/**
 * Écrit dans activity_log de manière non-bloquante (best effort).
 * Un échec de logging ne doit jamais casser l'action principale.
 */
async function safeActivityLog(
  serviceClient: ReturnType<typeof createClient>,
  params: {
    actorId: string;
    agencyId: string;
    action: string;
    entityId?: string;
    entityLabel?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await serviceClient.from("activity_log").insert({
      actor_id: params.actorId,
      actor_type: "user",
      agency_id: params.agencyId,
      module: "tresorerie",
      entity_type: "bank_connection",
      entity_id: params.entityId ?? null,
      entity_label: params.entityLabel ?? null,
      action: params.action,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("[TREASURY_ACTIVITY_LOG_FAILED]", {
      action: params.action,
      userId: params.actorId,
      agencyId: params.agencyId,
      entityId: params.entityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ═══════════════════════════════════════════════════════════
// Action handlers
// ═══════════════════════════════════════════════════════════

async function handleCreate(
  serviceClient: ReturnType<typeof createClient>,
  ctx: UserContext,
  body: Record<string, unknown>
): Promise<Response> {
  const { displayName, provider } = body;

  if (!displayName || typeof displayName !== "string" || displayName.trim().length < 2) {
    return errorResponse("VALIDATION", "Nom de connexion invalide (minimum 2 caractères)", 400);
  }

  const { data: connection, error: insertErr } = await serviceClient
    .from("bank_connections")
    .insert({
      agency_id: ctx.agencyId,
      user_id: ctx.userId,
      display_name: (displayName as string).trim(),
      provider: typeof provider === "string" && provider ? provider : "bridge",
      status: "pending",
    })
    .select()
    .single();

  if (insertErr) {
    console.error("[TREASURY_DB_ERROR] create:", insertErr);
    return errorResponse("DB", "Erreur lors de la création de la connexion", 500);
  }

  await safeActivityLog(serviceClient, {
    actorId: ctx.userId,
    agencyId: ctx.agencyId,
    action: "bank_connection.create",
    entityId: connection.id,
    entityLabel: (displayName as string).trim(),
    metadata: { provider: connection.provider, role: ctx.globalRole },
  });

  return successResponse(connection);
}

async function handleDisconnect(
  serviceClient: ReturnType<typeof createClient>,
  ctx: UserContext,
  body: Record<string, unknown>
): Promise<Response> {
  const ownership = await assertConnectionOwnership(
    serviceClient,
    body.connectionId as string,
    ctx.agencyId
  );
  if (ownership instanceof Response) return ownership;
  const { conn } = ownership;

  const { error: updateErr } = await serviceClient
    .from("bank_connections")
    .update({ status: "disconnected", updated_at: new Date().toISOString() })
    .eq("id", body.connectionId);

  if (updateErr) {
    console.error("[TREASURY_DB_ERROR] disconnect:", updateErr);
    return errorResponse("DB", "Erreur lors de la déconnexion", 500);
  }

  await safeActivityLog(serviceClient, {
    actorId: ctx.userId,
    agencyId: ctx.agencyId,
    action: "bank_connection.disconnect",
    entityId: body.connectionId as string,
    entityLabel: conn.display_name as string,
    metadata: { role: ctx.globalRole },
  });

  return successResponse();
}

async function handleSync(
  serviceClient: ReturnType<typeof createClient>,
  ctx: UserContext,
  body: Record<string, unknown>
): Promise<Response> {
  const ownership = await assertConnectionOwnership(
    serviceClient,
    body.connectionId as string,
    ctx.agencyId
  );
  if (ownership instanceof Response) return ownership;
  const { conn } = ownership;

  // Create sync log entry
  const { error: logErr } = await serviceClient.from("bank_sync_logs").insert({
    bank_connection_id: body.connectionId,
    sync_type: "full",
    status: "started",
  });

  if (logErr) {
    console.error("[TREASURY_DB_ERROR] sync_log insert:", logErr);
    // Non-bloquant : on continue quand même
  }

  // Update connection timestamp (real sync will come with provider)
  const { error: updateErr } = await serviceClient
    .from("bank_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      status: (conn.status as string) === "error" ? "pending" : conn.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.connectionId);

  if (updateErr) {
    console.error("[TREASURY_DB_ERROR] sync update:", updateErr);
    return errorResponse("DB", "Erreur lors de la synchronisation", 500);
  }

  await safeActivityLog(serviceClient, {
    actorId: ctx.userId,
    agencyId: ctx.agencyId,
    action: "bank_connection.sync",
    entityId: body.connectionId as string,
    entityLabel: conn.display_name as string,
    metadata: { role: ctx.globalRole, previousStatus: conn.status },
  });

  return successResponse({
    message: "Synchronisation enregistrée. Le provider bancaire n'est pas encore branché.",
  });
}

// ═══════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Auth + context ──
    const authResult = await getAuthenticatedUserContext(req, supabaseUrl, anonKey, serviceKey);
    if (authResult instanceof Response) return authResult;
    const { ctx, serviceClient } = authResult;

    // ── Parse body ──
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse("VALIDATION", "Corps de requête JSON invalide", 400);
    }

    const { action } = body;
    if (!action || typeof action !== "string") {
      return errorResponse("VALIDATION", "Le champ 'action' est requis", 400);
    }

    // ── Role guard for all write actions ──
    const roleGuard = assertTreasuryWriteAccess(ctx);
    if (roleGuard) return roleGuard;

    // ── Route to handler ──
    switch (action) {
      case "create":
        return await handleCreate(serviceClient, ctx, body);
      case "disconnect":
        return await handleDisconnect(serviceClient, ctx, body);
      case "sync":
        return await handleSync(serviceClient, ctx, body);
      default:
        return errorResponse("UNKNOWN_ACTION", `Action '${action}' inconnue`, 400);
    }
  } catch (err) {
    console.error("[TREASURY_INTERNAL_ERROR]", err instanceof Error ? err.message : err);
    return errorResponse("INTERNAL", "Erreur serveur inattendue", 500);
  }
});
