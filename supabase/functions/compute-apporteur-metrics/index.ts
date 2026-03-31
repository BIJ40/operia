/**
 * COMPUTE APPORTEUR METRICS
 * 
 * Edge Function qui agrège les données RAW Apogée (projects, devis, factures)
 * en métriques quotidiennes par apporteur (commanditaireId).
 * 
 * Pattern: Compute Once, Read Many
 * Déclenché: cron nocturne + bouton "Recalculer" UI
 * 
 * Entrée: { agency_id, date_from?, date_to? }
 * Sortie: upsert metrics_apporteur_daily + metrics_apporteur_univers_daily
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

// Devis states considered "signed/validated"
const DEVIS_SIGNED_STATES = ['validated', 'signed', 'order', 'accepted'];

// Project states considered "closed"
const PROJECT_CLOSED_STATES = ['clos', 'closed', 'invoiced', 'done', 'terminé'];

// ─── Helpers ─────────────────────────────────────────────────────────

function safeDivide(num: number, den: number): number | null {
  return den > 0 ? num / den : null;
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getProjectDate(project: any): Date | null {
  return parseDate(project.dateReelle) || parseDate(project.date) || parseDate(project.created_at);
}

function getDevisDate(devis: any): Date | null {
  return parseDate(devis.dateReelle) || parseDate(devis.date) || parseDate(devis.dateEmission);
}

function getFactureDate(facture: any): Date | null {
  return parseDate(facture.dateReelle) || parseDate(facture.date) || parseDate(facture.dateEmission);
}

function getApporteurId(project: any): string | null {
  const id = project.data?.commanditaireId ?? project.commanditaireId;
  return id ? String(id) : null;
}

function getUniverses(project: any): string[] {
  const univs = project.data?.universes ?? project.universes;
  if (Array.isArray(univs) && univs.length > 0) return univs.map((u: any) => String(u));
  return ['Non classé'];
}

function isDevisSigned(devis: any): boolean {
  const state = (devis.state || devis.status || '').toLowerCase();
  return DEVIS_SIGNED_STATES.includes(state);
}

function isProjectClosed(project: any): boolean {
  const state = (project.state || '').toLowerCase();
  return PROJECT_CLOSED_STATES.some(s => state.includes(s));
}

function getFactureMontantHT(facture: any): number {
  const montant = parseFloat(facture.data?.totalHT ?? facture.totalHT ?? 0);
  const type = (facture.typeFacture || facture.type || '').toLowerCase();
  if (type === 'avoir') return -Math.abs(montant);
  return montant;
}

function daysDiff(from: Date, to: Date): number {
  return Math.abs((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Apogée API caller ──────────────────────────────────────────────

async function callApogee(agencySlug: string, endpoint: string): Promise<any[]> {
  const url = `https://${agencySlug}.hc-apogee.fr/api/${endpoint}`;
  console.log(`[COMPUTE-APPORTEUR] Calling ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ API_KEY: APOGEE_API_KEY }),
  });
  
  if (!response.ok) {
    throw new Error(`Apogée ${endpoint} error: ${response.status}`);
  }
  
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

// ─── Main computation ────────────────────────────────────────────────

interface DailyMetric {
  dossiers_received: number;
  dossiers_closed: number;
  devis_total: number;
  devis_signed: number;
  factures: number;
  ca_ht: number;
  dossiers_sans_devis: number;
  delai_dossier_devis_sum: number;
  delai_dossier_devis_count: number;
  delai_devis_signature_sum: number;
  delai_devis_signature_count: number;
  delai_signature_facture_sum: number;
  delai_signature_facture_count: number;
}

interface UniversDailyMetric {
  dossiers: number;
  devis: number;
  factures: number;
  ca_ht: number;
}

function emptyDailyMetric(): DailyMetric {
  return {
    dossiers_received: 0, dossiers_closed: 0, devis_total: 0, devis_signed: 0,
    factures: 0, ca_ht: 0, dossiers_sans_devis: 0,
    delai_dossier_devis_sum: 0, delai_dossier_devis_count: 0,
    delai_devis_signature_sum: 0, delai_devis_signature_count: 0,
    delai_signature_facture_sum: 0, delai_signature_facture_count: 0,
  };
}

function emptyUniversMetric(): UniversDailyMetric {
  return { dossiers: 0, devis: 0, factures: 0, ca_ht: 0 };
}

function computeMetrics(
  projects: any[],
  devis: any[],
  factures: any[],
  dateFrom: Date,
  dateTo: Date,
) {
  // Structures: key = `${apporteurId}|${dateKey}`
  const daily = new Map<string, DailyMetric>();
  const univers = new Map<string, UniversDailyMetric>();

  const getOrCreate = (apporteurId: string, dateKey: string) => {
    const key = `${apporteurId}|${dateKey}`;
    if (!daily.has(key)) daily.set(key, emptyDailyMetric());
    return daily.get(key)!;
  };

  const getOrCreateUnivers = (apporteurId: string, dateKey: string, univCode: string) => {
    const key = `${apporteurId}|${dateKey}|${univCode}`;
    if (!univers.has(key)) univers.set(key, emptyUniversMetric());
    return univers.get(key)!;
  };

  // Index projects by ID for joins
  const projectById = new Map<any, any>();
  for (const p of projects) {
    projectById.set(p.id, p);
  }

  // Index devis by projectId for "sans devis" check
  const devisByProjectId = new Map<any, any[]>();
  for (const d of devis) {
    const pid = d.projectId ?? d.project_id;
    if (pid) {
      if (!devisByProjectId.has(pid)) devisByProjectId.set(pid, []);
      devisByProjectId.get(pid)!.push(d);
    }
  }

  // 1. Projects → dossiers received + closed
  for (const project of projects) {
    const apporteurId = getApporteurId(project);
    if (!apporteurId) continue;

    const pDate = getProjectDate(project);
    if (!pDate || pDate < dateFrom || pDate > dateTo) continue;

    const dateKey = toDateKey(pDate);
    const m = getOrCreate(apporteurId, dateKey);
    m.dossiers_received++;

    if (isProjectClosed(project)) {
      m.dossiers_closed++;
    }

    // Check if project has any devis
    const projectDevis = devisByProjectId.get(project.id);
    if (!projectDevis || projectDevis.length === 0) {
      m.dossiers_sans_devis++;
    }

    // Univers
    const univList = getUniverses(project);
    for (const u of univList) {
      getOrCreateUnivers(apporteurId, dateKey, u).dossiers++;
    }
  }

  // 2. Devis → totaux + signés
  for (const d of devis) {
    const pid = d.projectId ?? d.project_id;
    const project = pid ? projectById.get(pid) : null;
    const apporteurId = project ? getApporteurId(project) : null;
    if (!apporteurId) continue;

    const dDate = getDevisDate(d);
    if (!dDate || dDate < dateFrom || dDate > dateTo) continue;

    const dateKey = toDateKey(dDate);
    const m = getOrCreate(apporteurId, dateKey);
    m.devis_total++;

    const signed = isDevisSigned(d);
    if (signed) {
      m.devis_signed++;
    }

    // Univers
    const univList = project ? getUniverses(project) : ['Non classé'];
    for (const u of univList) {
      getOrCreateUnivers(apporteurId, dateKey, u).devis++;
    }

    // Délai dossier → devis
    const pDate = project ? getProjectDate(project) : null;
    if (pDate && dDate) {
      const days = daysDiff(pDate, dDate);
      if (days >= 0 && days < 365) {
        m.delai_dossier_devis_sum += days;
        m.delai_dossier_devis_count++;
      }
    }

    // Délai devis → signature (use dateValidation if available)
    if (signed) {
      const signDate = parseDate(d.dateValidation) || parseDate(d.dateSigned);
      if (signDate && dDate) {
        const days = daysDiff(dDate, signDate);
        if (days >= 0 && days < 365) {
          m.delai_devis_signature_sum += days;
          m.delai_devis_signature_count++;
        }
      }
    }
  }

  // 3. Factures → count + CA HT
  for (const f of factures) {
    const pid = f.projectId ?? f.project_id;
    const project = pid ? projectById.get(pid) : null;
    const apporteurId = project ? getApporteurId(project) : null;
    if (!apporteurId) continue;

    const fDate = getFactureDate(f);
    if (!fDate || fDate < dateFrom || fDate > dateTo) continue;

    const dateKey = toDateKey(fDate);
    const m = getOrCreate(apporteurId, dateKey);
    const montant = getFactureMontantHT(f);

    m.factures++;
    m.ca_ht += montant;

    // Univers
    const univList = project ? getUniverses(project) : ['Non classé'];
    const share = montant / univList.length;
    for (const u of univList) {
      const um = getOrCreateUnivers(apporteurId, dateKey, u);
      um.factures++;
      um.ca_ht += share;
    }

    // Délai signature → facture  
    // Find the first signed devis for this project
    const projectDevis = devisByProjectId.get(pid);
    if (projectDevis) {
      const signedDevis = projectDevis.find(isDevisSigned);
      if (signedDevis) {
        const signDate = parseDate(signedDevis.dateValidation) || parseDate(signedDevis.dateSigned) || getDevisDate(signedDevis);
        if (signDate && fDate) {
          const days = daysDiff(signDate, fDate);
          if (days >= 0 && days < 365) {
            m.delai_signature_facture_sum += days;
            m.delai_signature_facture_count++;
          }
        }
      }
    }
  }

  return { daily, univers };
}

// ─── Serve ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  // Auth: CRON_SECRET or valid JWT required
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // CRON call — authorized
  } else if (authHeader?.startsWith('Bearer ')) {
    // Validate JWT via Supabase
    const supabaseCheck = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseCheck.auth.getUser();
    if (authErr || !user) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non authentifié' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }
    // Agency scope check: only allow access to own agency or N4+ admins
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('agency_id, global_role')
      .eq('id', user.id)
      .single();
    const reqBody = await req.clone().json();
    const isAdmin = ['platform_admin', 'superadmin', 'franchisor_admin', 'franchisor_user'].includes(profile?.global_role ?? '');
    if (!isAdmin && profile?.agency_id !== reqBody.agency_id) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Accès non autorisé à cette agence' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }
  } else {
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Non authentifié' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const startTime = Date.now();

  try {
    const { agency_id, date_from, date_to } = await req.json();

    if (!agency_id) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'agency_id requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!APOGEE_API_KEY) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'APOGEE_API_KEY non configurée' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Service role client for DB writes
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get agency slug
    const { data: agency, error: agencyErr } = await supabase
      .from('apogee_agencies')
      .select('slug')
      .eq('id', agency_id)
      .single();

    if (agencyErr || !agency?.slug) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: `Agence non trouvée: ${agency_id}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Date range (default: 400 last days)
    const now = new Date();
    const dateTo = date_to ? new Date(date_to) : now;
    const dateFrom = date_from ? new Date(date_from) : new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);

    console.log(`[COMPUTE-APPORTEUR] Agency ${agency.slug} | ${toDateKey(dateFrom)} → ${toDateKey(dateTo)}`);

    // Load raw data from Apogée
    const [projects, devis, factures] = await Promise.all([
      callApogee(agency.slug, 'apiGetProjects'),
      callApogee(agency.slug, 'apiGetDevis'),
      callApogee(agency.slug, 'apiGetFactures'),
    ]);

    console.log(`[COMPUTE-APPORTEUR] Loaded: ${projects.length} projects, ${devis.length} devis, ${factures.length} factures`);

    // Compute
    const { daily, univers } = computeMetrics(projects, devis, factures, dateFrom, dateTo);

    console.log(`[COMPUTE-APPORTEUR] Computed: ${daily.size} daily rows, ${univers.size} univers rows`);

    // Upsert metrics_apporteur_daily
    const dailyRows: any[] = [];
    for (const [key, m] of daily) {
      const [apporteurId, dateKey] = key.split('|');
      dailyRows.push({
        agence_id: agency_id,
        apporteur_id: apporteurId,
        date: dateKey,
        dossiers_received_count: m.dossiers_received,
        dossiers_closed_count: m.dossiers_closed,
        devis_total_count: m.devis_total,
        devis_signed_count: m.devis_signed,
        factures_count: m.factures,
        ca_ht: Math.round(m.ca_ht * 100) / 100,
        panier_moyen: safeDivide(m.ca_ht, m.factures) !== null ? Math.round(safeDivide(m.ca_ht, m.factures)! * 100) / 100 : null,
        taux_transfo_devis: safeDivide(m.devis_signed, m.devis_total) !== null ? Math.round(safeDivide(m.devis_signed, m.devis_total)! * 10000) / 10000 : null,
        dossiers_sans_devis_count: m.dossiers_sans_devis,
        devis_non_signes_count: m.devis_total - m.devis_signed,
        delai_dossier_vers_devis_avg_days: safeDivide(m.delai_dossier_devis_sum, m.delai_dossier_devis_count) !== null ? Math.round(safeDivide(m.delai_dossier_devis_sum, m.delai_dossier_devis_count)! * 10) / 10 : null,
        delai_devis_vers_signature_avg_days: safeDivide(m.delai_devis_signature_sum, m.delai_devis_signature_count) !== null ? Math.round(safeDivide(m.delai_devis_signature_sum, m.delai_devis_signature_count)! * 10) / 10 : null,
        delai_signature_vers_facture_avg_days: safeDivide(m.delai_signature_facture_sum, m.delai_signature_facture_count) !== null ? Math.round(safeDivide(m.delai_signature_facture_sum, m.delai_signature_facture_count)! * 10) / 10 : null,
      });
    }

    // Batch upsert (chunks of 500)
    let dailyUpserted = 0;
    for (let i = 0; i < dailyRows.length; i += 500) {
      const chunk = dailyRows.slice(i, i + 500);
      const { error } = await supabase
        .from('metrics_apporteur_daily')
        .upsert(chunk, { onConflict: 'agence_id,apporteur_id,date' });
      if (error) {
        console.error(`[COMPUTE-APPORTEUR] Daily upsert error:`, error);
      } else {
        dailyUpserted += chunk.length;
      }
    }

    // Upsert metrics_apporteur_univers_daily
    const universRows: any[] = [];
    for (const [key, m] of univers) {
      const [apporteurId, dateKey, universCode] = key.split('|');
      universRows.push({
        agence_id: agency_id,
        apporteur_id: apporteurId,
        date: dateKey,
        univers_code: universCode,
        dossiers_count: m.dossiers,
        devis_count: m.devis,
        factures_count: m.factures,
        ca_ht: Math.round(m.ca_ht * 100) / 100,
      });
    }

    let universUpserted = 0;
    for (let i = 0; i < universRows.length; i += 500) {
      const chunk = universRows.slice(i, i + 500);
      const { error } = await supabase
        .from('metrics_apporteur_univers_daily')
        .upsert(chunk, { onConflict: 'agence_id,apporteur_id,date,univers_code' });
      if (error) {
        console.error(`[COMPUTE-APPORTEUR] Univers upsert error:`, error);
      } else {
        universUpserted += chunk.length;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[COMPUTE-APPORTEUR] Done in ${elapsed}ms: ${dailyUpserted} daily + ${universUpserted} univers rows`);

    return withCors(req, new Response(
      JSON.stringify({
        success: true,
        data: {
          agency_id,
          agency_slug: agency.slug,
          period: { from: toDateKey(dateFrom), to: toDateKey(dateTo) },
          daily_rows: dailyUpserted,
          univers_rows: universUpserted,
          elapsed_ms: elapsed,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    console.error('[COMPUTE-APPORTEUR] Error:', error);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erreur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
