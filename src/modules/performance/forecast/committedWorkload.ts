/**
 * Forecast — Charge engagée future
 * Phase 6 Lot 2
 *
 * Calcule la charge certaine/quasi-certaine à partir des créneaux planning,
 * visites et interventions futurs. Réutilise les primitives du moteur historique
 * pour la consolidation et l'allocation.
 */

import { resolveDuration } from '../engine/duration';
import { normalizeWorkItemDates, scoreWorkItemSimilarity, shouldMergeWorkItems, mergeWorkItems } from '../engine/matching';
import { allocateDuration } from '../engine/allocation';
import { PRODUCTIVE_TYPES, NON_PRODUCTIVE_TYPES, SAV_EXACT_TYPES, MATCHING_THRESHOLDS } from '../engine/rules';
import type { WorkItem, MatchOutcome, DurationSource } from '../engine/types';

import type {
  ForecastWorkItem,
  ForecastWorkSource,
  ForecastWorkCategory,
  CommittedWorkloadInput,
  ForecastCommittedWorkload,
  ForecastCommittedTeamStats,
  ForecastConsolidationTrace,
  ForecastHorizon,
  ForecastLoadConfidenceLevel,
  ForecastPenalty,
  ForecastPenaltyCode,
} from './types';

// ============================================================================
// PUBLIC API
// ============================================================================

export interface CommittedWorkloadResult {
  workloads: ForecastCommittedWorkload[];
  teamStats: ForecastCommittedTeamStats;
  items: ForecastWorkItem[];
  matchLog: Array<{ aId: string; bId: string; outcome: MatchOutcome; score: number }>;
}

/**
 * Main entry: compute committed workload for a given horizon.
 */
export function computeCommittedWorkload(
  input: CommittedWorkloadInput,
  horizon: ForecastHorizon
): CommittedWorkloadResult {
  // 1. Build future work items from all sources
  const { items: rawItems } = buildFutureWorkItems(input);

  // 2. Consolidate (merge duplicates planning↔visite)
  const { items: consolidated, matchLog, trace: globalTrace } = consolidateFutureItems(rawItems);

  // 3. Aggregate by technician with allocation
  const workloads = aggregateCommittedByTechnician(
    consolidated,
    input.technicians,
    horizon,
    globalTrace,
    input.defaultTaskDurationMinutes
  );

  // 4. Team stats
  const teamStats = aggregateCommittedTeamStats(workloads, horizon);

  return { workloads, teamStats, items: consolidated, matchLog };
}

// ============================================================================
// STEP 1 — BUILD FUTURE WORK ITEMS
// ============================================================================

function buildFutureWorkItems(
  input: CommittedWorkloadInput
): { items: ForecastWorkItem[] } {
  const items: ForecastWorkItem[] = [];
  const { period, defaultTaskDurationMinutes } = input;

  // A. Extract future visite items from interventions
  items.push(...extractFutureVisiteItems(input.interventions, input.projectsById, period, defaultTaskDurationMinutes));

  // B. Extract future intervention fallback items (without visites)
  items.push(...extractFutureInterventionFallbackItems(input.interventions, input.projectsById, period, defaultTaskDurationMinutes, items));

  // C. Extract future planning items
  items.push(...extractFuturePlanningItems(input.creneaux, input.interventions, period, defaultTaskDurationMinutes));

  return { items };
}

// ============================================================================
// EXTRACT — Visites futures
// ============================================================================

