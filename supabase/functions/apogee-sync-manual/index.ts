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
      return { data: Array.isArray(raw) ? raw : [] as unknown[] };
    } catch (err) {
      if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1))); continue; }
      return { data: [] as unknown[], error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { data: [] as unknown[], error: 'Max retries' };
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

  // Support CRON_SECRET as alternative auth (for system-triggered syncs)
  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  const cronSecret = req.headers.get('X-CRON-SECRET');
  const isCronAuth = CRON_SECRET && cronSecret === CRON_SECRET;

  let ctx: { userId: string; globalRole: string | null; agencyId: string | null } | null = null;

  if (!isCronAuth) {
    const authResult = await getUserContext(req);
    if (!authResult.success) {
      return withCors(req, new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const roleCheck = assertRoleAtLeast(authResult.context, 'agency_admin');
    if (roleCheck) {
      secLog.denied('apogee-sync-manual', authResult.context.userId, 'Insufficient role for manual sync');
      return withCors(req, new Response(
        JSON.stringify({ error: roleCheck.error }),
        { status: roleCheck.status, headers: { 'Content-Type': 'application/json' } }
      ));
    }
    ctx = authResult.context;
  }

  const body = await req.json().catch(() => ({}));
  const { agency_id, modules } = body as { agency_id?: string; modules?: string[] };

  if (!agency_id) {
    return withCors(req, new Response(
      JSON.stringify({ error: 'agency_id is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  if (modules && !modules.every((m: string) => VALID_MODULES.includes(m))) {
    return withCors(req, new Response(
      JSON.stringify({ error: `Invalid modules. Valid: ${VALID_MODULES.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
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
    return withCors(req, new Response(
      JSON.stringify({ error: 'Agency not found or inactive' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Agency access check (skip for cron auth)
  if (ctx) {
    const isFranchiseur = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(ctx.globalRole || '');
    if (!isFranchiseur && ctx.agencyId !== agency_id) {
      secLog.denied('apogee-sync-manual', ctx.userId, 'Agency access denied', { requested: agency_id, userAgency: ctx.agencyId });
      return withCors(req, new Response(
        JSON.stringify({ error: 'Access denied to this agency' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
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
    return withCors(req, new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'No API key available' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const triggeredBy = ctx?.userId || 'system-cron';

  // Create sync run
  const { data: run } = await supabase
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
    return withCors(req, new Response(
      JSON.stringify({ error: 'Failed to create sync run' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const endpointsToSync = modules
    ? SYNC_ENDPOINTS.filter(e => modules.includes(e.table.replace('_mirror', '')))
    : [...SYNC_ENDPOINTS];

  let totalRecords = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalMissing = 0;
  const results: Record<string, unknown>[] = [];

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

    const { data, error } = await fetchApogeeEndpoint(agency.slug, ep.endpoint, apiKey);

    if (error) {
      if (logEntry?.id) {
        await supabase.from('apogee_sync_logs').update({
          status: 'failed', finished_at: new Date().toISOString(), error_message: error, records_fetched: 0,
        }).eq('id', logEntry.id);
      }
      totalFailed++;
      results.push({ endpoint: ep.endpoint, status: 'failed', error });
      continue;
    }

    totalRecords += data.length;

    // Upsert with run_id tracking
    let upserted = 0;
    let errors = 0;
    const seenIds = new Set<string>();

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
      if (upsertErr) { errors += rows.length; } else { upserted += rows.length; }
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
      }).eq('id', logEntry.id);
    }

    results.push({ endpoint: ep.endpoint, status: errors > 0 ? 'partial' : 'success', fetched: data.length, upserted, missing: markedMissing });
  }

  const finalStatus = totalFailed === 0 ? 'success' : totalSuccess > 0 ? 'partial' : 'failed';
  await supabase.from('apogee_sync_runs').update({
    status: finalStatus, finished_at: new Date().toISOString(),
    records_total: totalRecords, records_success: totalSuccess, records_failed: totalFailed,
  }).eq('id', run.id);

  secLog.audit('apogee-sync-manual', ctx.userId, `Manual sync completed: ${finalStatus}`, {
    agency: agency.slug, keySource, modules, totalRecords, totalSuccess, totalFailed, totalMissing,
  });

  return withCors(req, new Response(
    JSON.stringify({ runId: run.id, status: finalStatus, agency: agency.slug, keySource, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  ));
});
