/**
 * GET APPORTEUR STATS — V2
 *
 * Retourne les KPIs enrichis, trends N vs N-1, répartition univers,
 * score collaboration, alertes avec risk_blockage, et series 12 mois.
 *
 * Un seul fetch par endpoint Apogée (projects, factures, devis, interventions).
 * Tous les calculs sont faits depuis les mêmes arrays en mémoire.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { authenticateApporteur } from '../_shared/apporteurAuth.ts';

// ── Config targets (collaboration score) ─────────────────
const TARGET_VOLUME = 20;        // dossiers / période pour 100%
const TARGET_DELAY = 10;         // jours délai devis validation pour 100%
const REGULARITY_FACTOR = 5;     // facteur std_dev pour régularité

// ── Types internes ───────────────────────────────────────
// deno-lint-ignore no-explicit-any
type R = Record<string, any>;

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('-')) { const d = new Date(dateStr); return isNaN(d.getTime()) ? null : d; }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) { const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])); return isNaN(d.getTime()) ? null : d; }
  }
  return null;
}

function fmt(d: Date): string { return d.toISOString().split('T')[0]; }
function clamp(v: number, min: number, max: number): number { return Math.min(max, Math.max(min, v)); }
function round2(v: number): number { return Math.round(v * 100) / 100; }

function daysDiff(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// ── Date range with N-1 ─────────────────────────────────
function getDateRange(period: string | undefined, from: string | undefined, to: string | undefined) {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let mode = period || 'month';

  if (from && to && period === 'custom') {
    start = new Date(from);
    end = new Date(to);
    end.setHours(23, 59, 59);
    mode = 'custom';
  } else {
    switch (period) {
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case '12months': {
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        break;
      }
      case '6months': {
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        break;
      }
      case 'month':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  // N-1: same duration shifted backwards
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  prevEnd.setHours(23, 59, 59);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return { start, end, prevStart, prevEnd, mode };
}

function filterByPeriod(items: R[], startDate: Date, endDate: Date): R[] {
  return items.filter(item => {
    const d = parseDate(item.dateReelle || item.date);
    return d && d >= startDate && d <= endDate;
  });
}

function isCancelledLike(s: unknown): boolean {
  const str = String(s ?? '').toLowerCase();
  return ['cancelled', 'canceled', 'annul', 'abandon', 'refus', 'refuse', 'refused'].some(k => str.includes(k));
}

// ── KPI computation (reusable for current + prev) ────────
interface PeriodKpis {
  dossiers_en_cours: number;
  devis_envoyes: number;
  devis_valides: number;
  devis_refuses: number;
  factures_en_attente_count: number;
  factures_en_attente_amount: number;
  factures_reglees_count: number;
  factures_reglees_amount: number;
  ca_genere: number;
  nb_factures: number;
  // delays
  rdv_delays: number[];
  devis_validation_delays: number[];
  dossiers_with_rdv: number;
  dossiers_total_for_coverage: number;
  devis_validated_with_dates: number;
  devis_total_for_coverage: number;
}

const ACCEPTED_DEVIS = ['validated', 'signed', 'order', 'accepted', 'validé', 'signé', 'commande'];
const REFUSED_DEVIS = ['refused', 'refusé', 'refuse', 'declined'];

function computePeriodKpis(
  projects: R[],
  projectIds: Set<number>,
  allFactures: R[],
  allDevis: R[],
  interventionsByProject: Record<number, R[]>,
  start: Date,
  end: Date
): PeriodKpis {
  // Règle métier : "Devis avec facture liée = automatiquement validé"
  // Construire le set des projectIds ayant au moins une facture sur la période
  // + map projectId → date de première facture (pour le délai de validation)
  const projectsWithFacture = new Set<number>();
  const firstInvoiceDateByProject = new Map<number, Date>();
  for (const f of allFactures) {
    if (!projectIds.has(f.projectId)) continue;
    const fd = parseDate(f.dateReelle || f.date);
    if (!fd || fd < start || fd > end) continue;
    const invoiceType = String(f.invoiceType || '').toLowerCase();
    if (!invoiceType.includes('avoir') && invoiceType !== 'credit_note') {
      projectsWithFacture.add(f.projectId);
      const existing = firstInvoiceDateByProject.get(f.projectId);
      if (!existing || fd < existing) {
        firstInvoiceDateByProject.set(f.projectId, fd);
      }
    }
  }
  const kpis: PeriodKpis = {
    dossiers_en_cours: 0, devis_envoyes: 0, devis_valides: 0, devis_refuses: 0,
    factures_en_attente_count: 0, factures_en_attente_amount: 0,
    factures_reglees_count: 0, factures_reglees_amount: 0,
    ca_genere: 0, nb_factures: 0,
    rdv_delays: [], devis_validation_delays: [],
    dossiers_with_rdv: 0, dossiers_total_for_coverage: 0,
    devis_validated_with_dates: 0, devis_total_for_coverage: 0,
  };

  // Projects
  const periodProjects = filterByPeriod(projects, start, end);
  for (const p of periodProjects) {
    const state = String(p.state || '').toLowerCase();
    if (!['clos', 'closed', 'terminé', 'done'].some(s => state.includes(s)) && !isCancelledLike(state)) {
      kpis.dossiers_en_cours++;
    }

    // Delays: rdv
    kpis.dossiers_total_for_coverage++;
    const projectDate = parseDate(p.dateReelle || p.date);
    const interventions = interventionsByProject[Number(p.id)] || [];
    let premierRdv: Date | null = null;
    for (const i of interventions) {
      const d = parseDate(i.dateReelle || i.date);
      if (d && (!premierRdv || d < premierRdv)) premierRdv = d;
    }
    if (projectDate && premierRdv) {
      kpis.dossiers_with_rdv++;
      kpis.rdv_delays.push(daysDiff(projectDate, premierRdv));
    }
  }

  // Factures
  for (const f of allFactures) {
    if (!projectIds.has(f.projectId)) continue;
    const fd = parseDate(f.dateReelle || f.date);
    if (!fd || fd < start || fd > end) continue;

    const invoiceType = String(f.invoiceType || '').toLowerCase();
    const isAvoir = invoiceType.includes('avoir') || invoiceType === 'credit_note';
    const totalHT = Number(f.data?.totalHT || f.totalHT || 0);
    const totalTTC = Number(f.data?.totalTTC || f.totalTTC || 0);
    const resteDuTTC = Number(f.data?.calcReglementsReste || f.calcReglementsReste || f.restePaidTTC || 0);
    const ratioHT = totalTTC > 0 ? totalHT / totalTTC : 1;
    const resteDuHT = resteDuTTC * ratioHT;

    if (!isAvoir) {
      kpis.nb_factures++;
      kpis.ca_genere += totalHT;
      if (resteDuHT > 0) {
        kpis.factures_en_attente_count++;
        kpis.factures_en_attente_amount += resteDuHT;
      } else {
        kpis.factures_reglees_count++;
        kpis.factures_reglees_amount += totalHT;
      }
    } else {
      kpis.ca_genere -= Math.abs(totalHT);
    }
  }

  // Devis
  for (const d of allDevis) {
    if (!projectIds.has(d.projectId)) continue;
    const dd = parseDate(d.dateReelle || d.date);
    if (!dd || dd < start || dd > end) continue;

    const state = String(d.state || '').toLowerCase();
    if (isCancelledLike(state)) continue;

    kpis.devis_envoyes++;
    kpis.devis_total_for_coverage++;

    // Un devis est "validé" si son statut est accepté OU si son projet a une facture
    const isAcceptedByState = ACCEPTED_DEVIS.some(s => state.includes(s));
    const isAcceptedByFacture = projectsWithFacture.has(d.projectId);

    if (isAcceptedByState || isAcceptedByFacture) {
      kpis.devis_valides++;
      // Delay: devis envoyé → validé
      const sentDate = parseDate(d.dateReelle || d.date);
      // Chercher la date de validation : d'abord dans le devis, sinon date 1ère facture du projet
      const validatedDate = parseDate(d.data?.dateValidation || d.data?.dateAccepted || d.dateValidation)
        || (isAcceptedByFacture ? firstInvoiceDateByProject.get(d.projectId) || null : null);
      if (sentDate && validatedDate && validatedDate >= sentDate) {
        kpis.devis_validated_with_dates++;
        kpis.devis_validation_delays.push(daysDiff(sentDate, validatedDate));
      }
    } else if (REFUSED_DEVIS.some(s => state.includes(s))) {
      kpis.devis_refuses++;
    }
  }

  return kpis;
}

function computeTrend(current: number, prev: number): { delta: number; pct: number } | null {
  if (prev === 0 && current === 0) return null;
  const delta = round2(current - prev);
  const pct = prev !== 0 ? round2((delta / Math.abs(prev)) * 100) : (current > 0 ? 100 : 0);
  return { delta, pct };
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = avg(arr);
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ── Severity from risk_blockage ──────────────────────────
function severity(risk: number): 'low' | 'medium' | 'high' {
  if (risk >= 70) return 'high';
  if (risk >= 35) return 'medium';
  return 'low';
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const authResult = await authenticateApporteur(req);
    if (!authResult) {
      console.warn('[GET-APPORTEUR-STATS] authenticateApporteur returned null — rejecting request');
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { apporteurId, apogeeClientId: commanditaireId, agencySlug, apporteurName } = authResult;
    const body = await req.json().catch(() => ({}));
    const { period, from, to } = body;
    const range = getDateRange(period, from, to);

    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const baseUrl = `https://${agencySlug}.hc-apogee.fr/api`;

    const fetchEndpoint = async (ep: string): Promise<R[]> => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(`${baseUrl}/${ep}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ API_KEY: apiKey }),
          signal: controller.signal,
        });
        clearTimeout(tid);
        if (!res.ok) return [];
        const parsed = await res.json();
        if (Array.isArray(parsed)) return parsed;
        if (parsed?.data && Array.isArray(parsed.data)) return parsed.data;
        // Try common wrappers
        for (const v of Object.values(parsed || {})) {
          if (Array.isArray(v) && v.length > 0 && typeof (v as R[])[0] === 'object') return v as R[];
        }
        return [];
      } catch { return []; }
    };

    // ── Single fetch per endpoint ────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const [allProjects, allFactures, allDevis, allInterventions, allClients, demandsResult] = await Promise.all([
      fetchEndpoint('apiGetProjects'),
      fetchEndpoint('apiGetFactures'),
      fetchEndpoint('apiGetDevis'),
      fetchEndpoint('apiGetInterventions'),
      fetchEndpoint('apiGetClients'),
      supabaseAdmin
        .from('apporteur_intervention_requests')
        .select('id, status, created_at')
        .eq('apporteur_id', apporteurId),
    ]);

    // Index clients by id for name resolution
    const clientsById: Record<number, R> = {};
    for (const c of allClients) {
      if (c.id != null) clientsById[Number(c.id)] = c;
    }

    // ── Filter projects by commanditaireId once ──────────
    const projects = allProjects.filter((p: R) => {
      const cmdId = p.data?.commanditaireId;
      return cmdId != null && String(cmdId) === String(commanditaireId);
    });
    const projectIds = new Set(projects.map((p: R) => Number(p.id)));

    // Index interventions by projectId
    const interventionsByProject: Record<number, R[]> = {};
    for (const i of allInterventions) {
      if (i.projectId && projectIds.has(Number(i.projectId))) {
        const pid = Number(i.projectId);
        if (!interventionsByProject[pid]) interventionsByProject[pid] = [];
        interventionsByProject[pid].push(i);
      }
    }

    // ── Compute KPIs for current + prev ──────────────────
    const cur = computePeriodKpis(projects, projectIds, allFactures, allDevis, interventionsByProject, range.start, range.end);
    const prev = computePeriodKpis(projects, projectIds, allFactures, allDevis, interventionsByProject, range.prevStart, range.prevEnd);

    const curTauxTransformation = cur.devis_envoyes > 0 ? round2((cur.devis_valides / cur.devis_envoyes) * 100) : 0;
    const prevTauxTransformation = prev.devis_envoyes > 0 ? round2((prev.devis_valides / prev.devis_envoyes) * 100) : 0;
    const curPanierMoyen = cur.nb_factures > 0 ? round2(cur.ca_genere / cur.nb_factures) : 0;
    const curAvgRdvDelay = round2(avg(cur.rdv_delays));
    const prevAvgRdvDelay = round2(avg(prev.rdv_delays));
    const curAvgDevisDelay = round2(avg(cur.devis_validation_delays));
    const coverageRdv = cur.dossiers_total_for_coverage > 0 ? round2((cur.dossiers_with_rdv / cur.dossiers_total_for_coverage) * 100) : 0;
    const coverageDevis = cur.devis_total_for_coverage > 0 ? round2((cur.devis_validated_with_dates / cur.devis_total_for_coverage) * 100) : 0;

    // ── Trends ───────────────────────────────────────────
    const trends: Record<string, { delta: number; pct: number } | null> = {
      dossiers_en_cours: computeTrend(cur.dossiers_en_cours, prev.dossiers_en_cours),
      ca_genere: computeTrend(cur.ca_genere, prev.ca_genere),
      taux_transformation: computeTrend(curTauxTransformation, prevTauxTransformation),
      avg_rdv_delay_days: computeTrend(curAvgRdvDelay, prevAvgRdvDelay),
      devis_envoyes: computeTrend(cur.devis_envoyes, prev.devis_envoyes),
      devis_valides: computeTrend(cur.devis_valides, prev.devis_valides),
      factures_en_attente: computeTrend(cur.factures_en_attente_count, prev.factures_en_attente_count),
      factures_reglees: computeTrend(cur.factures_reglees_count, prev.factures_reglees_count),
      panier_moyen: computeTrend(curPanierMoyen, prev.nb_factures > 0 ? round2(prev.ca_genere / prev.nb_factures) : 0),
    };

    // ── Répartition univers ──────────────────────────────
    const universMap: Record<string, { label: string; count: number }> = {};
    const periodProjects = filterByPeriod(projects, range.start, range.end);
    for (const p of periodProjects) {
      const univs = p.data?.universes || [];
      if (!Array.isArray(univs) || univs.length === 0) {
        const k = 'non_classe';
        if (!universMap[k]) universMap[k] = { label: 'Non classé', count: 0 };
        universMap[k].count++;
        continue;
      }
      for (const u of univs) {
        const code = typeof u === 'string' ? u : (u?.code || u?.label || String(u));
        const label = typeof u === 'string' ? u : (u?.label || u?.code || String(u));
        const k = String(code).toLowerCase().replace(/\s+/g, '_');
        if (!universMap[k]) universMap[k] = { label: String(label), count: 0 };
        universMap[k].count++;
      }
    }
    const totalUnivCount = Object.values(universMap).reduce((s, e) => s + e.count, 0);
    const repartition_univers = Object.entries(universMap)
      .map(([code, { label, count }]) => ({
        code, label, count,
        percentage: totalUnivCount > 0 ? round2((count / totalUnivCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // ── Score collaboration ──────────────────────────────
    const transfo_norm = clamp(curTauxTransformation, 0, 100);
    const volume_norm = clamp((periodProjects.length / TARGET_VOLUME) * 100, 0, 100);
    // Régularité: distribute dossiers by week, compute std_dev
    const weekBuckets: Record<string, number> = {};
    for (const p of periodProjects) {
      const d = parseDate(p.dateReelle || p.date);
      if (!d) continue;
      // ISO week key
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const wk = fmt(weekStart);
      weekBuckets[wk] = (weekBuckets[wk] || 0) + 1;
    }
    const weekCounts = Object.values(weekBuckets);
    const regularite_norm = clamp(100 - stdDev(weekCounts) * REGULARITY_FACTOR, 0, 100);
    const delay_norm = clamp(100 - (curAvgDevisDelay / TARGET_DELAY) * 100, 0, 100);

    const transfo_score = round2(transfo_norm * 0.4);
    const volume_score = round2(volume_norm * 0.2);
    const regularite_score = round2(regularite_norm * 0.2);
    const delay_score = round2(delay_norm * 0.2);
    const collabScore = round2(transfo_score + volume_score + regularite_score + delay_score);
    const collabLevel = collabScore >= 75 ? 'gold' : collabScore >= 55 ? 'silver' : 'bronze';

    // ── Helper: résoudre le nom client d'un projet ──────
    function resolveClientName(proj: R | undefined): string {
      if (!proj) return '';
      // 1. Chercher le client via clientId dans le dictionnaire clients
      const clientId = proj.clientId || proj.client_id;
      if (clientId != null) {
        const client = clientsById[Number(clientId)];
        if (client) {
          const name = client.raisonSociale || client.nom || client.name || client.displayName || '';
          if (name) return name;
        }
      }
      // 2. Client embarqué dans le projet
      const embeddedClient = proj.client || proj.data?.client;
      if (embeddedClient) {
        const name = embeddedClient.raisonSociale || embeddedClient.nom || embeddedClient.name || embeddedClient.displayName || '';
        if (name) return name;
      }
      // 3. Fallback: label du projet
      return proj.label || '';
    }

    // ── Alertes ──────────────────────────────────────────
    const alertes: Array<{
      type: string; severity: string; count: number; amount?: number;
      risk_blockage: number; sample_refs: string[]; sample_labels: string[];
    }> = [];
    const now = new Date();

    // Projets ayant au moins une facture (devis implicitement validé)
    const projectsWithFacture = new Set<number>();
    for (const f of allFactures) {
      if (!projectIds.has(f.projectId)) continue;
      const invoiceType = String(f.invoiceType || '').toLowerCase();
      if (!invoiceType.includes('avoir') && invoiceType !== 'credit_note') {
        projectsWithFacture.add(Number(f.projectId));
      }
    }

    const overdueInvoices: { ref: string; label: string; days: number; amount: number }[] = [];
    for (const f of allFactures) {
      if (!projectIds.has(f.projectId)) continue;
      const resteDu = Number(f.data?.calcReglementsReste || f.calcReglementsReste || 0);
      if (resteDu <= 0) continue;
      const fd = parseDate(f.dateReelle || f.date);
      if (!fd) continue;
      const age = daysDiff(fd, now);
      if (age > 30) {
        const totalHT = Number(f.data?.totalHT || f.totalHT || 0);
        const proj = projects.find((p: R) => Number(p.id) === Number(f.projectId));
        overdueInvoices.push({ 
          ref: String(proj?.ref || f.projectId), 
          label: resolveClientName(proj) || String(proj?.ref || f.projectId),
          days: age, 
          amount: totalHT 
        });
      }
    }
    if (overdueInvoices.length > 0) {
      const totalAmount = round2(overdueInvoices.reduce((s, i) => s + i.amount, 0));
      let risk = 0;
      for (const inv of overdueInvoices) {
        risk += inv.days > 60 ? 60 : 40;
      }
      risk = clamp(risk, 0, 100);
      alertes.push({
        type: 'factures_retard_30j',
        severity: severity(risk),
        count: overdueInvoices.length,
        amount: totalAmount,
        risk_blockage: risk,
        sample_refs: overdueInvoices.map(i => i.ref),
        sample_labels: overdueInvoices.map(i => i.label),
      });
    }

    // Devis non validés > 15j
    // Règle : un devis dont le projet a déjà une facture OU dont le projet
    // est dans un état terminal (facturé, clos, annulé) n'est PAS en retard.
    const TERMINAL_PROJECT_STATES = ['done', 'closed', 'canceled', 'cancelled', 'billed', 'clos', 'facture', 'annul'];
    const overdueDevis: { ref: string; label: string }[] = [];
    const seenProjectsForDevisAlerte = new Set<number>();
    for (const d of allDevis) {
      if (!projectIds.has(d.projectId)) continue;
      // Skip si le projet a déjà une facture (= devis implicitement validé)
      if (projectsWithFacture.has(d.projectId)) continue;
      // Skip si le projet est dans un état terminal
      const proj = projects.find((p: R) => Number(p.id) === Number(d.projectId));
      const projState = String(proj?.state || '').toLowerCase();
      if (TERMINAL_PROJECT_STATES.some(s => projState.includes(s))) continue;
      const state = String(d.state || '').toLowerCase();
      if (isCancelledLike(state)) continue;
      if (ACCEPTED_DEVIS.some(s => state.includes(s))) continue;
      if (REFUSED_DEVIS.some(s => state.includes(s))) continue;
      const dd = parseDate(d.dateReelle || d.date);
      if (!dd) continue;
      if (daysDiff(dd, now) > 15) {
        // Éviter doublons par projet (plusieurs devis sur un même dossier)
        if (seenProjectsForDevisAlerte.has(d.projectId)) continue;
        seenProjectsForDevisAlerte.add(d.projectId);
        const ref = String(proj?.ref || d.projectId);
        overdueDevis.push({ ref, label: resolveClientName(proj) || ref });
      }
    }
    if (overdueDevis.length > 0) {
      const risk = clamp(overdueDevis.length * 25, 0, 100);
      alertes.push({
        type: 'devis_non_valide_15j',
        severity: severity(risk),
        count: overdueDevis.length,
        risk_blockage: risk,
        sample_refs: overdueDevis.map(d => d.ref),
        sample_labels: overdueDevis.map(d => d.label),
      });
    }

    // Dossiers sans RDV
    const noRdvItems: { ref: string; label: string }[] = [];
    for (const p of periodProjects) {
      const interventions = interventionsByProject[Number(p.id)] || [];
      if (interventions.length === 0) {
        const ref = String(p.ref || p.id);
        noRdvItems.push({ ref, label: resolveClientName(p) || ref });
      }
    }
    if (noRdvItems.length > 0) {
      const risk = clamp(noRdvItems.length * 20, 0, 100);
      alertes.push({
        type: 'dossier_sans_rdv',
        severity: severity(risk),
        count: noRdvItems.length,
        risk_blockage: risk,
        sample_refs: noRdvItems.map(d => d.ref),
        sample_labels: noRdvItems.map(d => d.label),
      });
    }

    // Dossiers sans action > 7j
    const staleItems: { ref: string; label: string }[] = [];
    for (const p of periodProjects) {
      const state = String(p.state || '').toLowerCase();
      if (['clos', 'closed', 'terminé', 'done'].some(s => state.includes(s))) continue;
      if (isCancelledLike(state)) continue;
      const dates: Date[] = [];
      const pd = parseDate(p.dateReelle || p.date);
      if (pd) dates.push(pd);
      for (const i of (interventionsByProject[Number(p.id)] || [])) {
        const d = parseDate(i.dateReelle || i.date);
        if (d) dates.push(d);
      }
      const lastActivity = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;
      if (lastActivity && daysDiff(lastActivity, now) > 7) {
        const ref = String(p.ref || p.id);
        staleItems.push({ ref, label: resolveClientName(p) || ref });
      }
    }
    if (staleItems.length > 0) {
      const risk = clamp(staleItems.length * 20, 0, 100);
      alertes.push({
        type: 'dossier_sans_action_7j',
        severity: severity(risk),
        count: staleItems.length,
        risk_blockage: risk,
        sample_refs: staleItems.map(d => d.ref),
        sample_labels: staleItems.map(d => d.label),
      });
    }

    // RDV annulés
    const cancelledItems: { ref: string; label: string }[] = [];
    for (const [pid, interventions] of Object.entries(interventionsByProject)) {
      for (const i of interventions) {
        const s = String(i.state || '').toLowerCase();
        if (['cancelled', 'canceled', 'annulé', 'annule'].some(k => s.includes(k))) {
          const proj = projects.find((p: R) => Number(p.id) === Number(pid));
          const ref = String(proj?.ref || pid);
          cancelledItems.push({ ref, label: resolveClientName(proj) || ref });
          break;
        }
      }
    }
    if (cancelledItems.length > 0) {
      const risk = clamp(cancelledItems.length * 15, 0, 100);
      alertes.push({
        type: 'rdv_annule',
        severity: severity(risk),
        count: cancelledItems.length,
        risk_blockage: risk,
        sample_refs: cancelledItems.map(d => d.ref),
        sample_labels: cancelledItems.map(d => d.label),
      });
    }

    // Devis refusés
    const refusedItems: { ref: string; label: string }[] = [];
    for (const d of allDevis) {
      if (!projectIds.has(d.projectId)) continue;
      const state = String(d.state || '').toLowerCase();
      if (REFUSED_DEVIS.some(s => state.includes(s))) {
        const proj = projects.find((p: R) => Number(p.id) === Number(d.projectId));
        const ref = String(proj?.ref || d.projectId);
        refusedItems.push({ ref, label: resolveClientName(proj) || ref });
      }
    }
    if (refusedItems.length > 0) {
      const risk = clamp(refusedItems.length * 10, 0, 100);
      alertes.push({
        type: 'devis_refuse',
        severity: severity(risk),
        count: refusedItems.length,
        risk_blockage: risk,
        sample_refs: refusedItems.map(d => d.ref),
        sample_labels: refusedItems.map(d => d.label),
      });
    }

    // ── Series 12m ───────────────────────────────────────
    const series_ca: { month: string; value: number }[] = [];
    const series_dossiers: { month: string; value: number }[] = [];
    const series_transfo: { month: string; value: number }[] = [];
    const series_delays: { month: string; rdv: number; devis_validation: number; paiement: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const mDate = new Date(range.end.getFullYear(), range.end.getMonth() - i, 1);
      const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59);
      const monthKey = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;

      const mProjects = filterByPeriod(projects, mDate, mEnd);
      series_dossiers.push({ month: monthKey, value: mProjects.length });

      // CA
      let mCa = 0;
      for (const f of allFactures) {
        if (!projectIds.has(f.projectId)) continue;
        const fd = parseDate(f.dateReelle || f.date);
        if (!fd || fd < mDate || fd > mEnd) continue;
        const isAvoir = String(f.invoiceType || '').toLowerCase().includes('avoir');
        const ht = Number(f.data?.totalHT || f.totalHT || 0);
        mCa += isAvoir ? -Math.abs(ht) : ht;
      }
      series_ca.push({ month: monthKey, value: round2(mCa) });

      // Transfo — même règle : devis facturé = validé
      const mProjectsWithFacture = new Set<number>();
      for (const f of allFactures) {
        if (!projectIds.has(f.projectId)) continue;
        const fd = parseDate(f.dateReelle || f.date);
        if (!fd || fd < mDate || fd > mEnd) continue;
        const it = String(f.invoiceType || '').toLowerCase();
        if (!it.includes('avoir') && it !== 'credit_note') mProjectsWithFacture.add(f.projectId);
      }

      let mDevisTotal = 0, mDevisValides = 0;
      for (const d of allDevis) {
        if (!projectIds.has(d.projectId)) continue;
        const dd = parseDate(d.dateReelle || d.date);
        if (!dd || dd < mDate || dd > mEnd) continue;
        const state = String(d.state || '').toLowerCase();
        if (isCancelledLike(state)) continue;
        mDevisTotal++;
        if (ACCEPTED_DEVIS.some(s => state.includes(s)) || mProjectsWithFacture.has(d.projectId)) mDevisValides++;
      }
      series_transfo.push({ month: monthKey, value: mDevisTotal > 0 ? round2((mDevisValides / mDevisTotal) * 100) : 0 });

      // Delays
      const mRdvDelays: number[] = [];
      const mDevisDelays: number[] = [];
      for (const p of mProjects) {
        const pd = parseDate(p.dateReelle || p.date);
        const ints = interventionsByProject[Number(p.id)] || [];
        let firstRdv: Date | null = null;
        for (const intr of ints) {
          const d = parseDate(intr.dateReelle || intr.date);
          if (d && (!firstRdv || d < firstRdv)) firstRdv = d;
        }
        if (pd && firstRdv) mRdvDelays.push(daysDiff(pd, firstRdv));
      }
      // Payment delay: facture date → payment (approx: if resteDu=0, use facture date as paid date)
      let mPaiementDelays: number[] = [];
      for (const f of allFactures) {
        if (!projectIds.has(f.projectId)) continue;
        const fd = parseDate(f.dateReelle || f.date);
        if (!fd || fd < mDate || fd > mEnd) continue;
        const resteDu = Number(f.data?.calcReglementsReste || 0);
        if (resteDu <= 0 && fd) {
          // Paid — approximate delay as 0 (no real payment date available)
          mPaiementDelays.push(0);
        }
      }
      series_delays.push({
        month: monthKey,
        rdv: round2(avg(mRdvDelays)),
        devis_validation: round2(avg(mDevisDelays)),
        paiement: round2(avg(mPaiementDelays)),
      });
    }

    // ── Build response ───────────────────────────────────
    const response = {
      period: { mode: range.mode, from: fmt(range.start), to: fmt(range.end) },
      kpis: {
        dossiers_en_cours: cur.dossiers_en_cours,
        devis_envoyes: cur.devis_envoyes,
        devis_valides: cur.devis_valides,
        devis_refuses: cur.devis_refuses,
        factures_en_attente: { count: cur.factures_en_attente_count, amount: round2(cur.factures_en_attente_amount) },
        factures_reglees: { count: cur.factures_reglees_count, amount: round2(cur.factures_reglees_amount) },
        ca_genere: round2(cur.ca_genere),
        panier_moyen: curPanierMoyen,
        taux_transformation: curTauxTransformation,
        avg_rdv_delay_days: curAvgRdvDelay,
        avg_devis_validation_delay_days: curAvgDevisDelay,
        coverage_rdv_delay: coverageRdv,
        coverage_devis_validation_delay: coverageDevis,
      },
      trends,
      repartition_univers,
      collaboration: {
        score: round2(collabScore),
        level: collabLevel,
        details: { volume_score, regularite_score, transfo_score, delay_score },
      },
      alertes,
      series_12m: {
        ca_ht: series_ca,
        dossiers: series_dossiers,
        taux_transformation: series_transfo,
        avg_delays_days: series_delays,
      },
    };

    console.log(`[GET-APPORTEUR-STATS] V2 stats for ${apporteurName} (cmdId: ${commanditaireId}), ${periodProjects.length} projects in period`);

    return withCors(req, new Response(
      JSON.stringify({ success: true, data: response }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[GET-APPORTEUR-STATS] Exception:', error instanceof Error ? error.message : error);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Erreur interne' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