function extractFutureVisiteItems(
  interventions: Record<string, unknown>[],
  projectsById: Map<string, Record<string, unknown>>,
  period: { start: Date; end: Date },
  defaultDuration: number
): ForecastWorkItem[] {
  const items: ForecastWorkItem[] = [];

  for (const interv of interventions) {
    const visites = interv.visites as Record<string, unknown>[] | undefined;
    if (!visites || !Array.isArray(visites)) continue;

    const interventionId = String(interv.id || '');
    const projectId = interv.dossierId ? String(interv.dossierId) : undefined;
    const type = interv.type ? String(interv.type).toLowerCase() : undefined;
    const type2 = interv.type2 ? String(interv.type2).toLowerCase() : undefined;
    const isSav = detectSav(type, type2);
    const category = classifyCategory(type, type2);

    for (const visite of visites) {
      const dateStr = visite.date || visite.dateVisite || visite.start;
      if (!dateStr) continue;

      const start = new Date(String(dateStr));
      if (isNaN(start.getTime())) continue;
      if (!isInFuturePeriod(start, period)) continue;

      // Technicians
      const techs = extractTechnicians(visite);
      if (techs.length === 0) continue;

      // Duration
      const dur = resolveDuration({
        duration: asNumber(visite.dureeMinutes ?? visite.duree ?? visite.duration),
        start: dateStr as string,
        end: (visite.dateFin || visite.end) as string | undefined,
        heureDebut: visite.heureDebut as string | undefined,
        heureFin: visite.heureFin as string | undefined,
      }, defaultDuration);

      const end = new Date(start.getTime() + dur.minutes * 60000);

      items.push({
        id: `v-${interventionId}-${visite.id || start.toISOString()}`,
        source: 'visite',
        start,
        end,
        durationMinutes: dur.minutes,
        durationSource: dur.source,
        technicians: techs,
        category,
        interventionId,
        projectId,
        type,
        type2,
        isSav,
      });
    }
  }

  return items;
}

// ============================================================================
// EXTRACT — Interventions fallback (sans visite)
// ============================================================================

function extractFutureInterventionFallbackItems(
  interventions: Record<string, unknown>[],
  projectsById: Map<string, Record<string, unknown>>,
  period: { start: Date; end: Date },
  defaultDuration: number,
  existingItems: ForecastWorkItem[]
): ForecastWorkItem[] {
  const items: ForecastWorkItem[] = [];
  const coveredInterventionIds = new Set(existingItems.map(i => i.interventionId).filter(Boolean));

  for (const interv of interventions) {
    const interventionId = String(interv.id || '');
    if (coveredInterventionIds.has(interventionId)) continue;

    // Must have a future date
    const dateStr = interv.dateIntervention || interv.date || interv.start;
    if (!dateStr) continue;

    const start = new Date(String(dateStr));
    if (isNaN(start.getTime())) continue;
    if (!isInFuturePeriod(start, period)) continue;

    // Must have assigned technician
    const techs = extractTechnicians(interv);
    if (techs.length === 0) continue;

    const type = interv.type ? String(interv.type).toLowerCase() : undefined;
    const type2 = interv.type2 ? String(interv.type2).toLowerCase() : undefined;
    const projectId = interv.dossierId ? String(interv.dossierId) : undefined;

    const dur = resolveDuration({
      duration: asNumber(interv.dureeMinutes ?? interv.duree ?? interv.duration),
      start: dateStr as string,
      end: (interv.dateFin || interv.end) as string | undefined,
    }, defaultDuration);

    const end = new Date(start.getTime() + dur.minutes * 60000);

    items.push({
      id: `i-${interventionId}`,
      source: 'intervention',
      start,
      end,
      durationMinutes: dur.minutes,
      durationSource: dur.source,
      technicians: techs,
      category: classifyCategory(type, type2),
      interventionId,
      projectId,
      type,
      type2,
      isSav: detectSav(type, type2),
    });
  }

  return items;
}

// ============================================================================
// EXTRACT — Créneaux planning futurs
// ============================================================================

