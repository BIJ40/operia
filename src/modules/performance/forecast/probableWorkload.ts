/**
 * Forecast — Charge probable future
 * Phase 6 Lot 3
 *
 * Calcule la charge probable (non encore planifiée fermement) à partir des
 * données du chargeTravauxEngine. Séparé strictement de la charge engagée.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * V1 ASSUMPTIONS — documented design choices, not yet calibrated on history
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. UNASSIGNED ITEMS: Projects without a target technician are distributed
 *    equally across all known technicians. This is a deliberate V1 heuristic.
 *    → Penalty UNCERTAIN_TECH_ASSIGNMENT (0.15) is applied.
 *    → All unassigned items are forced to 'low' confidence tier.
 *    Future: keep as unallocated team-level bucket or use skill-based routing.
 *
 * 2. HORIZON SCALING: The factors (stateFactor × horizonMultiplier) are
 *    empirical, not calibrated on historical throughput. They provide
 *    directional signal, not precise forecasts.
 *    → The confidence system degrades accordingly.
 *
 * 3. CONFIDENCE MODEL: Per-technician penalties are boolean (any single bad
 *    project contaminates the whole tech). This is intentionally conservative.
 *    Future: weight penalties by proportion of affected minutes.
 *
 * 4. DOUBLE-COUNTING GUARD: parProjet and chargeByTechnician are mutually
 *    exclusive paths (parProjet takes priority, chargeByTechnician is
 *    fallback-only). No double-counting is possible.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
  ForecastProbableItem,
  ForecastProbableSource,
  ForecastProbabilityTier,
  ForecastProbableWorkload,
  ForecastProbableTeamStats,
  ForecastProbableConfidenceLevel,
  ForecastHorizon,
  ForecastPenalty,
  ForecastPenaltyCode,
  ProbableWorkloadInput,
} from './types';
import { horizonToDays } from './types';

// ============================================================================
// PUBLIC API
// ============================================================================

export interface ProbableWorkloadResult {
  workloads: ForecastProbableWorkload[];
  teamStats: ForecastProbableTeamStats;
  probableItems: ForecastProbableItem[];
  /** V1 prudente: unassigned items kept as team-level bucket, not distributed */
  unassignedTeamMinutes: number;
  unassignedItems: ForecastProbableItem[];
}

/**
 * Main entry: compute probable workload for a given horizon.
 */
export function computeProbableWorkload(
  input: ProbableWorkloadInput,
  horizon: ForecastHorizon
): ProbableWorkloadResult {
  // 1. Build probable items from chargeTravauxEngine data
  const probableItems = buildProbableItemsFromChargeTravaux(input, horizon);

  // 2. Aggregate by technician (V1 prudente: unassigned items stay at team level)
  const { workloads, unassignedItems, unassignedTeamMinutes } = aggregateProbableByTechnician(
    probableItems, input.technicians, horizon, input.probableSourceData.dataQuality
  );

  // 3. Team stats (includes unassigned bucket)
  const teamStats = aggregateProbableTeamStats(workloads, horizon, unassignedTeamMinutes);

  return { workloads, teamStats, probableItems, unassignedTeamMinutes, unassignedItems };
}

// ============================================================================
// STEP 1 — BUILD PROBABLE ITEMS FROM CHARGE TRAVAUX
// ============================================================================

