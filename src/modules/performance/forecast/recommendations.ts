/**
 * Forecast — Recommandations automatiques
 * Phase 6 Lot 5
 *
 * Transforme capacité, charge engagée, charge probable et tension prédictive
 * en recommandations actionnables, priorisées, justifiées et non contradictoires.
 */

import type {
  ForecastSnapshot,
  ForecastHorizon,
  ForecastTensionSnapshot,
  ForecastTeamStats,
  ForecastTeamTensionStats,
  ForecastRecommendation,
  ForecastRecommendationPriority,
  ForecastRecommendationsResult,
} from './types';

// ============================================================================
// PRIORITY ORDER (for sorting & dedup)
// ============================================================================

const PRIORITY_ORDER: Record<ForecastRecommendationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ============================================================================
// PUBLIC API
// ============================================================================

export function generateForecastRecommendations(
  snapshots: ForecastSnapshot[],
  tensionSnapshots: ForecastTensionSnapshot[],
  teamStats: ForecastTeamStats,
  teamTension: ForecastTeamTensionStats,
  horizon: ForecastHorizon
): ForecastRecommendationsResult {
  const filtered = snapshots.filter(s => s.horizon === horizon);
  const filteredTension = tensionSnapshots.filter(s => s.horizon === horizon);

  const techRecs = buildTechnicianRecommendations(filtered, filteredTension, horizon);
  const teamRecs = buildTeamRecommendations(filtered, filteredTension, teamStats, teamTension, horizon);
  const univRecs = buildUniverseRecommendations(filtered, horizon);

  // Deduplicate each category
  const dedupedTech = deduplicateRecommendations(techRecs);
  const dedupedTeam = deduplicateRecommendations(teamRecs);
  const dedupedUniv = deduplicateRecommendations(univRecs);

  // Limit: max 1 per tech, max 3 team, max 3 universe
  const limitedTech = limitPerTechnician(dedupedTech);
  const limitedTeam = sortByPriority(dedupedTeam).slice(0, 3);
  const limitedUniv = sortByPriority(dedupedUniv).slice(0, 3);

  const all = sortByPriority([...limitedTeam, ...limitedTech, ...limitedUniv]);

  return {
    horizon,
    teamRecommendations: limitedTeam,
    technicianRecommendations: sortByPriority(limitedTech),
    universeRecommendations: limitedUniv,
    all,
  };
}

// ============================================================================
// TECHNICIAN RECOMMENDATIONS
// ============================================================================

function buildTechnicianRecommendations(
  snapshots: ForecastSnapshot[],
  tensionSnapshots: ForecastTensionSnapshot[],
  horizon: ForecastHorizon
): ForecastRecommendation[] {
  const recs: ForecastRecommendation[] = [];
  const tensionMap = new Map(tensionSnapshots.map(t => [t.technicianId, t]));

  for (const snap of snapshots) {
    const tension = tensionMap.get(snap.technicianId);
    if (!tension) continue;

    const factorCodes = tension.factors.map(f => f.code);

    // protect_technician: critical tension
    if (tension.predictedTensionLevel === 'critical') {
      recs.push({
        id: `protect-${snap.technicianId}-${horizon}`,
        type: 'protect_technician',
        scope: 'technician',
        priority: 'critical',
        title: `Protéger ${snap.name}`,
        message: `${snap.name} est en surcharge critique. Ne pas lui affecter de nouvelle intervention.`,
        rationale: buildProtectRationale(snap, tension),
        technicianId: snap.technicianId,
        technicianName: snap.name,
        horizon,
        confidenceLevel: tension.confidenceLevel,
        relatedFactorCodes: factorCodes,
      });
      continue; // Don't add contradictory recs for same tech
    }

    // use_available_capacity: comfort with significant margin
    if (tension.predictedTensionLevel === 'comfort') {
      const margin = snap.projectedAvailableMinutesAfterProbable ?? snap.projectedAvailableMinutesAfterCommitted ?? 0;
      const capacity = snap.projectedCapacity.adjustedCapacityMinutes;
      if (capacity > 0 && margin >= capacity * 0.4) {
        recs.push({
          id: `capacity-${snap.technicianId}-${horizon}`,
          type: 'use_available_capacity',
          scope: 'technician',
          priority: 'medium',
          title: `Capacité disponible — ${snap.name}`,
          message: `${snap.name} dispose d'une marge significative (${Math.round(margin / 60)}h). Possibilité d'absorber de la charge supplémentaire.`,
          rationale: `Ratio global ${formatRatio(tension.globalLoadRatio)}, capacité restante après charge probable : ${Math.round(margin / 60)}h.`,
          technicianId: snap.technicianId,
          technicianName: snap.name,
          horizon,
          confidenceLevel: tension.confidenceLevel,
          relatedFactorCodes: factorCodes,
        });
        continue;
      }
    }

    // increase_visibility (tech level): low confidence
    if (tension.confidenceLevel === 'low') {
      recs.push({
        id: `visibility-tech-${snap.technicianId}-${horizon}`,
        type: 'increase_visibility',
        scope: 'technician',
        priority: 'medium',
        title: `Données fragiles — ${snap.name}`,
        message: `La projection de ${snap.name} repose sur des données incomplètes. Fiabiliser avant arbitrage.`,
        rationale: `Confiance prédictive faible. Pénalités : ${snap.forecastPenalties.map(p => p.code).join(', ') || 'aucune détaillée'}.`,
        technicianId: snap.technicianId,
        technicianName: snap.name,
        horizon,
        confidenceLevel: tension.confidenceLevel,
        relatedFactorCodes: factorCodes,
      });
      continue;
    }

    // review_probable_pipeline (tech level): HIGH_PROBABLE_SHARE
    if (factorCodes.includes('HIGH_PROBABLE_SHARE')) {
      recs.push({
        id: `pipeline-tech-${snap.technicianId}-${horizon}`,
        type: 'review_probable_pipeline',
        scope: 'technician',
        priority: 'medium',
        title: `Pipeline incertain — ${snap.name}`,
        message: `Une part importante de la charge projetée de ${snap.name} repose sur des dossiers peu sécurisés.`,
        rationale: `La charge probable représente plus de 40% de la charge totale projetée.`,
        technicianId: snap.technicianId,
        technicianName: snap.name,
        horizon,
        confidenceLevel: snap.probableWorkload?.probableConfidenceLevel ?? tension.confidenceLevel,
        relatedFactorCodes: factorCodes,
      });
    }
  }

  return recs;
}