function extractFuturePlanningItems(
  creneaux: Record<string, unknown>[],
  interventions: Record<string, unknown>[],
  period: { start: Date; end: Date },
  defaultDuration: number
): ForecastWorkItem[] {
  const items: ForecastWorkItem[] = [];

  // Build intervention lookup for enrichment
  const intervById = new Map<string, Record<string, unknown>>();
  for (const interv of interventions) {
    if (interv.id) intervById.set(String(interv.id), interv);
  }

  for (const creneau of creneaux) {
    const dateStr = creneau.date || creneau.start;
    if (!dateStr) continue;

    const start = new Date(String(dateStr));
    if (isNaN(start.getTime())) continue;
    if (!isInFuturePeriod(start, period)) continue;

    // Skip absence/conge types — they're not workload
    const refType = String(creneau.refType || '').toLowerCase();
    if (isAbsenceRefType(refType)) continue;

    // Technicians from usersIds
    const techs = extractCreneauTechnicians(creneau);
    if (techs.length === 0) continue;

    // Try to link to intervention for type enrichment
    const linkedIntervId = creneau.interventionId ? String(creneau.interventionId) : undefined;
    const linkedInterv = linkedIntervId ? intervById.get(linkedIntervId) : undefined;

    const type = linkedInterv?.type ? String(linkedInterv.type).toLowerCase()
      : refType !== 'visite-interv' ? refType : undefined;
    const type2 = linkedInterv?.type2 ? String(linkedInterv.type2).toLowerCase() : undefined;

    const dur = resolveDuration({
      planningDuree: asNumber(creneau.duree),
      start: dateStr as string,
      end: (creneau.dateFin || creneau.end) as string | undefined,
    }, defaultDuration);

    const end = new Date(start.getTime() + dur.minutes * 60000);

    items.push({
      id: `p-${creneau.id || start.toISOString()}`,
      source: 'planning',
      start,
      end,
      durationMinutes: dur.minutes,
      durationSource: dur.source,
      technicians: techs,
      category: classifyCategory(type, type2),
      interventionId: linkedIntervId,
      projectId: linkedInterv?.dossierId ? String(linkedInterv.dossierId) : undefined,
      type,
      type2,
      isSav: detectSav(type, type2),
    });
  }

  return items;
}

// ============================================================================
// STEP 2 — CONSOLIDATION (avoid double counting)
// ============================================================================

interface ConsolidationResult {
  items: ForecastWorkItem[];
  matchLog: Array<{ aId: string; bId: string; outcome: MatchOutcome; score: number }>;
  trace: ForecastConsolidationTrace;
}

function consolidateFutureItems(rawItems: ForecastWorkItem[]): ConsolidationResult {
  const matchLog: Array<{ aId: string; bId: string; outcome: MatchOutcome; score: number }> = [];
  const trace: ForecastConsolidationTrace = { merged: 0, keptSeparate: 0, discarded: 0, ambiguous: 0 };

  if (rawItems.length <= 1) {
    return { items: rawItems, matchLog, trace: { ...trace, keptSeparate: rawItems.length } };
  }

  // Convert to engine WorkItems for matching
  const asWorkItems: WorkItem[] = rawItems.map(toEngineWorkItem);
  const consumed = new Set<number>();
  const result: ForecastWorkItem[] = [];

  for (let i = 0; i < asWorkItems.length; i++) {
    if (consumed.has(i)) continue;

    let bestJ = -1;
    let bestScore = 0;

    for (let j = i + 1; j < asWorkItems.length; j++) {
      if (consumed.has(j)) continue;

      const score = scoreWorkItemSimilarity(asWorkItems[i], asWorkItems[j]);
      if (score > bestScore) {
        bestScore = score;
        bestJ = j;
      }
    }

    if (bestJ >= 0 && bestScore >= MATCHING_THRESHOLDS.mergeMinScore) {
      // Merge
      const merged = mergeWorkItems(asWorkItems[i], asWorkItems[bestJ]);
      const mergedForecast = fromEngineWorkItem(merged, rawItems[i], rawItems[bestJ]);
      result.push(mergedForecast);
      consumed.add(i);
      consumed.add(bestJ);
      trace.merged++;
      matchLog.push({ aId: rawItems[i].id, bId: rawItems[bestJ].id, outcome: 'merged', score: bestScore });
    } else if (bestJ >= 0 && bestScore > 0.3) {
      // Ambiguous — keep both but log
      trace.ambiguous++;
      matchLog.push({ aId: rawItems[i].id, bId: rawItems[bestJ].id, outcome: 'kept_separate', score: bestScore });
      // Don't consume — let them be handled individually
      result.push(rawItems[i]);
      consumed.add(i);
    } else {
      result.push(rawItems[i]);
      consumed.add(i);
      trace.keptSeparate++;
    }
  }

  // Add remaining unconsumed
  for (let k = 0; k < rawItems.length; k++) {
    if (!consumed.has(k)) {
      result.push(rawItems[k]);
      trace.keptSeparate++;
    }
  }

  return { items: result, matchLog, trace };
}

