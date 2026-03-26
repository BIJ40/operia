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
  email?: string;
}

const TREASURY_WRITE_ALLOWED_ROLES = new Set([
  "franchisee_admin",
  "franchisor_admin",
  "platform_admin",
  "superadmin",
]);

const BRIDGE_API_BASE = "https://api.bridgeapi.io";

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
 * Call Bridge API v3 with proper headers.
 * If accessToken is provided, sends Bearer authorization (user-scoped calls).
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
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return errorResponse("AUTH", "Token invalide ou expiré", 401);
  }

  const userId = userData.user.id;
  const userEmail = userData.user.email ?? undefined;
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
    ctx: {
      userId,
      agencyId: profile.agency_id,
      globalRole: profile.global_role ?? "base_user",
      email: userEmail,
    },
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
// Bridge v3 aggregation helpers
// ═══════════════════════════════════════════════════════════

/**
 * Get or create a Bridge user via POST /v3/aggregation/users.
 * Stores the mapping in bridge_user_mappings.
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

  // Create Bridge user via v3 aggregation endpoint
  const externalUserId = `operia_${ctx.agencyId}_${ctx.userId}`;
  const resp = await bridgeRequest("/v3/aggregation/users", {
    method: "POST",
    body: {
      external_user_id: externalUserId,
      email: ctx.email ?? `${externalUserId}@operia.app`,
    },
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
    bridge_user_email: bridgeUser.email ?? ctx.email ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,agency_id" });

  return { bridgeUserUuid: bridgeUser.uuid };
}

/**
 * Get a Bridge authorization token for a specific user.
 * POST /v3/aggregation/authorization/token
 * Returns an access_token valid ~2h, required for connect sessions and data fetching.
 */
async function getBridgeAccessToken(
  bridgeUserUuid: string,
  creds: { clientId: string; clientSecret: string }
): Promise<{ accessToken: string } | Response> {
  const resp = await bridgeRequest("/v3/aggregation/authorization/token", {
    method: "POST",
    body: { user_uuid: bridgeUserUuid },
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
  });

  if (!resp.ok) {
    console.error("[BRIDGE_AUTH_TOKEN_FAILED]", resp.data);
    return errorResponse("BRIDGE_ERROR", `Échec obtention token Bridge (${resp.status})`, 502);
  }

  const tokenData = resp.data as { access_token?: string };
  if (!tokenData.access_token) {
    return errorResponse("BRIDGE_ERROR", "Token Bridge invalide (pas d'access_token)", 502);
  }

  return { accessToken: tokenData.access_token };
}

// ═══════════════════════════════════════════════════════════
// Action: CREATE — real Bridge Connect session (v3)
// ═══════════════════════════════════════════════════════════

