/**
 * APOGÉE FULL SYNC — Shadow Mirror Population (v2.1)
 * 
 * Boucle sur toutes les agences actives, appelle les endpoints Apogée,
 * et upsert les données dans les tables _mirror.
 * 
 * v2.1 additions:
 * - Per-agency API key support (fallback to global)
 * - Real sync versioning (last_sync_run_id on every record)
 * - Stale detection (mirror_status = 'missing_from_source')
 * - Enhanced logging (key_source, records_marked_missing)
 * 
 * Sécurité : CRON_SECRET obligatoire.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { secLog } from '../_shared/securityLog.ts';

const CRON_SECRET = Deno.env.get('CRON_SECRET');
const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MAX_CONCURRENT_AGENCIES = 3;
const API_CALL_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;

const SYNC_ENDPOINTS = [
  { endpoint: 'apiGetProjects', table: 'projects_mirror', idField: 'id', refField: 'ref' },
  { endpoint: 'apiGetInterventions', table: 'interventions_mirror', idField: 'id' },
  { endpoint: 'apiGetDevis', table: 'devis_mirror', idField: 'id' },
  { endpoint: 'apiGetFactures', table: 'factures_mirror', idField: 'id' },
  { endpoint: 'apiGetUsers', table: 'users_mirror', idField: 'id' },
  { endpoint: 'apiGetClients', table: 'clients_mirror', idField: 'id' },
] as const;

// ============================================================
// API KEY RESOLUTION
// ============================================================

async function resolveApiKey(
  supabase: ReturnType<typeof createClient>,
  agency: { id: string; slug: string; api_key_ref?: string | null },
): Promise<{ apiKey: string; keySource: 'agency' | 'global' }> {
  // Try per-agency key first
  if (agency.api_key_ref) {
    try {
      const { data } = await supabase
        .from('vault' as any)
        .select('decrypted_secret')
        .eq('name', agency.api_key_ref)
        .maybeSingle();
      
      if (data?.decrypted_secret) {
        return { apiKey: data.decrypted_secret, keySource: 'agency' };
      }
    } catch {
      // Vault query failed — fallback silently
    }

    // Alternative: check env var named after the ref
    const envKey = Deno.env.get(agency.api_key_ref);
    if (envKey) {
      return { apiKey: envKey, keySource: 'agency' };
    }

    console.warn(`[SYNC] Agency ${agency.slug}: api_key_ref="${agency.api_key_ref}" not resolved, falling back to global`);
  }

  if (!APOGEE_API_KEY) {
    throw new Error('No API key available (no agency key, no global APOGEE_API_KEY)');
  }

  return { apiKey: APOGEE_API_KEY, keySource: 'global' };
}

// ============================================================
// HELPERS
// ============================================================

async function fetchApogeeEndpoint(
  agencySlug: string,
  endpoint: string,
  apiKey: string,
): Promise<{ data: unknown[]; error?: string }> {
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
        const body = await response.text().catch(() => '');
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        return { data: [], error: `HTTP ${response.status}: ${body.substring(0, 200)}` };
      }

      const rawData = await response.json();
      return { data: Array.isArray(rawData) ? rawData : [] };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  return { data: [], error: 'Max retries exhausted' };
}

function extractId(item: Record<string, unknown>, idField: string): string {
  const val = item[idField];
  if (val == null) return '';
  return String(val);
}

async function upsertMirrorData(
  supabase: ReturnType<typeof createClient>,
  table: string,
  agencyId: string,
  items: unknown[],
  idField: string,
  runId: string,
  refField?: string,
): Promise<{ upserted: number; errors: number; seenIds: Set<string> }> {
  let upserted = 0;
  let errors = 0;
  const seenIds = new Set<string>();

  const BATCH_SIZE = 500;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const rows = batch
      .map((item) => {
        const record = item as Record<string, unknown>;
        const apogeeId = extractId(record, idField);
        if (!apogeeId) return null;

        seenIds.add(apogeeId);

        const row: Record<string, unknown> = {
          agency_id: agencyId,
          apogee_id: apogeeId,
          raw_data: record,
          synced_at: new Date().toISOString(),
          sync_version: 1,
          sync_status: 'synced',
          last_sync_run_id: runId,
          mirror_status: 'synced',
        };

        if (refField && record[refField]) {
          row.ref = String(record[refField]);
        }

        const updatedAt = record.updatedAt || record.updated_at || record.dateModification;
        if (updatedAt && typeof updatedAt === 'string') {
          row.source_updated_at = updatedAt;
        }

        return row;
      })
      .filter(Boolean);

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: 'agency_id,apogee_id', ignoreDuplicates: false });

    if (error) {
      console.error(`[SYNC] Upsert error on ${table}: ${error.message}`);
      errors += rows.length;
    } else {
      upserted += rows.length;
    }
  }

  return { upserted, errors, seenIds };
}

// ============================================================
// MARK MISSING RECORDS
// ============================================================

async function markMissingRecords(
  supabase: ReturnType<typeof createClient>,
  table: string,
  agencyId: string,
  runId: string,
  seenIds: Set<string>,
): Promise<number> {
  // Get all current 'synced' records for this agency
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

  // Batch update missing records
  const BATCH = 500;
  let marked = 0;
  for (let i = 0; i < missingRows.length; i += BATCH) {
    const batch = missingRows.slice(i, i + BATCH);
    const ids = batch.map((r: { id: string }) => r.id);

    const { error: updateErr } = await supabase
      .from(table)
      .update({ mirror_status: 'missing_from_source', last_sync_run_id: runId })
      .in('id', ids);

    if (!updateErr) marked += ids.length;
  }

  if (marked > 0) {
    console.log(`[SYNC] ${table}: marked ${marked} records as missing_from_source`);
  }

  return marked;
}

// ============================================================
// SYNC ONE AGENCY
// ============================================================

async function syncAgency(
  supabase: ReturnType<typeof createClient>,
  agency: { id: string; slug: string; label: string; api_key_ref?: string | null },
  runId: string,
  modules?: string[],
): Promise<{ success: boolean; totalRecords: number; totalSuccess: number; totalFailed: number; totalMissing: number }> {
  let totalRecords = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalMissing = 0;

  // Resolve API key for this agency
  let apiKey: string;
  let keySource: 'agency' | 'global';
  try {
    const resolved = await resolveApiKey(supabase, agency);
    apiKey = resolved.apiKey;
    keySource = resolved.keySource;
  } catch (err) {
    console.error(`[SYNC] ${agency.slug}: ${err instanceof Error ? err.message : err}`);
    return { success: false, totalRecords: 0, totalSuccess: 0, totalFailed: 1, totalMissing: 0 };
  }

  console.log(`[SYNC] ${agency.slug}: using ${keySource} API key`);

  const endpointsToSync = modules
    ? SYNC_ENDPOINTS.filter(e => modules.includes(e.table.replace('_mirror', '')))
    : SYNC_ENDPOINTS;

  for (const ep of endpointsToSync) {
    const { data: logEntry } = await supabase
      .from('apogee_sync_logs')
      .insert({
        run_id: runId,
        agency_id: agency.id,
        endpoint: ep.endpoint,
        status: 'running',
        key_source: keySource,
      })
      .select('id')
      .single();

    const logId = logEntry?.id;

    const { data, error } = await fetchApogeeEndpoint(agency.slug, ep.endpoint, apiKey);

    if (error) {
      console.error(`[SYNC] ${agency.slug}/${ep.endpoint}: ${error}`);
      if (logId) {
        await supabase.from('apogee_sync_logs').update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: error,
          records_fetched: 0,
        }).eq('id', logId);
      }
      totalFailed += 1;
      continue;
    }

    totalRecords += data.length;

    const result = await upsertMirrorData(
      supabase,
      ep.table,
      agency.id,
      data,
      ep.idField,
      runId,
      'refField' in ep ? ep.refField : undefined,
    );

    totalSuccess += result.upserted;
    totalFailed += result.errors;

    // Mark missing records (only for full syncs — when no module filter)
    let markedMissing = 0;
    if (!modules) {
      markedMissing = await markMissingRecords(supabase, ep.table, agency.id, runId, result.seenIds);
      totalMissing += markedMissing;
    }

    if (logId) {
      await supabase.from('apogee_sync_logs').update({
        status: result.errors > 0 ? 'failed' : 'success',
        finished_at: new Date().toISOString(),
        records_fetched: data.length,
        records_upserted: result.upserted,
        records_marked_missing: markedMissing,
        error_message: result.errors > 0 ? `${result.errors} upsert errors` : null,
      }).eq('id', logId);
    }

    console.log(`[SYNC] ${agency.slug}/${ep.endpoint}: fetched=${data.length} upserted=${result.upserted} errors=${result.errors} missing=${markedMissing}`);
  }

  return { success: totalFailed === 0, totalRecords, totalSuccess, totalFailed, totalMissing };
}

// ============================================================
// MAIN
// ============================================================

async function runFullSync(
  supabase: ReturnType<typeof createClient>,
  syncType: 'full' | 'partial' | 'manual' = 'full',
  targetAgencyId?: string,
  modules?: string[],
  triggeredBy?: string,
): Promise<{ runId: string; status: string }> {
  const { data: run, error: runErr } = await supabase
    .from('apogee_sync_runs')
    .insert({
      status: 'running',
      sync_type: syncType,
      triggered_by: triggeredBy || 'cron',
    })
    .select('id')
    .single();

  if (runErr || !run) {
    console.error('[SYNC] Failed to create sync run:', runErr?.message);
    return { runId: '', status: 'failed' };
  }

  const runId = run.id;

  let agencyQuery = supabase
    .from('apogee_agencies')
    .select('id, slug, label, api_key_ref')
    .eq('is_active', true);

  if (targetAgencyId) {
    agencyQuery = agencyQuery.eq('id', targetAgencyId);
  }

  const { data: agencies, error: agencyErr } = await agencyQuery;

  if (agencyErr || !agencies?.length) {
    console.error('[SYNC] No agencies found:', agencyErr?.message);
    await supabase.from('apogee_sync_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_log: [{ error: 'No active agencies found', detail: agencyErr?.message }],
    }).eq('id', runId);
    return { runId, status: 'failed' };
  }

  await supabase.from('apogee_sync_runs').update({
    agencies_count: agencies.length,
  }).eq('id', runId);

  console.log(`[SYNC] Starting ${syncType} sync for ${agencies.length} agencies (run=${runId.substring(0, 8)}...)`);

  let globalRecordsTotal = 0;
  let globalRecordsSuccess = 0;
  let globalRecordsFailed = 0;
  const errorLog: unknown[] = [];

  for (let i = 0; i < agencies.length; i += MAX_CONCURRENT_AGENCIES) {
    const batch = agencies.slice(i, i + MAX_CONCURRENT_AGENCIES);
    const results = await Promise.allSettled(
      batch.map(agency => syncAgency(supabase, agency, runId, modules))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const agency = batch[j];

      if (result.status === 'fulfilled') {
        globalRecordsTotal += result.value.totalRecords;
        globalRecordsSuccess += result.value.totalSuccess;
        globalRecordsFailed += result.value.totalFailed;
        if (!result.value.success) {
          errorLog.push({ agency: agency.slug, agencyId: agency.id, partialFailure: true });
        }
      } else {
        errorLog.push({ agency: agency.slug, agencyId: agency.id, error: result.reason?.message || 'Unknown error' });
        globalRecordsFailed += 1;
      }
    }
  }

  const finalStatus = globalRecordsFailed === 0
    ? 'success'
    : globalRecordsSuccess > 0
      ? 'partial'
      : 'failed';

  await supabase.from('apogee_sync_runs').update({
    status: finalStatus,
    finished_at: new Date().toISOString(),
    records_total: globalRecordsTotal,
    records_success: globalRecordsSuccess,
    records_failed: globalRecordsFailed,
    error_log: errorLog.length > 0 ? errorLog : [],
  }).eq('id', runId);

  console.log(`[SYNC] Finished: status=${finalStatus} total=${globalRecordsTotal} success=${globalRecordsSuccess} failed=${globalRecordsFailed}`);

  return { runId, status: finalStatus };
}

// ============================================================
// EDGE FUNCTION HANDLER
// ============================================================

Deno.serve(async (req) => {
  const cronSecret = req.headers.get('X-CRON-SECRET') || req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
    secLog.cronRejected('apogee-full-sync', {
      hasSecret: !!cronSecret,
      headerUsed: req.headers.has('X-CRON-SECRET') ? 'X-CRON-SECRET' : 'Authorization',
    });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check for double execution
  const { data: recentRun } = await supabase
    .from('apogee_sync_runs')
    .select('id, started_at')
    .eq('status', 'running')
    .gte('started_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .maybeSingle();

  if (recentRun) {
    console.log(`[SYNC] Skipping: another sync is already running (${recentRun.id})`);
    return new Response(JSON.stringify({
      skipped: true,
      reason: 'Another sync is already running',
      runningId: recentRun.id,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const result = await runFullSync(supabase);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
