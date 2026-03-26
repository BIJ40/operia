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
  | "BRIDGE_ERROR"
  | "BRIDGE_NOT_CONFIGURED"
  | "UNKNOWN_ACTION"
  | "INTERNAL";

interface UserContext {
  userId: string;
  agencyId: string;
  globalRole: string;
}

const TREASURY_WRITE_ALLOWED_ROLES = new Set([
  "franchisee_admin",
  "franchisor_admin",
  "platform_admin",
  "superadmin",
]);

const BRIDGE_API_BASE = "https://api.bridgeapi.io";
const BRIDGE_SANDBOX_BASE = "https://api.bridgeapi.io"; // Same base, sandbox via credentials

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function errorResponse(code: ErrorCode, message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function successResponse(data?: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, ...(data !== undefined ? { data } : {}) }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function isTreasuryManagerRole(role: string | null): boolean {
  if (!role) return false;
  return TREASURY_WRITE_ALLOWED_ROLES.has(role);
}

function getBridgeCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = Deno.env.get("BRIDGE_CLIENT_ID");
  const clientSecret = Deno.env.get("BRIDGE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * Call Bridge API with proper auth headers
 */
async function bridgeRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    clientId: string;
    clientSecret: string;
    accessToken?: string;
  }
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Bridge-Version": "2025-01-15",
    "Client-Id": options.clientId,
    "Client-Secret": options.clientSecret,
  };
  if (options.accessToken) {
    headers["Authorization"] = `Bearer ${options.accessToken}`;
  }

  const resp = await fetch(`${BRIDGE_API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

// ═══════════════════════════════════════════════════════════
// Auth context
// ═══════════════════════════════════════════════════════════

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
    return errorResponse("NO_AGENCY", "Aucune agence associée", 400);
  }

  return {
    ctx: { userId, agencyId: profile.agency_id, globalRole: profile.global_role ?? "base_user" },
    serviceClient,
  };
}

function assertTreasuryWriteAccess(ctx: UserContext): Response | null {
  if (!isTreasuryManagerRole(ctx.globalRole)) {
    return errorResponse("FORBIDDEN_ROLE", "Accès réservé aux dirigeants ou administrateurs autorisés (N2+).", 403);
  }
  return null;
}

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
    .select("*")
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
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ═══════════════════════════════════════════════════════════
// Bridge user management
// ═══════════════════════════════════════════════════════════

/**
 * Get or create a Bridge user for the current Operia user.
 * Returns the bridge_user_uuid.
 */
async function ensureBridgeUser(
  serviceClient: ReturnType<typeof createClient>,
  ctx: UserContext,
  creds: { clientId: string; clientSecret: string }
): Promise<{ bridgeUserUuid: string } | Response> {
  // Check existing mapping
  const { data: existing } = await serviceClient
    .from("bridge_user_mappings")
    .select("bridge_user_uuid")
    .eq("user_id", ctx.userId)
    .eq("agency_id", ctx.agencyId)
    .maybeSingle();

  if (existing?.bridge_user_uuid) {
    return { bridgeUserUuid: existing.bridge_user_uuid };
  }

  // Create Bridge user
  const externalUserId = `operia_${ctx.agencyId}_${ctx.userId}`;
  const resp = await bridgeRequest("/v2/users", {
    method: "POST",
    body: { external_user_id: externalUserId },
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
  });

  if (!resp.ok) {
    console.error("[BRIDGE_CREATE_USER_FAILED]", resp.data);
    return errorResponse("BRIDGE_ERROR", `Échec création utilisateur Bridge (${resp.status})`, 502);
  }

  const bridgeUser = resp.data as { uuid: string; email?: string };
  if (!bridgeUser.uuid) {
    return errorResponse("BRIDGE_ERROR", "Réponse Bridge invalide (pas de uuid)", 502);
  }

  // Store mapping
  await serviceClient.from("bridge_user_mappings").upsert({
    user_id: ctx.userId,
    agency_id: ctx.agencyId,
    bridge_user_uuid: bridgeUser.uuid,
    bridge_user_email: bridgeUser.email ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,agency_id" });

  return { bridgeUserUuid: bridgeUser.uuid };
}

// ═══════════════════════════════════════════════════════════
// Action: CREATE — real Bridge Connect session
// ═══════════════════════════════════════════════════════════

async function handleCreate(
  serviceClient: ReturnType<typeof createClient>,
  ctx: UserContext,
  body: Record<string, unknown>
): Promise<Response> {
  const { displayName, redirectUrl } = body;

  if (!displayName || typeof displayName !== "string" || displayName.trim().length < 2) {
    return errorResponse("VALIDATION", "Nom de connexion invalide (minimum 2 caractères)", 400);
  }

  const creds = getBridgeCredentials();
  if (!creds) {
    return errorResponse("BRIDGE_NOT_CONFIGURED", "Bridge n'est pas configuré (secrets manquants)", 503);
  }

  // 1. Ensure Bridge user
  const userResult = await ensureBridgeUser(serviceClient, ctx, creds);
  if (userResult instanceof Response) return userResult;
  const { bridgeUserUuid } = userResult;

  // 2. Create internal connection record first
  const { data: connection, error: insertErr } = await serviceClient
    .from("bank_connections")
    .insert({
      agency_id: ctx.agencyId,
      user_id: ctx.userId,
      display_name: (displayName as string).trim(),
      provider: "bridge",
      status: "connecting",
      external_user_id: bridgeUserUuid,
    })
    .select()
    .single();

  if (insertErr || !connection) {
    console.error("[TREASURY_DB_ERROR] create:", insertErr);
    return errorResponse("DB", "Erreur lors de la création de la connexion", 500);
  }

  // 3. Create Bridge Connect session
  const callbackUrl = typeof redirectUrl === "string" && redirectUrl
    ? redirectUrl
    : Deno.env.get("BRIDGE_REDIRECT_URL") ?? "https://operiav2.lovable.app/?tab=pilotage.tresorerie&bridge_callback=1";

  const sessionResp = await bridgeRequest("/v3/aggregation/connect-sessions", {
    method: "POST",
    body: {
      user_uuid: bridgeUserUuid,
      redirect_url: callbackUrl,
      // default mode = payment accounts (most robust for PME treasury)
    },
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
  });

  if (!sessionResp.ok) {
    console.error("[BRIDGE_CONNECT_SESSION_FAILED]", sessionResp.data);
    // Rollback connection to error
    await serviceClient.from("bank_connections")
      .update({ status: "error", error_code: "BRIDGE_SESSION_FAIL", error_message: JSON.stringify(sessionResp.data), updated_at: new Date().toISOString() })
      .eq("id", connection.id);
    return errorResponse("BRIDGE_ERROR", `Échec création session Bridge Connect (${sessionResp.status})`, 502);
  }

  const session = sessionResp.data as { id: string; url: string };
  if (!session.url || !session.id) {
    await serviceClient.from("bank_connections")
      .update({ status: "error", error_code: "BRIDGE_SESSION_INVALID", updated_at: new Date().toISOString() })
      .eq("id", connection.id);
    return errorResponse("BRIDGE_ERROR", "Réponse Bridge Connect invalide", 502);
  }

  // 4. Update connection with session info
  await serviceClient.from("bank_connections")
    .update({
      redirect_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  await safeActivityLog(serviceClient, {
    actorId: ctx.userId,
    agencyId: ctx.agencyId,
    action: "bank_connection.bridge_session_created",
    entityId: connection.id,
    entityLabel: (displayName as string).trim(),
    metadata: { bridgeSessionId: session.id, role: ctx.globalRole },
  });

  return successResponse({
    connectionId: connection.id,
    bridgeConnectUrl: session.url,
    bridgeSessionId: session.id,
  });
}

// ═══════════════════════════════════════════════════════════
// Action: DISCONNECT
// ═══════════════════════════════════════════════════════════

async function handleDisconnect(
  serviceClient: ReturnType<typeof createClient>,
  ctx: UserContext,
  body: Record<string, unknown>
): Promise<Response> {
  const ownership = await assertConnectionOwnership(serviceClient, body.connectionId as string, ctx.agencyId);
  if (ownership instanceof Response) return ownership;
  const { conn } = ownership;

  // If Bridge item exists, try to delete it
  const creds = getBridgeCredentials();
  if (creds && conn.external_item_id) {
    try {
      await bridgeRequest(`/v2/items/${conn.external_item_id}/delete`, {
        method: "POST",
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
      });
    } catch (e) {
      console.error("[BRIDGE_DELETE_ITEM_WARN]", e);
      // Non-blocking
    }
  }

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

// ═══════════════════════════════════════════════════════════
// Action: SYNC — triggers real Bridge sync
// ═══════════════════════════════════════════════════════════

async function handleSync(
  serviceClient: ReturnType<typeof createClient>,
  ctx: UserContext,
  body: Record<string, unknown>
): Promise<Response> {
  const ownership = await assertConnectionOwnership(serviceClient, body.connectionId as string, ctx.agencyId);
  if (ownership instanceof Response) return ownership;
  const { conn } = ownership;

  const creds = getBridgeCredentials();
  if (!creds) {
    return errorResponse("BRIDGE_NOT_CONFIGURED", "Bridge n'est pas configuré", 503);
  }

  if (!conn.external_user_id) {
    return errorResponse("VALIDATION", "Connexion sans utilisateur Bridge associé", 400);
  }

  // Mark syncing
  await serviceClient.from("bank_connections")
    .update({ status: "syncing", last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", body.connectionId);

  // Create sync log
  const { data: syncLog } = await serviceClient.from("bank_sync_logs").insert({
    bank_connection_id: body.connectionId,
    sync_type: "full",
    status: "started",
  }).select("id").single();

  const syncLogId = syncLog?.id;
  let itemsReceived = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;

  try {
    // 1. Fetch items for user
    const itemsResp = await bridgeRequest(`/v2/items?user_uuid=${conn.external_user_id}`, {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    });

    if (!itemsResp.ok) {
      throw new Error(`Bridge items fetch failed (${itemsResp.status}): ${JSON.stringify(itemsResp.data)}`);
    }

    const items = ((itemsResp.data as { resources?: unknown[] })?.resources ?? []) as Array<{
      id: number;
      status: number;
      status_code_info?: string;
    }>;

    if (items.length === 0) {
      // No items yet — connection may still be pending
      await serviceClient.from("bank_connections")
        .update({
          status: "pending",
          provider_status: "no_items",
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.connectionId);

      if (syncLogId) {
        await serviceClient.from("bank_sync_logs")
          .update({ status: "success", finished_at: new Date().toISOString(), items_received: 0 })
          .eq("id", syncLogId);
      }

      return successResponse({ message: "Aucun item Bridge trouvé. Le consentement bancaire est peut-être en attente." });
    }

    // Use first item (standard case for single-bank connection)
    const item = items[0];
    await serviceClient.from("bank_connections")
      .update({
        external_item_id: String(item.id),
        provider_status: item.status_code_info ?? String(item.status),
        provider_last_payload: item,
      })
      .eq("id", body.connectionId);

    // 2. Fetch accounts
    const accountsResp = await bridgeRequest(`/v2/accounts?item_id=${item.id}`, {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
    });

    if (!accountsResp.ok) {
      throw new Error(`Bridge accounts fetch failed (${accountsResp.status})`);
    }

    const bridgeAccounts = ((accountsResp.data as { resources?: unknown[] })?.resources ?? []) as Array<{
      id: number;
      name: string;
      balance: number;
      iban?: string;
      currency_code?: string;
      type?: string;
      bank_id?: number;
      instant_balance?: { amount: number };
      status?: number;
    }>;

    itemsReceived += bridgeAccounts.length;

    // Upsert accounts
    for (const ba of bridgeAccounts) {
      const extId = String(ba.id);
      const ibanMasked = ba.iban ? ba.iban.replace(/(.{4})(.*)(.{4})/, "$1****$3") : null;
      const accountType = mapBridgeAccountType(ba.type);

      const { data: existing } = await serviceClient
        .from("bank_accounts")
        .select("id")
        .eq("external_account_id", extId)
        .eq("bank_connection_id", body.connectionId)
        .maybeSingle();

      if (existing) {
        await serviceClient.from("bank_accounts")
          .update({
            balance: ba.balance ?? 0,
            available_balance: ba.instant_balance?.amount ?? null,
            instant_balance: ba.instant_balance?.amount ?? null,
            balance_updated_at: new Date().toISOString(),
            sync_status: "synced",
            provider_account_type: ba.type ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        itemsUpdated++;
      } else {
        await serviceClient.from("bank_accounts").insert({
          bank_connection_id: body.connectionId as string,
          external_account_id: extId,
          bank_name: `Banque #${ba.bank_id ?? "?"}`,
          account_label: ba.name ?? "Compte",
          iban_masked: ibanMasked,
          currency: ba.currency_code ?? "EUR",
          account_type: accountType,
          balance: ba.balance ?? 0,
          available_balance: ba.instant_balance?.amount ?? null,
          instant_balance: ba.instant_balance?.amount ?? null,
          balance_updated_at: new Date().toISOString(),
          sync_status: "synced",
          provider_account_type: ba.type ?? null,
        });
        itemsCreated++;
      }
    }

    // 3. Fetch transactions for each account
    for (const ba of bridgeAccounts) {
      const txResp = await bridgeRequest(`/v2/accounts/${ba.id}/transactions?limit=500`, {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
      });

      if (!txResp.ok) {
        console.error(`[BRIDGE_TX_FETCH_WARN] account ${ba.id}:`, txResp.status);
        continue;
      }

      const transactions = ((txResp.data as { resources?: unknown[] })?.resources ?? []) as Array<{
        id: number;
        clean_description?: string;
        raw_description?: string;
        amount: number;
        date: string;
        currency_code?: string;
        category_id?: number;
        is_future?: boolean;
      }>;

      // Get internal account id
      const { data: internalAccount } = await serviceClient
        .from("bank_accounts")
        .select("id")
        .eq("external_account_id", String(ba.id))
        .eq("bank_connection_id", body.connectionId)
        .single();

      if (!internalAccount) continue;

      itemsReceived += transactions.length;

      for (const tx of transactions) {
        const extTxId = String(tx.id);

        const { data: existingTx } = await serviceClient
          .from("bank_transactions")
          .select("id")
          .eq("external_transaction_id", extTxId)
          .maybeSingle();

        if (existingTx) {
          itemsUpdated++;
          continue; // Don't overwrite existing transactions
        }

        await serviceClient.from("bank_transactions").insert({
          bank_account_id: internalAccount.id,
          external_transaction_id: extTxId,
          booking_date: tx.date,
          label: tx.clean_description ?? tx.raw_description ?? "Transaction",
          raw_label: tx.raw_description ?? null,
          amount: Math.abs(tx.amount),
          currency: tx.currency_code ?? "EUR",
          transaction_type: tx.amount >= 0 ? "credit" : "debit",
          provider_category: tx.category_id ? String(tx.category_id) : null,
          reconciliation_status: "unmatched",
          raw_payload: tx,
        });
        itemsCreated++;
      }
    }

    // 4. Finalize
    const finalStatus = mapBridgeItemStatus(items[0].status);
    await serviceClient.from("bank_connections")
      .update({
        status: finalStatus,
        last_success_sync_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.connectionId);

    if (syncLogId) {
      await serviceClient.from("bank_sync_logs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          items_received: itemsReceived,
          items_created: itemsCreated,
          items_updated: itemsUpdated,
        })
        .eq("id", syncLogId);
    }

    await safeActivityLog(serviceClient, {
      actorId: ctx.userId,
      agencyId: ctx.agencyId,
      action: "bank_connection.sync_success",
      entityId: body.connectionId as string,
      entityLabel: conn.display_name as string,
      metadata: { itemsReceived, itemsCreated, itemsUpdated, role: ctx.globalRole },
    });

    return successResponse({ itemsReceived, itemsCreated, itemsUpdated, status: finalStatus });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[TREASURY_SYNC_ERROR]", errMsg);

    await serviceClient.from("bank_connections")
      .update({
        status: "error",
        last_error_at: new Date().toISOString(),
        error_code: "SYNC_FAILED",
        error_message: errMsg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.connectionId);

    if (syncLogId) {
      await serviceClient.from("bank_sync_logs")
        .update({ status: "error", finished_at: new Date().toISOString(), error_message: errMsg.slice(0, 500) })
        .eq("id", syncLogId);
    }

    return errorResponse("BRIDGE_ERROR", `Erreur synchronisation Bridge: ${errMsg.slice(0, 200)}`, 502);
  }
}

