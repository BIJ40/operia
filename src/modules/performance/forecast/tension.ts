/**
 * Forecast — Tension prédictive
 * Phase 6 Lot 4
 *
 * Transforme capacité future + charge engagée + charge probable
 * en signal de pilotage exploitable par technicien et par équipe.
 */

import type {
  ForecastSnapshot,
  ForecastHorizon,
  ForecastTensionSnapshot,
  ForecastTeamTensionStats,
  ForecastTensionFactor,
  PredictedTensionLevel,
  ForecastConfidenceLevel,
} from './types';

export type { PredictedTensionLevel } from './types';

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute tension analysis for all snapshots in a given horizon.
 */
export function computeForecastTension(
  snapshots: ForecastSnapshot[],
  horizon: ForecastHorizon
): {
  snapshots: ForecastTensionSnapshot[];
  teamStats: ForecastTeamTensionStats;
} {
  const filtered = snapshots.filter(s => s.horizon === horizon);
  const tensionSnapshots = filtered.map(computeTechnicianTension);
  const teamStats = aggregateForecastTeamTension(tensionSnapshots, horizon);

  return { snapshots: tensionSnapshots, teamStats };
}

/**
 * Aggregate tension snapshots into team-level stats.
 */
export function aggregateForecastTeamTension(
  snapshots: ForecastTensionSnapshot[],
  horizon: ForecastHorizon
): ForecastTeamTensionStats {
  let inComfort = 0, inWatch = 0, inTension = 0, inCritical = 0;
  let totalRatio = 0;
  let ratioCount = 0;
  const factorCounts = new Map<string, { factor: ForecastTensionFactor; count: number }>();

  for (const snap of snapshots) {
    switch (snap.predictedTensionLevel) {
      case 'comfort': inComfort++; break;
      case 'watch': inWatch++; break;
      case 'tension': inTension++; break;
      case 'critical': inCritical++; break;
    }

    if (snap.globalLoadRatio != null) {
      totalRatio += snap.globalLoadRatio;
      ratioCount++;
    }

    for (const f of snap.factors) {
      const existing = factorCounts.get(f.code);
      if (existing) {
        existing.count++;
      } else {
        factorCounts.set(f.code, { factor: f, count: 1 });
      }
    }
  }

  // Top factors: sorted by count desc, take top 5
  const topFactors = [...factorCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(e => e.factor);

  // Team tension level: majority rule
  const total = snapshots.length;
  let teamLevel: PredictedTensionLevel;
  if (total === 0) {
    teamLevel = 'comfort';
  } else if (inCritical > 0 && inCritical >= total * 0.3) {
    teamLevel = 'critical';
  } else if ((inTension + inCritical) > total / 2) {
    teamLevel = 'tension';
  } else if ((inWatch + inTension + inCritical) > total / 2) {
    teamLevel = 'watch';
  } else {
    teamLevel = 'comfort';
  }

  return {
    horizon,
    predictedTensionLevel: teamLevel,
    techniciansInComfort: inComfort,
    techniciansInWatch: inWatch,
    techniciansInTension: inTension,
    techniciansInCritical: inCritical,
    averageGlobalLoadRatio: ratioCount > 0
      ? Math.round((totalRatio / ratioCount) * 1000) / 1000
      : null,
    topFactors,
  };
}

// ============================================================================
// PER-TECHNICIAN TENSION
// ============================================================================

function computeTechnicianTension(snap: ForecastSnapshot): ForecastTensionSnapshot {
  const committedLoadRatio = snap.projectedCommittedLoadRatio ?? null;
  const globalLoadRatio = snap.projectedGlobalLoadRatio ?? committedLoadRatio;
  const availableAfterCommitted = snap.projectedAvailableMinutesAfterCommitted ?? snap.projectedCapacity.adjustedCapacityMinutes;
  const availableAfterProbable = snap.projectedAvailableMinutesAfterProbable ?? availableAfterCommitted;
  const adjustedCapacity = snap.projectedCapacity.adjustedCapacityMinutes;

  const factors: ForecastTensionFactor[] = [];

  // --- Factor detection ---

  // NO_CAPACITY
  if (adjustedCapacity === 0) {
    factors.push({
      code: 'NO_CAPACITY',
      label: 'Aucune capacité disponible sur cet horizon',
      severity: 'critical',
    });
  }

  // HIGH_COMMITTED_LOAD
  if (committedLoadRatio != null && committedLoadRatio >= 0.85) {
    factors.push({
      code: 'HIGH_COMMITTED_LOAD',
      label: `Charge engagée élevée (${Math.round(committedLoadRatio * 100)}%)`,
      severity: committedLoadRatio >= 1.0 ? 'critical' : 'warning',
    });
  }

  // HIGH_GLOBAL_LOAD
  if (globalLoadRatio != null && globalLoadRatio >= 0.95) {
    factors.push({
      code: 'HIGH_GLOBAL_LOAD',
      label: `Charge globale critique (${Math.round(globalLoadRatio * 100)}%)`,
      severity: globalLoadRatio > 1.1 ? 'critical' : 'warning',
    });
  }

  // LOW_AVAILABLE_CAPACITY (less than half a day = 240 min)
  if (availableAfterProbable <= 240 && adjustedCapacity > 0) {
    factors.push({
      code: 'LOW_AVAILABLE_CAPACITY',
      label: `Marge restante très faible (${Math.round(availableAfterProbable)} min)`,
      severity: availableAfterProbable <= 0 ? 'critical' : 'warning',
    });
  }

  // LOW_CONFIDENCE
  if (
    snap.forecastConfidenceLevel === 'low' ||
    snap.probableWorkload?.probableConfidenceLevel === 'low'
  ) {
    factors.push({
      code: 'LOW_CONFIDENCE',
      label: 'Confiance prédictive faible — données incomplètes',
      severity: 'info',
    });
  }

  // UNCERTAIN_ASSIGNMENT
  if (snap.probableWorkload?.probablePenalties.some(p => p.code === 'UNCERTAIN_TECH_ASSIGNMENT')) {
    factors.push({
      code: 'UNCERTAIN_ASSIGNMENT',
      label: 'Affectation technicien incertaine sur charge probable',
      severity: 'info',
    });
  }

  // HIGH_PROBABLE_SHARE (probable > 40% of total load)
  if (
    snap.committedWorkload &&
    snap.probableWorkload &&
    snap.probableWorkload.probableMinutes > 0
  ) {
    const totalLoad = snap.committedWorkload.committedMinutes + snap.probableWorkload.probableMinutes;
    if (totalLoad > 0) {
      const probableShare = snap.probableWorkload.probableMinutes / totalLoad;
      if (probableShare > 0.4) {
        factors.push({
          code: 'HIGH_PROBABLE_SHARE',
          label: `Part probable élevée (${Math.round(probableShare * 100)}% de la charge)`,
          severity: 'info',
        });
      }
    }
  }

  // --- Tension level ---
  const predictedTensionLevel = determineTensionLevel(
    globalLoadRatio,
    availableAfterProbable,
    adjustedCapacity,
    snap.forecastConfidenceLevel,
    snap.probableWorkload != null
  );

  return {
    technicianId: snap.technicianId,
    name: snap.name,
    horizon: snap.horizon,
    committedLoadRatio,
    globalLoadRatio,
    availableAfterCommitted,
    availableAfterProbable,
    predictedTensionLevel,
    confidenceLevel: snap.forecastConfidenceLevel,
    factors,
  };
}

// ============================================================================
// TENSION LEVEL RULES
// ============================================================================

function determineTensionLevel(
  globalLoadRatio: number | null,
  availableAfterProbable: number,
  adjustedCapacity: number,
  confidenceLevel: ForecastConfidenceLevel,
  hasProbableData: boolean
): PredictedTensionLevel {
  // Critical conditions
  if (adjustedCapacity === 0) return 'critical';
  if (globalLoadRatio != null && globalLoadRatio > 1.10) return 'critical';
  if (availableAfterProbable < 0) return 'critical';

  // Tension conditions
  if (globalLoadRatio != null && globalLoadRatio >= 0.95) return 'tension';

  // Watch conditions
  if (globalLoadRatio != null && globalLoadRatio >= 0.75) return 'watch';
  if (confidenceLevel === 'low' && hasProbableData) return 'watch';
  if (availableAfterProbable >= 0 && availableAfterProbable <= 240 && adjustedCapacity > 0) return 'watch';

  return 'comfort';
}