// ============================================================================
// STEP 3 — AGGREGATE BY TECHNICIAN
// ============================================================================

function aggregateCommittedByTechnician(
  items: ForecastWorkItem[],
  technicians: Map<string, { id: string; name: string }>,
  horizon: ForecastHorizon,
  globalTrace: ForecastConsolidationTrace,
  defaultDuration: number
): ForecastCommittedWorkload[] {
  // Allocate each item across its technicians
  const techMinutes = new Map<string, {
    productive: number;
    nonProductive: number;
    sav: number;
    other: number;
    total: number;
    interventionIds: Set<string>;
    projectIds: Set<string>;
    sharedSlots: number;
    sourceBreakdown: Record<ForecastWorkSource, number>;
    durationSourceBreakdown: Record<string, number>;
    itemCount: number;
    defaultDurationCount: number;
    planningOnlyCount: number;
    explicitComputedCount: number;
  }>();

  const initTech = () => ({
    productive: 0, nonProductive: 0, sav: 0, other: 0, total: 0,
    interventionIds: new Set<string>(),
    projectIds: new Set<string>(),
    sharedSlots: 0,
    sourceBreakdown: { planning: 0, visite: 0, intervention: 0 } as Record<ForecastWorkSource, number>,
    durationSourceBreakdown: { explicit: 0, computed: 0, planning: 0, business_default: 0, unknown: 0 },
    itemCount: 0,
    defaultDurationCount: 0,
    planningOnlyCount: 0,
    explicitComputedCount: 0,
  });

  for (const item of items) {
    if (item.technicians.length === 0) continue;

    const alloc = allocateDuration(item.durationMinutes, item.technicians);
    const isShared = item.technicians.length > 1;

    for (const [techId, mins] of alloc.allocations) {
      if (!techMinutes.has(techId)) techMinutes.set(techId, initTech());
      const t = techMinutes.get(techId)!;

      // Category allocation
      switch (item.category) {
        case 'productive': t.productive += mins; break;
        case 'non_productive': t.nonProductive += mins; break;
        case 'sav': t.sav += mins; break;
        case 'other': t.other += mins; break;
      }
      t.total += mins;

      // Tracking
      if (item.interventionId) t.interventionIds.add(item.interventionId);
      if (item.projectId) t.projectIds.add(item.projectId);
      if (isShared) t.sharedSlots++;

      t.sourceBreakdown[item.source] += mins;
      t.durationSourceBreakdown[item.durationSource] = (t.durationSourceBreakdown[item.durationSource] || 0) + mins;

      t.itemCount++;
      if (item.durationSource === 'business_default') t.defaultDurationCount++;
      if (item.source === 'planning') t.planningOnlyCount++;
      if (item.durationSource === 'explicit' || item.durationSource === 'computed') t.explicitComputedCount++;
    }
  }

  // Build results
  const results: ForecastCommittedWorkload[] = [];

  for (const [techId, data] of techMinutes) {
    const techInfo = technicians.get(techId);
    const name = techInfo?.name ?? `Tech ${techId}`;

    const { level, penalties } = computeLoadConfidence(data);

    results.push({
      technicianId: techId,
      name,
      horizon,
      committedMinutes: data.total,
      committedProductiveMinutes: data.productive,
      committedNonProductiveMinutes: data.nonProductive,
      committedSavMinutes: data.sav,
      committedOtherMinutes: data.other,
      interventionsCount: data.interventionIds.size,
      dossiersCount: data.projectIds.size,
      sharedSlots: data.sharedSlots,
      loadConfidenceLevel: level,
      loadPenalties: penalties,
      sourceBreakdown: {
        planning: data.sourceBreakdown.planning,
        visite: data.sourceBreakdown.visite,
        intervention: data.sourceBreakdown.intervention,
      },
      durationSourceBreakdown: {
        explicit: data.durationSourceBreakdown.explicit || 0,
        computed: data.durationSourceBreakdown.computed || 0,
        planning: data.durationSourceBreakdown.planning || 0,
        business_default: data.durationSourceBreakdown.business_default || 0,
        unknown: data.durationSourceBreakdown.unknown || 0,
      },
      consolidationTrace: globalTrace,
    });
  }

  return results;
}