// ═══════════════════════════════════════════════════════════
// Bridge mapping helpers
// ═══════════════════════════════════════════════════════════

function mapBridgeAccountType(bridgeType?: string): string {
  if (!bridgeType) return "checking";
  const t = bridgeType.toLowerCase();
  if (t.includes("saving") || t.includes("livret")) return "savings";
  if (t.includes("card") || t.includes("carte")) return "card";
  if (t.includes("loan") || t.includes("pret") || t.includes("credit")) return "loan";
  if (t.includes("checking") || t.includes("courant")) return "checking";
  return "other";
}

/**
 * Map Bridge item status code to internal connection status.
 * Bridge status codes: 0 = OK, 402 = needs user action, 429 = rate limited, 1003 = needs reauth, etc.
 */
function mapBridgeItemStatus(bridgeStatus: number): string {
  if (bridgeStatus === 0) return "active";
  if (bridgeStatus === 402 || bridgeStatus === 1003 || bridgeStatus === 1010) return "requires_reauth";
  if (bridgeStatus === 429) return "error"; // rate limited
  if (bridgeStatus >= 1000) return "error";
  return "active";
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

    const authResult = await getAuthenticatedUserContext(req, supabaseUrl, anonKey, serviceKey);
    if (authResult instanceof Response) return authResult;
    const { ctx, serviceClient } = authResult;

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

    const roleGuard = assertTreasuryWriteAccess(ctx);
    if (roleGuard) return roleGuard;

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
