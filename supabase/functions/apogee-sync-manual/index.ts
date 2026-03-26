/**
 * APOGÉE SYNC MANUAL — Targeted Agency Refresh (v2.1)
 * 
 * v2.1: per-agency key, real versioning, stale detection
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { getUserContext, assertRoleAtLeast } from '../_shared/auth.ts';
import { secLog } from '../_shared/securityLog.ts';

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;
const API_CALL_TIMEOUT_MS = 30_000;
const BATCH_SIZE = 500;

const SYNC_ENDPOINTS = [
  { endpoint: 'apiGetProjects', table: 'projects_mirror', idField: 'id', refField: 'ref' },
  { endpoint: 'apiGetInterventions', table: 'interventions_mirror', idField: 'id' },
  { endpoint: 'apiGetDevis', table: 'devis_mirror', idField: 'id' },
  { endpoint: 'apiGetFactures', table: 'factures_mirror', idField: 'id' },
  { endpoint: 'apiGetUsers', table: 'users_mirror', idField: 'id' },
  { endpoint: 'apiGetClients', table: 'clients_mirror', idField: 'id' },
] as const;

const VALID_MODULES = ['projects', 'interventions', 'devis', 'factures', 'users', 'clients'];

type DiagnosticStage =
  | 'config'
  | 'auth'
  | 'request'
  | 'agency_lookup'
  | 'api_key_resolution'
  | 'sync_run_create'
  | 'endpoint_fetch'
  | 'endpoint_upsert'
  | 'sync_run_finalize'
  | 'unexpected';

function jsonResponse(req: Request, status: number, payload: Record<string, unknown>): Response {
  return withCors(req, new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

function diagnosticError(
  req: Request,
  status: number,
  stage: DiagnosticStage,
  message: string,
  diagnostics: Record<string, unknown> = {},
): Response {
  return jsonResponse(req, status, {
    success: false,
    error: {
      stage,
      message,
      diagnostics,
    },
  });
}

function extractErrorDetails(error: unknown): Record<string, unknown> {
  if (!error) return {};
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return {
      message: typeof record.message === 'string' ? record.message : String(error),
      code: record.code,
      details: record.details,
      hint: record.hint,
    };
  }
  return { message: String(error) };
}

function normalizeApogeePayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.results)) return record.results;
  }
  return [];
}

// ============================================================
// API KEY RESOLUTION
// ============================================================

async function resolveApiKey(
  supabase: ReturnType<typeof createClient>,
  agency: { api_key_ref?: string | null },
): Promise<{ apiKey: string; keySource: 'agency' | 'global' }> {
  if (agency.api_key_ref) {
    try {
      const { data } = await supabase
        .from('vault' as any)
        .select('decrypted_secret')
        .eq('name', agency.api_key_ref)
        .maybeSingle();
      if (data?.decrypted_secret) return { apiKey: data.decrypted_secret, keySource: 'agency' };
    } catch { /* fallback */ }

    const envKey = Deno.env.get(agency.api_key_ref);
    if (envKey) return { apiKey: envKey, keySource: 'agency' };
  }

  if (!APOGEE_API_KEY) throw new Error('No API key available');
  return { apiKey: APOGEE_API_KEY, keySource: 'global' };
}

// ============================================================
// HELPERS
// ============================================================

async function fetchApogeeEndpoint(agencySlug: string, endpoint: string, apiKey: string) {
  const url = `https://${agencySlug}.hc-apogee.fr/api/${endpoint}`;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_CALL_TIMEOUT_MS);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1))); continue; }
        return { data: [] as unknown[], error: `HTTP ${response.status}` };
      }
      const raw = await response.json();
      const normalized = normalizeApogeePayload(raw);
      if (!Array.isArray(raw) && normalized.length === 0) {
        return {
          data: [] as unknown[],
          error: 'Unexpected Apogée payload shape',
          details: {
            payloadType: typeof raw,
            hasItemsArray: Boolean(raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).items)),
            hasDataArray: Boolean(raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).data)),
            hasResultsArray: Boolean(raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).results)),
          },
        };
      }
      return { data: normalized };
    } catch (err) {
      if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1))); continue; }
      return {
        data: [] as unknown[],
        error: err instanceof Error ? err.message : String(err),
        details: extractErrorDetails(err),
      };
    }
  }
  return { data: [] as unknown[], error: 'Max retries', details: { attempts: MAX_RETRIES + 1 } };
}