function buildProbableItemsFromChargeTravaux(
  input: ProbableWorkloadInput,
  horizon: ForecastHorizon
): ForecastProbableItem[] {
  const { probableSourceData } = input;
  const items: ForecastProbableItem[] = [];

  // Primary path: use parProjet (detailed project data)
  if (probableSourceData.parProjet && probableSourceData.parProjet.length > 0) {
    for (const projet of probableSourceData.parProjet) {
      // Only include projects with charge calculable
      if (projet.totalHeuresTech <= 0) continue;

      const estimatedMinutes = projet.totalHeuresTech * 60;
      const maturityScore = computeProjectMaturityScore(projet);
      const confidenceTier = maturityScoreToTier(maturityScore);

      // Scale by horizon: projects further out are less likely to land in shorter horizons
      const horizonDays = horizonToDays(horizon);
      const horizonFactor = computeHorizonFactor(projet, horizonDays);
      if (horizonFactor <= 0) continue;

      const scaledMinutes = Math.round(estimatedMinutes * horizonFactor);
      if (scaledMinutes <= 0) continue;

      const source = classifyProbableSource(projet);
      const universe = projet.universes.length > 0 ? projet.universes[0] : undefined;

      items.push({
        id: `prob-${projet.projectId}`,
        source,
        projectId: String(projet.projectId),
        label: projet.label || projet.reference || `Projet ${projet.projectId}`,
        universe,
        estimatedMinutes: scaledMinutes,
        targetTechnicianIds: projet.technicianIds || [],
        maturityScore,
        riskScore: projet.riskScoreGlobal,
        confidenceTier,
      });
    }
    return items;
  }

  // Fallback: use chargeByTechnician aggregate data
  if (probableSourceData.chargeByTechnician && probableSourceData.chargeByTechnician.length > 0) {
    for (const tc of probableSourceData.chargeByTechnician) {
      if (tc.hours <= 0) continue;

      const horizonDays = horizonToDays(horizon);
      // Scale hours by horizon proportion (assume 30-day baseline)
      const scaledHours = tc.hours * (horizonDays / 30);
      const estimatedMinutes = Math.round(scaledHours * 60);
      if (estimatedMinutes <= 0) continue;

      items.push({
        id: `prob-tech-${tc.technicianId}`,
        source: 'charge_travaux_engine',
        label: `Charge travaux technicien ${tc.technicianId}`,
        estimatedMinutes,
        targetTechnicianIds: [tc.technicianId],
        confidenceTier: 'medium',
      });
    }
  }

  return items;
}

// ============================================================================
// MATURITY & CLASSIFICATION
// ============================================================================