// ============================================================================
// TEAM RECOMMENDATIONS
// ============================================================================

function buildTeamRecommendations(
  snapshots: ForecastSnapshot[],
  tensionSnapshots: ForecastTensionSnapshot[],
  teamStats: ForecastTeamStats,
  teamTension: ForecastTeamTensionStats,
  horizon: ForecastHorizon
): ForecastRecommendation[] {
  const recs: ForecastRecommendation[] = [];
  const topFactorCodes = teamTension.topFactors.map(f => f.code);

  // rebalance_load: techs in tension/critical while others in comfort
  const hasTensionOrCritical = teamTension.techniciansInTension + teamTension.techniciansInCritical > 0;
  const hasComfort = teamTension.techniciansInComfort > 0;
  if (hasTensionOrCritical && hasComfort) {
    recs.push({
      id: `rebalance-${horizon}`,
      type: 'rebalance_load',
      scope: 'team',
      priority: teamTension.techniciansInCritical > 0 ? 'critical' : 'high',
      title: 'Rééquilibrer la charge équipe',
      message: `${teamTension.techniciansInTension + teamTension.techniciansInCritical} technicien(s) en tension alors que ${teamTension.techniciansInComfort} dispose(nt) de marge.`,
      rationale: `Écart de charge significatif entre techniciens sur l'horizon ${horizon}.`,
      horizon,
      confidenceLevel: teamTension.averageGlobalLoadRatio != null ? 'medium' : 'low',
      relatedFactorCodes: topFactorCodes,
    });
  }

  // secure_assignment: unassigned team minutes
  const unassigned = computeTeamUnassignedMinutes(snapshots);
  if (unassigned > 0) {
    recs.push({
      id: `secure-${horizon}`,
      type: 'secure_assignment',
      scope: 'team',
      priority: 'high',
      title: 'Sécuriser les affectations',
      message: `${Math.round(unassigned / 60)}h de charge probable restent sans technicien attribué.`,
      rationale: `Des projets du pipeline ne sont affectés à aucun technicien identifié.`,
      horizon,
      confidenceLevel: 'low',
      relatedFactorCodes: ['UNCERTAIN_ASSIGNMENT'],
    });
  }

  // increase_visibility (team): average confidence low
  if (teamStats.averageConfidenceLevel === 'low') {
    recs.push({
      id: `visibility-team-${horizon}`,
      type: 'increase_visibility',
      scope: 'team',
      priority: 'medium',
      title: 'Améliorer la visibilité des données',
      message: `La projection équipe sur ${horizon} repose sur des données fragiles. Fiabiliser avant arbitrage.`,
      rationale: `Confiance moyenne de l'équipe : faible.`,
      horizon,
      confidenceLevel: 'low',
      relatedFactorCodes: topFactorCodes,
    });
  }

  // review_probable_pipeline (team): high probable share globally
  if (teamStats.totalProbableMinutes != null && teamStats.totalCommittedMinutes != null) {
    const totalLoad = teamStats.totalCommittedMinutes + teamStats.totalProbableMinutes;
    if (totalLoad > 0 && teamStats.totalProbableMinutes / totalLoad > 0.4) {
      recs.push({
        id: `pipeline-team-${horizon}`,
        type: 'review_probable_pipeline',
        scope: 'team',
        priority: 'medium',
        title: 'Revoir le pipeline probable',
        message: `Plus de 40% de la charge projetée repose sur des dossiers encore peu sécurisés.`,
        rationale: `Part probable : ${Math.round((teamStats.totalProbableMinutes / totalLoad) * 100)}% de la charge totale.`,
        horizon,
        confidenceLevel: 'medium',
        relatedFactorCodes: ['HIGH_PROBABLE_SHARE'],
      });
    }
  }

  // no_action: if nothing else triggered
  if (recs.length === 0) {
    recs.push({
      id: `no-action-${horizon}`,
      type: 'no_action',
      scope: 'team',
      priority: 'low',
      title: 'Aucun arbitrage nécessaire',
      message: `La charge projetée reste compatible avec la capacité disponible sur ${horizon}.`,
      rationale: `Tous les techniciens sont en confort, confiance correcte, pas de facteur de risque fort.`,
      horizon,
      confidenceLevel: teamStats.averageConfidenceLevel,
      relatedFactorCodes: [],
    });
  }

  return recs;
}