async function handleCreate(
  serviceClient: ReturnType<typeof createClient>,
  ctx: UserContext,
  body: Record<string, unknown>
): Promise<Response> {
  const { displayName, callbackUrl: bodyCallbackUrl } = body;

  if (!displayName || typeof displayName !== "string" || displayName.trim().length < 2) {
    return errorResponse("VALIDATION", "Nom de connexion invalide (minimum 2 caractères)", 400);
  }

  const creds = getBridgeCredentials();
  if (!creds) {
    return errorResponse("BRIDGE_NOT_CONFIGURED", "Bridge n'est pas configuré (secrets manquants)", 503);
  }

  // 1. Ensure Bridge user (v3)
  const userResult = await ensureBridgeUser(serviceClient, ctx, creds);
  if (userResult instanceof Response) return userResult;
  const { bridgeUserUuid } = userResult;

  // 2. Get authorization token for this user
  const tokenResult = await getBridgeAccessToken(bridgeUserUuid, creds);
  if (tokenResult instanceof Response) return tokenResult;
  const { accessToken } = tokenResult;

  // 3. Create internal connection record
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

  // 4. Create Bridge Connect session via v3
  const callbackUrlValue = typeof bodyCallbackUrl === "string" && bodyCallbackUrl
    ? bodyCallbackUrl
    : Deno.env.get("BRIDGE_CALLBACK_URL") ?? "https://operiav2.lovable.app/?tab=pilotage.tresorerie&bridge_callback=1";

  const userEmail = ctx.email ?? `operia_${ctx.agencyId}_${ctx.userId}@operia.app`;

  const sessionResp = await bridgeRequest("/v3/aggregation/connect-sessions", {
    method: "POST",
    body: {
      callback_url: callbackUrlValue,
      user_email: userEmail,
    },
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    accessToken, // Bearer token required for connect session
  });

  if (!sessionResp.ok) {
    console.error("[BRIDGE_CONNECT_SESSION_FAILED]", sessionResp.data);
    await serviceClient.from("bank_connections")
      .update({
        status: "error",
        error_code: "BRIDGE_SESSION_FAIL",
        error_message: JSON.stringify(sessionResp.data).slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    return errorResponse("BRIDGE_ERROR", `Échec création session Bridge Connect (${sessionResp.status})`, 502);
  }

  const session = sessionResp.data as { id?: string; url?: string; connect_url?: string };
  const connectUrl = session.url ?? session.connect_url;
  const sessionId = session.id;

  if (!connectUrl) {
    await serviceClient.from("bank_connections")
      .update({ status: "error", error_code: "BRIDGE_SESSION_INVALID", updated_at: new Date().toISOString() })
      .eq("id", connection.id);
    return errorResponse("BRIDGE_ERROR", "Réponse Bridge Connect invalide (pas d'URL)", 502);
  }

  // 5. Update connection with session info
  await serviceClient.from("bank_connections")
    .update({
      redirect_session_id: sessionId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  await safeActivityLog(serviceClient, {
    actorId: ctx.userId,
    agencyId: ctx.agencyId,
    action: "bank_connection.bridge_session_created",
    entityId: connection.id,
    entityLabel: (displayName as string).trim(),
    metadata: { bridgeSessionId: sessionId, role: ctx.globalRole },
  });

  return successResponse({
    connectionId: connection.id,
    bridgeConnectUrl: connectUrl,
    bridgeSessionId: sessionId,
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

  // If Bridge item exists, try to delete it via v3
  const creds = getBridgeCredentials();
  if (creds && conn.external_item_id && conn.external_user_id) {
    try {
      const tokenResult = await getBridgeAccessToken(conn.external_user_id as string, creds);
      if (!(tokenResult instanceof Response)) {
        await bridgeRequest(`/v3/aggregation/items/${conn.external_item_id}`, {
          method: "DELETE",
          clientId: creds.clientId,
          clientSecret: creds.clientSecret,
          accessToken: tokenResult.accessToken,
        });
      }
    } catch (e) {
      console.error("[BRIDGE_DELETE_ITEM_WARN]", e);
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
// Action: SYNC — real Bridge v3 sync
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

  const bridgeUserUuid = conn.external_user_id as string | null;
  if (!bridgeUserUuid) {
    return errorResponse("VALIDATION", "Connexion sans utilisateur Bridge associé", 400);
  }

  // Get access token for data fetching
  const tokenResult = await getBridgeAccessToken(bridgeUserUuid, creds);
  if (tokenResult instanceof Response) return tokenResult;
  const { accessToken } = tokenResult;

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
    // ── 1. Fetch accounts via GET /v3/aggregation/accounts ──
    const accountsResp = await bridgeRequest("/v3/aggregation/accounts", {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      accessToken,
    });

    if (!accountsResp.ok) {
      throw new Error(`Bridge accounts fetch failed (${accountsResp.status}): ${JSON.stringify(accountsResp.data)}`);
    }

    const accountsData = accountsResp.data as { resources?: unknown[] };
    const bridgeAccounts = (accountsData.resources ?? []) as Array<{
      id: number;
      item_id?: number;
      name: string;
      balance: number;
      iban?: string;
      currency_code?: string;
      type?: string;
      bank_id?: number;
      instant_balance?: { amount: number };
      status?: number;
      status_code_info?: string;
    }>;

    if (bridgeAccounts.length === 0) {
      await serviceClient.from("bank_connections")
        .update({
          status: "pending",
          provider_status: "no_accounts",
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.connectionId);

      if (syncLogId) {
        await serviceClient.from("bank_sync_logs")
          .update({ status: "success", finished_at: new Date().toISOString(), items_received: 0 })
          .eq("id", syncLogId);
      }

      return successResponse({ message: "Aucun compte Bridge trouvé. Le consentement est peut-être en attente." });
    }

    itemsReceived += bridgeAccounts.length;

    // Extract item_id from the first account if available
    const firstItemId = bridgeAccounts[0]?.item_id;
    if (firstItemId) {
      await serviceClient.from("bank_connections")
        .update({
          external_item_id: String(firstItemId),
          provider_status: bridgeAccounts[0]?.status_code_info ?? String(bridgeAccounts[0]?.status ?? ""),
        })
        .eq("id", body.connectionId);
    }

    // ── 2. Upsert accounts ──
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

    // ── 3. Fetch transactions via GET /v3/aggregation/transactions ──
    // Paginate with starting_after cursor
    let hasMoreTx = true;
    let startingAfter: string | undefined;

    while (hasMoreTx) {
      let txPath = "/v3/aggregation/transactions?limit=100";
      if (startingAfter) txPath += `&starting_after=${startingAfter}`;

      // If we have a since date from last sync, use it for incremental
      const lastSuccessSync = conn.last_success_sync_at as string | null;
      if (lastSuccessSync) {
        const sinceDate = lastSuccessSync.split("T")[0]; // YYYY-MM-DD
        txPath += `&since=${sinceDate}`;
      }

      const txResp = await bridgeRequest(txPath, {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        accessToken,
      });

      if (!txResp.ok) {
        console.error("[BRIDGE_TX_FETCH_WARN]", txResp.status, txResp.data);
        break;
      }

      const txData = txResp.data as {
        resources?: Array<{
          id: number;
          account_id: number;
          clean_description?: string;
          raw_description?: string;
          amount: number;
          date: string;
          value_date?: string;
          currency_code?: string;
          category_id?: number;
          is_future?: boolean;
        }>;
        pagination?: { next_uri?: string };
      };

      const transactions = txData.resources ?? [];
      itemsReceived += transactions.length;

      for (const tx of transactions) {
        const extTxId = String(tx.id);

        // Deduplicate by external_transaction_id
        const { data: existingTx } = await serviceClient
          .from("bank_transactions")
          .select("id")
          .eq("external_transaction_id", extTxId)
          .maybeSingle();

        if (existingTx) {
          itemsUpdated++;
          continue;
        }

        // Find internal account by bridge account_id
        const { data: internalAccount } = await serviceClient
          .from("bank_accounts")
          .select("id")
          .eq("external_account_id", String(tx.account_id))
          .eq("bank_connection_id", body.connectionId)
          .maybeSingle();

        if (!internalAccount) continue;

        await serviceClient.from("bank_transactions").insert({
          bank_account_id: internalAccount.id,
          external_transaction_id: extTxId,
          booking_date: tx.date,
          value_date: tx.value_date ?? null,
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

      // Pagination: check for next page
      if (txData.pagination?.next_uri && transactions.length > 0) {
        startingAfter = String(transactions[transactions.length - 1].id);
      } else {
        hasMoreTx = false;
      }
    }

    // ── 4. Finalize ──
    await serviceClient.from("bank_connections")
      .update({
        status: "active",
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

    return successResponse({ itemsReceived, itemsCreated, itemsUpdated, status: "active" });

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
