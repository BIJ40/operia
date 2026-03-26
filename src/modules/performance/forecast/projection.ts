/**
 * Forecast — Projection équipe
 * Phase 6 Lot 1 + Lot 2 + Lot 3
 *
 * Agrège les snapshots individuels en stats équipe par horizon.
 * Fusionne capacité, charge engagée et charge probable.
 */

import type {
  ForecastSnapshot,
  ForecastHorizon,
  ForecastTeamStats,
  ForecastConfidenceLevel,
  ForecastCommittedWorkload,
  ForecastProbableWorkload,
} from './types';

// ============================================================================
// TEAM STATS AGGREGATION (Lot 1 + Lot 2 + Lot 3 enrichment)
// ============================================================================

/**
 * Aggregate individual forecast snapshots into team-level stats for a given horizon.
 */
export function aggregateForecastTeamStats(
  snapshots: ForecastSnapshot[],
  horizon: ForecastHorizon
): ForecastTeamStats {
  const filtered = snapshots.filter(s => s.horizon === horizon);

  let totalTheoreticalMinutes = 0;
  let totalAdjustedMinutes = 0;
  let totalAvailableMinutes = 0;
  let totalAbsenceImpactMinutes = 0;

  const confidenceCounts: Record<ForecastConfidenceLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  let totalCommittedMinutes = 0;
  let totalProbableMinutes = 0;
  let hasCommittedData = false;
  let hasProbableData = false;

  for (const snap of filtered) {
    totalTheoreticalMinutes += snap.projectedCapacity.theoreticalMinutes;
    totalAdjustedMinutes += snap.projectedCapacity.adjustedCapacityMinutes;
    totalAvailableMinutes += snap.projectedCapacity.availableMinutes;
    totalAbsenceImpactMinutes += snap.projectedCapacity.absenceImpactMinutes;
    confidenceCounts[snap.forecastConfidenceLevel]++;

    if (snap.committedWorkload) {
      totalCommittedMinutes += snap.committedWorkload.committedMinutes;
      hasCommittedData = true;
    }

    if (snap.probableWorkload) {
      totalProbableMinutes += snap.probableWorkload.probableMinutes;
      hasProbableData = true;
    }
  }

  const technicianCount = filtered.length;
  const averageConfidenceLevel = computeTeamConfidence(confidenceCounts, technicianCount);

  const result: ForecastTeamStats = {
    horizon,
    totalTheoreticalMinutes,
    totalAdjustedMinutes,
    totalAvailableMinutes,
    totalAbsenceImpactMinutes,
    technicianCount,
    averageConfidenceLevel,
  };

  // Lot 2 enrichment
  if (hasCommittedData) {
    result.totalCommittedMinutes = totalCommittedMinutes;
    result.totalAvailableAfterCommittedMinutes = totalAdjustedMinutes - totalCommittedMinutes;
    result.averageCommittedLoadRatio = totalAdjustedMinutes > 0
      ? Math.round((totalCommittedMinutes / totalAdjustedMinutes) * 1000) / 1000
      : null;
  }

  // Lot 3 enrichment
  if (hasProbableData) {
    result.totalProbableMinutes = totalProbableMinutes;
    const totalEngagedPlusProbable = totalCommittedMinutes + totalProbableMinutes;
    result.totalEngagedPlusProbableMinutes = totalEngagedPlusProbable;
    result.totalAvailableAfterProbableMinutes = totalAdjustedMinutes - totalEngagedPlusProbable;
    result.averageGlobalLoadRatio = totalAdjustedMinutes > 0
      ? Math.round((totalEngagedPlusProbable / totalAdjustedMinutes) * 1000) / 1000
      : null;
  }

  return result;
}

// ============================================================================
// MERGE CAPACITY + COMMITTED WORKLOAD (Lot 2)
// ============================================================================

/**
 * Attach committed workload data to capacity snapshots.
 * Computes projectedAvailableMinutesAfterCommitted and projectedCommittedLoadRatio.
 */
export function mergeCapacityAndCommittedWorkload(
  capacitySnapshots: ForecastSnapshot[],
  committedWorkloads: ForecastCommittedWorkload[],
  horizon: ForecastHorizon
): ForecastSnapshot[] {
  const filtered = capacitySnapshots.filter(s => s.horizon === horizon);
  const workloadByTech = new Map<string, ForecastCommittedWorkload>();

  for (const w of committedWorkloads) {
    if (w.horizon === horizon) {
      workloadByTech.set(w.technicianId, w);
    }
  }

  return filtered.map(snap => {
    const workload = workloadByTech.get(snap.technicianId);

    if (!workload) return snap;

    const adjustedCapacity = snap.projectedCapacity.adjustedCapacityMinutes;
    const committedMinutes = workload.committedMinutes;

    return {
      ...snap,
      committedWorkload: workload,
      projectedAvailableMinutesAfterCommitted: adjustedCapacity - committedMinutes,
      projectedCommittedLoadRatio: adjustedCapacity > 0
        ? Math.round((committedMinutes / adjustedCapacity) * 1000) / 1000
        : null,
    };
  });
}

// ============================================================================
// MERGE COMMITTED + PROBABLE INTO FORECAST (Lot 3)
// ============================================================================

/**
 * Attach probable workload data to snapshots that already have committed workload.
 * Computes projectedAvailableMinutesAfterProbable and projectedGlobalLoadRatio.
 */
export function mergeCommittedAndProbableIntoForecast(
  baseSnapshots: ForecastSnapshot[],
  probableWorkloads: ForecastProbableWorkload[],
  horizon: ForecastHorizon
): ForecastSnapshot[] {
  const filtered = baseSnapshots.filter(s => s.horizon === horizon);
  const probableByTech = new Map<string, ForecastProbableWorkload>();

  for (const w of probableWorkloads) {
    if (w.horizon === horizon) {
      probableByTech.set(w.technicianId, w);
    }
  }

  return filtered.map(snap => {
    const probable = probableByTech.get(snap.technicianId);

    if (!probable) return snap;

    const adjustedCapacity = snap.projectedCapacity.adjustedCapacityMinutes;
    const committedMinutes = snap.committedWorkload?.committedMinutes ?? 0;
    const probableMinutes = probable.probableMinutes;
    const totalLoad = committedMinutes + probableMinutes;

    return {
      ...snap,
      probableWorkload: probable,
      projectedAvailableMinutesAfterProbable: adjustedCapacity - totalLoad,
      projectedGlobalLoadRatio: adjustedCapacity > 0
        ? Math.round((totalLoad / adjustedCapacity) * 1000) / 1000
        : null,
    };
  });
}

// ============================================================================
// INTERNALS
// ============================================================================

/**
 * Team confidence rule:
 * - majority high → high
 * - majority low → low
 * - else → medium
 */
function computeTeamConfidence(
  counts: Record<ForecastConfidenceLevel, number>,
  total: number
): ForecastConfidenceLevel {
  if (total === 0) return 'low';
  if (counts.high > total / 2) return 'high';
  if (counts.low > total / 2) return 'low';
  return 'medium';
}