// ============================================================================
// UNIVERSE RECOMMENDATIONS
// ============================================================================

function buildUniverseRecommendations(
  snapshots: ForecastSnapshot[],
  horizon: ForecastHorizon
): ForecastRecommendation[] {
  const universeMinutes = new Map<string, number>();
  let totalProbable = 0;

  for (const snap of snapshots) {
    if (!snap.probableWorkload) continue;
    const breakdown = snap.probableWorkload.universeBreakdown;
    for (const [univ, mins] of Object.entries(breakdown)) {
      if (!univ || univ === 'unknown') continue;
      universeMinutes.set(univ, (universeMinutes.get(univ) ?? 0) + mins);
      totalProbable += mins;
    }
  }

  if (totalProbable === 0) return [];

  const recs: ForecastRecommendation[] = [];

  for (const [univ, mins] of universeMinutes.entries()) {
    const share = mins / totalProbable;
    if (share > 0.4) {
      recs.push({
        id: `universe-${univ}-${horizon}`,
        type: 'watch_universe',
        scope: 'universe',
        priority: share > 0.6 ? 'high' : 'medium',
        title: `Surveiller l'univers ${univ}`,
        message: `L'univers ${univ} concentre ${Math.round(share * 100)}% de la charge probable. Risque de goulet.`,
        rationale: `${Math.round(mins / 60)}h sur ${Math.round(totalProbable / 60)}h de charge probable totale.`,
        universe: univ,
        horizon,
        confidenceLevel: 'medium',
        relatedFactorCodes: ['HIGH_PROBABLE_SHARE'],
      });
    }
  }

  return recs;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildProtectRationale(snap: ForecastSnapshot, tension: ForecastTensionSnapshot): string {
  const parts: string[] = [];
  if (tension.globalLoadRatio != null) {
    parts.push(`Ratio global : ${formatRatio(tension.globalLoadRatio)}`);
  }
  if (tension.availableAfterProbable < 0) {
    parts.push(`Dépassement de ${Math.round(Math.abs(tension.availableAfterProbable) / 60)}h`);
  }
  if (snap.projectedCapacity.adjustedCapacityMinutes === 0) {
    parts.push('Aucune capacité disponible');
  }
  return parts.join('. ') || 'Tension critique détectée.';
}

function formatRatio(ratio: number | null): string {
  if (ratio == null) return 'N/A';
  return `${Math.round(ratio * 100)}%`;
}

function computeTeamUnassignedMinutes(snapshots: ForecastSnapshot[]): number {
  let total = 0;
  for (const snap of snapshots) {
    if (!snap.probableWorkload) continue;
    const penalty = snap.probableWorkload.probablePenalties.find(p => p.code === 'UNCERTAIN_TECH_ASSIGNMENT');
    if (penalty) {
      total += penalty.value * snap.probableWorkload.probableMinutes;
    }
  }
  return total;
}

// ============================================================================
// DEDUPLICATION & SORTING
// ============================================================================

function deduplicateRecommendations(recs: ForecastRecommendation[]): ForecastRecommendation[] {
  const byKey = new Map<string, ForecastRecommendation>();

  for (const rec of recs) {
    const key = `${rec.type}|${rec.scope}|${rec.technicianId ?? ''}|${rec.universe ?? ''}|${rec.horizon}`;
    const existing = byKey.get(key);
    if (!existing || PRIORITY_ORDER[rec.priority] < PRIORITY_ORDER[existing.priority]) {
      byKey.set(key, rec);
    }
  }

  return [...byKey.values()];
}

function sortByPriority(recs: ForecastRecommendation[]): ForecastRecommendation[] {
  return [...recs].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function limitPerTechnician(recs: ForecastRecommendation[]): ForecastRecommendation[] {
  const sorted = sortByPriority(recs);
  const seenTechs = new Set<string>();
  const result: ForecastRecommendation[] = [];

  for (const rec of sorted) {
    const techId = rec.technicianId ?? '__no_tech__';
    if (seenTechs.has(techId)) continue;
    seenTechs.add(techId);
    result.push(rec);
  }

  return result;
}