/**
 * APOGÉE FULL SYNC — Shadow Mirror Population
 * 
 * Boucle sur toutes les agences actives, appelle les endpoints Apogée,
 * et upsert les données dans les tables _mirror.
 * 
 * Déclenchement : CRON (06:00, 12:30, 18:00) ou manuel via apogee-sync-manual.
 * Sécurité : CRON_SECRET obligatoire.
 * Stratégie : upsert par apogee_id, erreurs partielles tolérées.
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

// Endpoints to sync and their mirror table mapping
const SYNC_ENDPOINTS = [
  { endpoint: 'apiGetProjects', table: 'projects_mirror', idField: 'id', refField: 'ref' },
  { endpoint: 'apiGetInterventions', table: 'interventions_mirror', idField: 'id' },
  { endpoint: 'apiGetDevis', table: 'devis_mirror', idField: 'id' },
  { endpoint: 'apiGetFactures', table: 'factures_mirror', idField: 'id' },
  { endpoint: 'apiGetUsers', table: 'users_mirror', idField: 'id' },
  { endpoint: 'apiGetClients', table: 'clients_mirror', idField: 'id' },
] as const;

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
      const items = Array.isArray(rawData) ? rawData : [];
      return { data: items };
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
  refField?: string,
): Promise<{ upserted: number; errors: number }> {
  let upserted = 0;
  let errors = 0;

  // Batch upserts in chunks of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const rows = batch
      .map((item) => {
        const record = item as Record<string, unknown>;
        const apogeeId = extractId(record, idField);
        if (!apogeeId) return null;

        const row: Record<string, unknown> = {
          agency_id: agencyId,
          apogee_id: apogeeId,
          raw_data: record,
          synced_at: new Date().toISOString(),
          sync_version: 1, // Will be incremented by trigger later if needed
          sync_status: 'synced',
        };

        // Extract ref for projects
        if (refField && record[refField]) {
          row.ref = String(record[refField]);
        }

        // Try to extract source_updated_at
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

  return { upserted, errors };
}

// ============================================================
// SYNC ONE AGENCY
// ============================================================

async function syncAgency(
  supabase: ReturnType<typeof createClient>,
  agency: { id: string; slug: string; label: string },
  runId: string,
  apiKey: string,
  modules?: string[],
): Promise<{ success: boolean; totalRecords: number; totalSuccess: number; totalFailed: number }> {
  let totalRecords = 0;
  let totalSuccess = 0;
  let totalFailed = 0;

  const endpointsToSync = modules
    ? SYNC_ENDPOINTS.filter(e => modules.includes(e.table.replace('_mirror', '')))
    : SYNC_ENDPOINTS;

  for (const ep of endpointsToSync) {
    // Create sync log entry
    const { data: logEntry } = await supabase
      .from('apogee_sync_logs')
      .insert({
        run_id: runId,
        agency_id: agency.id,
        endpoint: ep.endpoint,
        status: 'running',
      })
      .select('id')
      .single();

    const logId = logEntry?.id;

    // Fetch from Apogée
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

    // Upsert into mirror table
    const result = await upsertMirrorData(
      supabase,
      ep.table,
      agency.id,
      data,
      ep.idField,
      'refField' in ep ? ep.refField : undefined,
    );

    totalSuccess += result.upserted;
    totalFailed += result.errors;

    // Update sync log
    if (logId) {
      await supabase.from('apogee_sync_logs').update({
        status: result.errors > 0 ? 'failed' : 'success',
        finished_at: new Date().toISOString(),
        records_fetched: data.length,
        records_upserted: result.upserted,
        error_message: result.errors > 0 ? `${result.errors} upsert errors` : null,
      }).eq('id', logId);
    }

    console.log(`[SYNC] ${agency.slug}/${ep.endpoint}: fetched=${data.length} upserted=${result.upserted} errors=${result.errors}`);
  }

  return {
    success: totalFailed === 0,
    totalRecords,
    totalSuccess,
    totalFailed,
  };
}

// ============================================================
// MAIN — BATCH AGENCIES WITH CONCURRENCY LIMIT
// ============================================================

async function runFullSync(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  syncType: 'full' | 'partial' | 'manual' = 'full',
  targetAgencyId?: string,
  modules?: string[],
  triggeredBy?: string,
): Promise<{ runId: string; status: string }> {
  // Create sync run
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

  // Get active agencies
  let agencyQuery = supabase
    .from('apogee_agencies')
    .select('id, slug, label')
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

  // Process agencies with concurrency limit
  for (let i = 0; i < agencies.length; i += MAX_CONCURRENT_AGENCIES) {
    const batch = agencies.slice(i, i + MAX_CONCURRENT_AGENCIES);
    const results = await Promise.allSettled(
      batch.map(agency => syncAgency(supabase, agency, runId, apiKey, modules))
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

  // Determine final status
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
  // CRON_SECRET validation
  const cronSecret = req.headers.get('X-CRON-SECRET') || req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!CRON_SECRET || cronSecret !== CRON_SECRET) {
    secLog.cronRejected('apogee-full-sync', {
      hasSecret: !!cronSecret,
      headerUsed: req.headers.has('X-CRON-SECRET') ? 'X-CRON-SECRET' : 'Authorization',
    });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!APOGEE_API_KEY) {
    console.error('[SYNC] APOGEE_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'Missing APOGEE_API_KEY' }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check for double execution (no run started in last 5 minutes)
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

  const result = await runFullSync(supabase, APOGEE_API_KEY);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