function computeProjectMaturityScore(projet: {
  etatWorkflow: string;
  totalHeuresTech: number;
  devisHT: number;
  technicianIds: string[];
  dataQualityFlags: string[];
  riskScoreGlobal: number;
}): number {
  let score = 0.5; // baseline

  // Workflow state maturity
  switch (projet.etatWorkflow) {
    case 'to_planify_tvx': score += 0.25; break; // Ready to plan = most mature
    case 'devis_to_order': score += 0.10; break;  // Needs order first
    case 'wait_fourn': score += 0.05; break;       // Blocked
  }

  // Has devis → more mature
  if (projet.devisHT > 0) score += 0.10;

  // Has technician assigned → more mature
  if (projet.technicianIds.length > 0) score += 0.10;

  // Data quality penalty
  const qualityPenalty = projet.dataQualityFlags.length * 0.05;
  score -= qualityPenalty;

  // Risk penalty
  if (projet.riskScoreGlobal > 0.6) score -= 0.10;

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

function maturityScoreToTier(score: number): ForecastProbabilityTier {
  if (score >= 0.75) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}

function classifyProbableSource(projet: {
  etatWorkflow: string;
  technicianIds: string[];
}): ForecastProbableSource {
  switch (projet.etatWorkflow) {
    case 'to_planify_tvx': return 'travaux_a_planifier';
    case 'wait_fourn': return 'dossier_en_attente';
    case 'devis_to_order': return 'pipeline_mature';
  }
  if (projet.technicianIds.length === 0) return 'unassigned_project';
  return 'charge_travaux_engine';
}

/**
 * Scale factor based on horizon: shorter horizons capture fewer pipeline projects.
 * Projects in "to_planify_tvx" are most likely to land soon.
 */
function computeHorizonFactor(
  projet: { etatWorkflow: string; ageDays: number | null },
  horizonDays: number
): number {
  // Base factor by workflow state proximity
  let stateFactor: number;
  switch (projet.etatWorkflow) {
    case 'to_planify_tvx': stateFactor = 0.7; break;  // likely soon
    case 'devis_to_order': stateFactor = 0.4; break;   // needs ordering first
    case 'wait_fourn': stateFactor = 0.2; break;        // blocked
    default: stateFactor = 0.3; break;
  }

  // Horizon scaling: 7d captures less than 30d
  const horizonMultiplier = horizonDays <= 7 ? 0.3 : horizonDays <= 14 ? 0.6 : 1.0;

  return stateFactor * horizonMultiplier;
}

// ============================================================================
// STEP 2 — AGGREGATE BY TECHNICIAN
// ============================================================================

function aggregateProbableByTechnician(
  items: ForecastProbableItem[],
  technicians: Map<string, { id: string; name: string }>,
  horizon: ForecastHorizon,
  dataQuality?: ProbableWorkloadInput['probableSourceData']['dataQuality']
): { workloads: ForecastProbableWorkload[]; unassignedItems: ForecastProbableItem[]; unassignedTeamMinutes: number } {
  // Accumulator per technician
  const techAccum = new Map<string, {
    minutes: number;
    highMinutes: number;
    mediumMinutes: number;
    lowMinutes: number;
    itemCount: number;
    sourceBreakdown: Record<ForecastProbableSource, number>;
    universeBreakdown: Record<string, number>;
    hasUncertainAssignment: boolean;
    hasLowMaturity: boolean;
    hasHighRisk: boolean;
    hasUnknownUniverse: boolean;
  }>();

  const initAccum = () => ({
    minutes: 0,
    highMinutes: 0, mediumMinutes: 0, lowMinutes: 0,
    itemCount: 0,
    sourceBreakdown: {
      pipeline_mature: 0,
      travaux_a_planifier: 0,
      dossier_en_attente: 0,
      charge_travaux_engine: 0,
      unassigned_project: 0,
    } as Record<ForecastProbableSource, number>,
    universeBreakdown: {} as Record<string, number>,
    hasUncertainAssignment: false,
    hasLowMaturity: false,
    hasHighRisk: false,
    hasUnknownUniverse: false,
  });

  // V1 PRUDENTE: Items without technician are kept as a team-level bucket.
  // They are NOT distributed to individual technicians — this avoids injecting
  // artificial precision and noise into per-tech forecasts.
  const unassignedItems: ForecastProbableItem[] = [];
  let unassignedTeamMinutes = 0;

  for (const item of items) {
    if (item.targetTechnicianIds.length === 0) {
      unassignedItems.push(item);
      unassignedTeamMinutes += item.estimatedMinutes;
      continue;
    }

    // Equal split across target technicians
    const share = item.estimatedMinutes / item.targetTechnicianIds.length;

    for (const techId of item.targetTechnicianIds) {
      if (!techAccum.has(techId)) techAccum.set(techId, initAccum());
      const acc = techAccum.get(techId)!;

      acc.minutes += share;
      acc.itemCount++;
      acc.sourceBreakdown[item.source] += share;

      switch (item.confidenceTier) {
        case 'high': acc.highMinutes += share; break;
        case 'medium': acc.mediumMinutes += share; break;
        case 'low': acc.lowMinutes += share; break;
      }

      const uniKey = item.universe || 'unknown';
      acc.universeBreakdown[uniKey] = (acc.universeBreakdown[uniKey] || 0) + share;

      if (!item.universe) acc.hasUnknownUniverse = true;
      if (item.maturityScore != null && item.maturityScore < 0.45) acc.hasLowMaturity = true;
      if (item.riskScore != null && item.riskScore > 0.6) acc.hasHighRisk = true;
    }
  }

  // Build results
  const results: ForecastProbableWorkload[] = [];

  for (const [techId, acc] of techAccum) {
    if (acc.minutes <= 0) continue;

    const techInfo = technicians.get(techId);
    const name = techInfo?.name ?? `Tech ${techId}`;

    const { level, penalties } = computeProbableConfidence(acc, dataQuality);

    results.push({
      technicianId: techId,
      name,
      horizon,
      probableMinutes: Math.round(acc.minutes),
      highProbabilityMinutes: Math.round(acc.highMinutes),
      mediumProbabilityMinutes: Math.round(acc.mediumMinutes),
      lowProbabilityMinutes: Math.round(acc.lowMinutes),
      probableItemsCount: acc.itemCount,
      sourceBreakdown: roundRecord(acc.sourceBreakdown),
      universeBreakdown: roundRecord(acc.universeBreakdown),
      probableConfidenceLevel: level,
      probablePenalties: penalties,
    });
  }

  return { workloads: results, unassignedItems, unassignedTeamMinutes };
}

// ============================================================================
// STEP 3 — TEAM AGGREGATION
// ============================================================================

function aggregateProbableTeamStats(
  workloads: ForecastProbableWorkload[],
  horizon: ForecastHorizon,
  unassignedTeamMinutes: number = 0
): ForecastProbableTeamStats {
  let totalProbable = 0, highMin = 0, mediumMin = 0, lowMin = 0;
  const universeBreakdown: Record<string, number> = {};
  const confidenceCounts: Record<ForecastProbableConfidenceLevel, number> = { high: 0, medium: 0, low: 0 };

  for (const w of workloads) {
    totalProbable += w.probableMinutes;
    highMin += w.highProbabilityMinutes;
    mediumMin += w.mediumProbabilityMinutes;
    lowMin += w.lowProbabilityMinutes;
    confidenceCounts[w.probableConfidenceLevel]++;

    for (const [uni, mins] of Object.entries(w.universeBreakdown)) {
      universeBreakdown[uni] = (universeBreakdown[uni] || 0) + mins;
    }
  }

  // Add unassigned minutes to total (all forced to low tier at team level)
  totalProbable += unassignedTeamMinutes;
  lowMin += unassignedTeamMinutes;

  const total = workloads.length;
  let avgConfidence: ForecastProbableConfidenceLevel = 'medium';
  if (total === 0) avgConfidence = 'low';
  else if (confidenceCounts.high > total / 2) avgConfidence = 'high';
  else if (confidenceCounts.low > total / 2) avgConfidence = 'low';

  return {
    horizon,
    totalProbableMinutes: totalProbable,
    highProbabilityMinutes: highMin,
    mediumProbabilityMinutes: mediumMin,
    lowProbabilityMinutes: lowMin,
    averageProbableConfidenceLevel: avgConfidence,
    universeBreakdown: roundRecord(universeBreakdown),
    unassignedTeamMinutes,
  };
}

// ============================================================================
// PROBABLE CONFIDENCE SCORING
// ============================================================================

function computeProbableConfidence(
  acc: {
    hasLowMaturity: boolean;
    hasHighRisk: boolean;
    hasUncertainAssignment: boolean;
    hasUnknownUniverse: boolean;
    itemCount: number;
  },
  dataQuality?: ProbableWorkloadInput['probableSourceData']['dataQuality']
): { level: ForecastProbableConfidenceLevel; penalties: ForecastPenalty[] } {
  let score = 1.0;
  const penalties: ForecastPenalty[] = [];

  if (acc.itemCount === 0) {
    return { level: 'low', penalties: [] };
  }

  if (acc.hasLowMaturity) {
    const p: ForecastPenalty = {
      code: 'LOW_PIPELINE_MATURITY',
      reason: 'Maturité pipeline insuffisante sur certains projets',
      value: 0.20,
    };
    penalties.push(p);
    score -= p.value;
  }

  if (acc.hasHighRisk) {
    const p: ForecastPenalty = {
      code: 'HIGH_RISK_PROJECT',
      reason: 'Projet(s) à risque élevé dans la charge probable',
      value: 0.15,
    };
    penalties.push(p);
    score -= p.value;
  }

  if (acc.hasUncertainAssignment) {
    const p: ForecastPenalty = {
      code: 'UNCERTAIN_TECH_ASSIGNMENT',
      reason: 'Affectation technicien incertaine (répartition équipe)',
      value: 0.15,
    };
    penalties.push(p);
    score -= p.value;
  }

  if (dataQuality && dataQuality.score < 50) {
    const p: ForecastPenalty = {
      code: 'LOW_DATA_QUALITY',
      reason: 'Qualité des données prévisionnelles faible',
      value: 0.20,
    };
    penalties.push(p);
    score -= p.value;
  }

  if (acc.hasUnknownUniverse) {
    const p: ForecastPenalty = {
      code: 'UNKNOWN_UNIVERSE',
      reason: 'Univers non déterminé sur certains projets',
      value: 0.10,
    };
    penalties.push(p);
    score -= p.value;
  }

  score = Math.max(0, Math.round(score * 100) / 100);

  let level: ForecastProbableConfidenceLevel;
  if (score > 0.8) level = 'high';
  else if (score >= 0.6) level = 'medium';
  else level = 'low';

  return { level, penalties };
}

// ============================================================================
// UTILS
// ============================================================================

function roundRecord(rec: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec)) {
    out[k] = Math.round(v);
  }
  return out;
}