async function markMissingRecords(
  supabase: ReturnType<typeof createClient>,
  table: string,
  agencyId: string,
  runId: string,
  seenIds: Set<string>,
): Promise<number> {
  const { data: existingRows, error } = await supabase
    .from(table)
    .select('id, apogee_id')
    .eq('agency_id', agencyId)
    .in('mirror_status', ['synced', 'stale']);

  if (error || !existingRows) return 0;

  const missingRows = existingRows.filter(
    (row: { apogee_id: string }) => !seenIds.has(row.apogee_id)
  );

  if (missingRows.length === 0) return 0;

  let marked = 0;
  for (let i = 0; i < missingRows.length; i += BATCH_SIZE) {
    const batch = missingRows.slice(i, i + BATCH_SIZE);
    const ids = batch.map((r: { id: string }) => r.id);
    const { error: updateErr } = await supabase
      .from(table)
      .update({ mirror_status: 'missing_from_source', last_sync_run_id: runId })
      .in('id', ids);
    if (!updateErr) marked += ids.length;
  }

  return marked;
}

// ============================================================
// HANDLER
// ============================================================

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  const providedCronSecret = req.headers.get('X-CRON-SECRET');
  const hasCronSecretConfigured = Boolean(CRON_SECRET);
  const hasCronHeader = Boolean(providedCronSecret);
  const isCronAuth = hasCronSecretConfigured && providedCronSecret === CRON_SECRET;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[APOGEE-SYNC-MANUAL] Missing Supabase runtime config', {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    });
    return diagnosticError(req, 500, 'config', 'Supabase runtime configuration is missing', {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    });
  }

  if (hasCronHeader && !isCronAuth) {
    secLog.authFailure('apogee-sync-manual', 'Invalid X-CRON-SECRET');
    return diagnosticError(req, 401, 'auth', 'Invalid X-CRON-SECRET', {
      authMode: 'cron',
      hasCronSecretConfigured,
    });
  }

  let ctx: { userId: string; globalRole: string | null; agencyId: string | null } | null = null;
  const authMode = isCronAuth ? 'cron' : 'jwt';

  if (!isCronAuth) {
    const authResult = await getUserContext(req);
    if (!authResult.success) {
      secLog.authFailure('apogee-sync-manual', authResult.error, { authMode });
      return diagnosticError(req, authResult.status, 'auth', authResult.error, { authMode });
    }

    const roleCheck = assertRoleAtLeast(authResult.context, 'agency_admin');
    if (!roleCheck.allowed) {
      secLog.denied('apogee-sync-manual', authResult.context.userId, 'Insufficient role for manual sync');
      return diagnosticError(req, 403, 'auth', roleCheck.error ?? 'Insufficient role for manual sync', {
        authMode,
        userId: authResult.context.userId,
        globalRole: authResult.context.globalRole,
      });
    }
    ctx = authResult.context;
  }

  const body = await req.json().catch((error) => ({ __parseError: error }));
  if ('__parseError' in body) {
    return diagnosticError(req, 400, 'request', 'Invalid JSON body', {
      authMode,
      error: extractErrorDetails(body.__parseError),
    });
  }

  const { agency_id, modules } = body as { agency_id?: string; modules?: string[] };

  if (!agency_id) {
    return diagnosticError(req, 400, 'request', 'agency_id is required', { authMode });
  }

  if (modules && !modules.every((m: string) => VALID_MODULES.includes(m))) {
    return diagnosticError(req, 400, 'request', `Invalid modules. Valid: ${VALID_MODULES.join(', ')}`, {
      authMode,
      modules,
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify agency exists and is active, fetch api_key_ref
  const { data: agency, error: agencyErr } = await supabase
    .from('apogee_agencies')
    .select('id, slug, label, api_key_ref')
    .eq('id', agency_id)
    .eq('is_active', true)
    .maybeSingle();

  if (agencyErr || !agency) {
    console.error('[APOGEE-SYNC-MANUAL] Agency lookup failed', { agency_id, error: agencyErr?.message });
    return diagnosticError(req, 404, 'agency_lookup', 'Agency not found or inactive', {
      agencyId: agency_id,
      authMode,
      error: agencyErr ? extractErrorDetails(agencyErr) : null,
    });
  }

  // Agency access check (skip for cron auth)
  if (ctx) {
    const isFranchiseur = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(ctx.globalRole || '');
    if (!isFranchiseur && ctx.agencyId !== agency_id) {
      secLog.denied('apogee-sync-manual', ctx.userId, 'Agency access denied', { requested: agency_id, userAgency: ctx.agencyId });
      return diagnosticError(req, 403, 'auth', 'Access denied to this agency', {
        authMode,
        requestedAgencyId: agency_id,
        userAgencyId: ctx.agencyId,
      });
    }
  }

  // Resolve API key
  let apiKey: string;
  let keySource: 'agency' | 'global';
  try {
    const resolved = await resolveApiKey(supabase, agency);
    apiKey = resolved.apiKey;
    keySource = resolved.keySource;
  } catch (err) {
    console.error('[APOGEE-SYNC-MANUAL] API key resolution failed', {
      agency: agency.slug,
      apiKeyRef: agency.api_key_ref,
      error: extractErrorDetails(err),
    });
    return diagnosticError(req, 500, 'api_key_resolution', err instanceof Error ? err.message : 'No API key available', {
      agencyId: agency.id,
      agencySlug: agency.slug,
      keySourceAttempted: agency.api_key_ref ? 'agency_then_global' : 'global',
      hasGlobalApiKey: Boolean(APOGEE_API_KEY),
    });
  }

  const triggeredBy = ctx?.userId || 'system-cron';

  // Create sync run
  const { data: run, error: runError } = await supabase
    .from('apogee_sync_runs')
    .insert({
      status: 'running',
      sync_type: 'manual',
      agencies_count: 1,
      triggered_by: triggeredBy,
    })
    .select('id')
    .single();

  if (!run) {
    console.error('[APOGEE-SYNC-MANUAL] Failed to create sync run', {
      agency: agency.slug,
      error: runError?.message,
    });
    return diagnosticError(req, 500, 'sync_run_create', 'Failed to create sync run', {
      agencyId: agency.id,
      agencySlug: agency.slug,
      error: runError ? extractErrorDetails(runError) : null,
    });
  }

  const endpointsToSync = modules
    ? SYNC_ENDPOINTS.filter(e => modules.includes(e.table.replace('_mirror', '')))
    : [...SYNC_ENDPOINTS];

  let totalRecords = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalMissing = 0;
  const results: Record<string, unknown>[] = [];
  const errorLog: Record<string, unknown>[] = [];

  for (const ep of endpointsToSync) {
    const { data: logEntry } = await supabase
      .from('apogee_sync_logs')
      .insert({
        run_id: run.id,
        agency_id: agency.id,
        endpoint: ep.endpoint,
        status: 'running',
        key_source: keySource,
      })
      .select('id')
      .single();

    const { data, error, details } = await fetchApogeeEndpoint(agency.slug, ep.endpoint, apiKey);

    if (error) {
      console.error('[APOGEE-SYNC-MANUAL] Endpoint fetch failed', {
        agency: agency.slug,
        endpoint: ep.endpoint,
        error,
        details,
      });
      if (logEntry?.id) {
        await supabase.from('apogee_sync_logs').update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: error,
          error_detail: details ?? null,
          records_fetched: 0,
        }).eq('id', logEntry.id);
      }
      totalFailed++;
      errorLog.push({ stage: 'endpoint_fetch', endpoint: ep.endpoint, error, details: details ?? null });
      results.push({ endpoint: ep.endpoint, status: 'failed', error, diagnostics: details ?? null });
      continue;
    }

    totalRecords += data.length;

    // Upsert with run_id tracking
    let upserted = 0;
    let errors = 0;
    const seenIds = new Set<string>();
    const upsertDiagnostics: Array<Record<string, unknown>> = [];

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const rows = batch.map((item) => {
        const record = item as Record<string, unknown>;
        const apogeeId = String(record[ep.idField] ?? '');
        if (!apogeeId) return null;
        seenIds.add(apogeeId);

        const row: Record<string, unknown> = {
          agency_id: agency.id,
          apogee_id: apogeeId,
          raw_data: record,
          synced_at: new Date().toISOString(),
          sync_version: 1,
          sync_status: 'synced',
          last_sync_run_id: run.id,
          mirror_status: 'synced',
        };
        if ('refField' in ep && ep.refField && record[ep.refField]) row.ref = String(record[ep.refField]);
        const updatedAt = record.updatedAt || record.updated_at || record.dateModification;
        if (updatedAt && typeof updatedAt === 'string') row.source_updated_at = updatedAt;
        return row;
      }).filter(Boolean);

      if (rows.length === 0) continue;
      const { error: upsertErr } = await supabase
        .from(ep.table)
        .upsert(rows, { onConflict: 'agency_id,apogee_id', ignoreDuplicates: false });
      if (upsertErr) {
        errors += rows.length;
        const diagnostic = {
          batchStart: i,
          batchSize: rows.length,
          error: extractErrorDetails(upsertErr),
        };
        upsertDiagnostics.push(diagnostic);
        console.error('[APOGEE-SYNC-MANUAL] Upsert batch failed', {
          agency: agency.slug,
          endpoint: ep.endpoint,
          table: ep.table,
          ...diagnostic,
        });
      } else {
        upserted += rows.length;
      }
    }

    totalSuccess += upserted;
    totalFailed += errors;

    // Stale detection (only when no module filter = full agency sync)
    let markedMissing = 0;
    if (!modules) {
      markedMissing = await markMissingRecords(supabase, ep.table, agency.id, run.id, seenIds);
      totalMissing += markedMissing;
    }

    if (logEntry?.id) {
      await supabase.from('apogee_sync_logs').update({
        status: errors > 0 ? 'failed' : 'success',
        finished_at: new Date().toISOString(),
        records_fetched: data.length,
        records_upserted: upserted,
        records_marked_missing: markedMissing,
        error_message: upsertDiagnostics.length > 0 ? 'One or more upsert batches failed' : null,
        error_detail: upsertDiagnostics.length > 0 ? upsertDiagnostics : null,
      }).eq('id', logEntry.id);
    }

    if (upsertDiagnostics.length > 0) {
      errorLog.push({
        stage: 'endpoint_upsert',
        endpoint: ep.endpoint,
        table: ep.table,
        diagnostics: upsertDiagnostics,
      });
    }

    results.push({
      endpoint: ep.endpoint,
      status: errors > 0 ? 'partial' : 'success',
      fetched: data.length,
      upserted,
      missing: markedMissing,
      diagnostics: upsertDiagnostics.length > 0 ? upsertDiagnostics : null,
    });
  }

  const finalStatus = totalFailed === 0 ? 'success' : totalSuccess > 0 ? 'partial' : 'failed';
  const { error: finalizeError } = await supabase.from('apogee_sync_runs').update({
    status: finalStatus, finished_at: new Date().toISOString(),
    records_total: totalRecords, records_success: totalSuccess, records_failed: totalFailed,
    error_log: errorLog,
  }).eq('id', run.id);

  if (finalizeError) {
    console.error('[APOGEE-SYNC-MANUAL] Failed to finalize sync run', {
      runId: run.id,
      error: extractErrorDetails(finalizeError),
    });
    return diagnosticError(req, 500, 'sync_run_finalize', 'Sync run finalized with persistence error', {
      runId: run.id,
      agencyId: agency.id,
      agencySlug: agency.slug,
      partialStatus: finalStatus,
      error: extractErrorDetails(finalizeError),
    });
  }

  secLog.audit('apogee-sync-manual', ctx?.userId ?? null, `Manual sync completed: ${finalStatus}`, {
    agency: agency.slug,
    authMode,
    keySource,
    modules,
    totalRecords,
    totalSuccess,
    totalFailed,
    totalMissing,
  });

  return jsonResponse(req, 200, {
    success: true,
    runId: run.id,
    status: finalStatus,
    agency: agency.slug,
    agencyId: agency.id,
    authMode,
    keySource,
    totals: {
      totalRecords,
      totalSuccess,
      totalFailed,
      totalMissing,
    },
    results,
  });
});
