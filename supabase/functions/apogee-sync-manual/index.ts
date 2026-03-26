/**
 * APOGÉE SYNC MANUAL — Targeted Agency Refresh
 * 
 * Permet un refresh ciblé par agence et/ou par modules.
 * Authentification JWT obligatoire, rôle N4+ requis.
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

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

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

  if (!APOGEE_API_KEY) {
    return withCors(req, new Response(
      JSON.stringify({ error: 'APOGEE_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const body = await req.json().catch(() => ({}));
  const { agency_id, modules } = body as { agency_id?: string; modules?: string[] };

  if (!agency_id) {
    return withCors(req, new Response(
      JSON.stringify({ error: 'agency_id is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Validate modules if provided
  if (modules && !modules.every((m: string) => VALID_MODULES.includes(m))) {
    return withCors(req, new Response(
      JSON.stringify({ error: `Invalid modules. Valid: ${VALID_MODULES.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify agency exists and is active
  const { data: agency, error: agencyErr } = await supabase
    .from('apogee_agencies')
    .select('id, slug, label')
    .eq('id', agency_id)
    .eq('is_active', true)
    .maybeSingle();

  if (agencyErr || !agency) {
    return withCors(req, new Response(
      JSON.stringify({ error: 'Agency not found or inactive' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Access check: user must belong to agency or be franchiseur
  const ctx = authResult.context;
  const isFranchiseur = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(ctx.globalRole || '');
  if (!isFranchiseur && ctx.agencyId !== agency_id) {
    secLog.denied('apogee-sync-manual', ctx.userId, 'Agency access denied', { requested: agency_id, userAgency: ctx.agencyId });
    return withCors(req, new Response(
      JSON.stringify({ error: 'Access denied to this agency' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Create sync run
  const { data: run } = await supabase
    .from('apogee_sync_runs')
    .insert({
      status: 'running',
      sync_type: 'manual',
      agencies_count: 1,
      triggered_by: ctx.userId,
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
  const results: Record<string, unknown>[] = [];

  for (const ep of endpointsToSync) {
    const { data: logEntry } = await supabase
      .from('apogee_sync_logs')
      .insert({ run_id: run.id, agency_id: agency.id, endpoint: ep.endpoint, status: 'running' })
      .select('id')
      .single();

    const { data, error } = await fetchApogeeEndpoint(agency.slug, ep.endpoint, APOGEE_API_KEY);

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

    // Upsert
    let upserted = 0;
    let errors = 0;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const rows = batch.map((item) => {
        const record = item as Record<string, unknown>;
        const apogeeId = String(record[ep.idField] ?? '');
        if (!apogeeId) return null;
        const row: Record<string, unknown> = {
          agency_id: agency.id, apogee_id: apogeeId, raw_data: record,
          synced_at: new Date().toISOString(), sync_version: 1, sync_status: 'synced',
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

    if (logEntry?.id) {
      await supabase.from('apogee_sync_logs').update({
        status: errors > 0 ? 'failed' : 'success',
        finished_at: new Date().toISOString(),
        records_fetched: data.length, records_upserted: upserted,
      }).eq('id', logEntry.id);
    }

    results.push({ endpoint: ep.endpoint, status: errors > 0 ? 'partial' : 'success', fetched: data.length, upserted });
  }

  const finalStatus = totalFailed === 0 ? 'success' : totalSuccess > 0 ? 'partial' : 'failed';
  await supabase.from('apogee_sync_runs').update({
    status: finalStatus, finished_at: new Date().toISOString(),
    records_total: totalRecords, records_success: totalSuccess, records_failed: totalFailed,
  }).eq('id', run.id);

  secLog.audit('apogee-sync-manual', ctx.userId, `Manual sync completed: ${finalStatus}`, { agency: agency.slug, modules, totalRecords, totalSuccess, totalFailed });

  return withCors(req, new Response(
    JSON.stringify({ runId: run.id, status: finalStatus, agency: agency.slug, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  ));
});