// ============================================================================
// STEP 4 — TEAM AGGREGATION
// ============================================================================

function aggregateCommittedTeamStats(
  workloads: ForecastCommittedWorkload[],
  horizon: ForecastHorizon
): ForecastCommittedTeamStats {
  let totalCommitted = 0, productive = 0, nonProductive = 0, sav = 0, other = 0;
  let totalInterventions = 0, totalDossiers = 0;
  const confidenceCounts: Record<ForecastLoadConfidenceLevel, number> = { high: 0, medium: 0, low: 0 };

  for (const w of workloads) {
    totalCommitted += w.committedMinutes;
    productive += w.committedProductiveMinutes;
    nonProductive += w.committedNonProductiveMinutes;
    sav += w.committedSavMinutes;
    other += w.committedOtherMinutes;
    totalInterventions += w.interventionsCount;
    totalDossiers += w.dossiersCount;
    confidenceCounts[w.loadConfidenceLevel]++;
  }

  const total = workloads.length;
  let avgConfidence: ForecastLoadConfidenceLevel = 'medium';
  if (total === 0) avgConfidence = 'low';
  else if (confidenceCounts.high > total / 2) avgConfidence = 'high';
  else if (confidenceCounts.low > total / 2) avgConfidence = 'low';

  return {
    horizon,
    totalCommittedMinutes: totalCommitted,
    productiveMinutes: productive,
    nonProductiveMinutes: nonProductive,
    savMinutes: sav,
    otherMinutes: other,
    totalInterventions,
    totalDossiers,
    averageLoadConfidenceLevel: avgConfidence,
  };
}

// ============================================================================
// LOAD CONFIDENCE SCORING
// ============================================================================

function computeLoadConfidence(data: {
  itemCount: number;
  defaultDurationCount: number;
  planningOnlyCount: number;
  explicitComputedCount: number;
}): { level: ForecastLoadConfidenceLevel; penalties: ForecastPenalty[] } {
  let score = 1.0;
  const penalties: ForecastPenalty[] = [];

  if (data.itemCount === 0) {
    return { level: 'low', penalties: [] };
  }

  const defaultRatio = data.defaultDurationCount / data.itemCount;
  const planningOnlyRatio = data.planningOnlyCount / data.itemCount;
  const explicitRatio = data.explicitComputedCount / data.itemCount;

  // Majority estimated durations
  if (defaultRatio > 0.5) {
    const p: ForecastPenalty = {
      code: 'DEFAULT_WEEKLY_HOURS' as ForecastPenaltyCode,
      reason: 'Durées majoritairement estimées par défaut',
      value: 0.15,
    };
    penalties.push(p);
    score -= p.value;
  }

  // No explicit/computed durations at all
  if (explicitRatio === 0) {
    const p: ForecastPenalty = {
      code: 'NO_CONTRACT' as ForecastPenaltyCode,
      reason: 'Aucune durée explicite ou calculée',
      value: 0.15,
    };
    penalties.push(p);
    score -= p.value;
  }

  // Majority planning-only source
  if (planningOnlyRatio > 0.7) {
    const p: ForecastPenalty = {
      code: 'PLANNING_ONLY_ABSENCES' as ForecastPenaltyCode,
      reason: 'Charge issue majoritairement du planning seul',
      value: 0.10,
    };
    penalties.push(p);
    score -= p.value;
  }

  score = Math.max(0, Math.round(score * 100) / 100);

  let level: ForecastLoadConfidenceLevel;
  if (score > 0.8) level = 'high';
  else if (score >= 0.6) level = 'medium';
  else level = 'low';

  return { level, penalties };
}

// ============================================================================
// HELPERS
// ============================================================================

function isInFuturePeriod(date: Date, period: { start: Date; end: Date }): boolean {
  return date.getTime() >= period.start.getTime() && date.getTime() <= period.end.getTime();
}

function isAbsenceRefType(refType: string): boolean {
  return ['conge', 'congé', 'absence', 'rappel', 'repos'].includes(refType);
}

function extractTechnicians(obj: Record<string, unknown>): string[] {
  // Try various fields
  const userId = obj.userId != null ? String(obj.userId) : undefined;
  const usersIds = obj.usersIds as unknown[];
  const techniciens = obj.techniciens as unknown[];

  const ids = new Set<string>();

  if (Array.isArray(usersIds)) {
    for (const id of usersIds) if (id != null) ids.add(String(id));
  }
  if (Array.isArray(techniciens)) {
    for (const t of techniciens) {
      if (t && typeof t === 'object' && 'id' in t) ids.add(String((t as Record<string, unknown>).id));
      else if (t != null) ids.add(String(t));
    }
  }
  if (userId) ids.add(userId);

  return [...ids].filter(id => id && id !== 'undefined' && id !== 'null');
}

function extractCreneauTechnicians(creneau: Record<string, unknown>): string[] {
  const usersIds = creneau.usersIds as unknown[];
  const userId = creneau.userId;

  const ids = new Set<string>();
  if (Array.isArray(usersIds)) {
    for (const id of usersIds) if (id != null) ids.add(String(id));
  }
  if (userId != null) ids.add(String(userId));

  return [...ids].filter(id => id && id !== 'undefined' && id !== 'null');
}

function classifyCategory(type?: string, type2?: string): ForecastWorkCategory {
  const combined = `${type || ''} ${type2 || ''}`.toLowerCase();
  if (SAV_EXACT_TYPES.some(t => type === t || type2 === t)) return 'sav';
  if (PRODUCTIVE_TYPES.some(t => combined.includes(t))) return 'productive';
  if (NON_PRODUCTIVE_TYPES.some(t => combined.includes(t))) return 'non_productive';
  return 'other';
}

function detectSav(type?: string, type2?: string): boolean {
  return SAV_EXACT_TYPES.some(t => type === t || type2 === t);
}

function asNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function toEngineWorkItem(fi: ForecastWorkItem): WorkItem {
  return {
    id: fi.id,
    source: fi.source,
    start: fi.start,
    end: fi.end,
    durationMinutes: fi.durationMinutes,
    durationSource: fi.durationSource as DurationSource,
    technicians: fi.technicians,
    category: fi.category,
    interventionId: fi.interventionId,
    projectId: fi.projectId,
    type: fi.type,
    type2: fi.type2,
    isSav: fi.isSav,
  };
}

function fromEngineWorkItem(merged: WorkItem, a: ForecastWorkItem, b: ForecastWorkItem): ForecastWorkItem {
  // Prefer visite over planning for source attribution
  const preferredSource: ForecastWorkSource = a.source === 'visite' ? 'visite'
    : b.source === 'visite' ? 'visite'
    : a.source === 'intervention' ? 'intervention'
    : b.source === 'intervention' ? 'intervention'
    : 'planning';

  return {
    id: merged.id,
    source: preferredSource,
    start: merged.start,
    end: merged.end,
    durationMinutes: merged.durationMinutes,
    durationSource: merged.durationSource as ForecastWorkItem['durationSource'],
    technicians: merged.technicians,
    category: merged.category as ForecastWorkCategory,
    interventionId: merged.interventionId,
    projectId: merged.projectId,
    type: merged.type,
    type2: merged.type2,
    isSav: merged.isSav,
  };
}
