/**
 * Forecast — Projection équipe
 * Phase 6 Lot 1 + Lot 2
 *
 * Agrège les snapshots individuels en stats équipe par horizon.
 * Fusionne capacité et charge engagée.
 */

import type {
  ForecastSnapshot,
  ForecastHorizon,
  ForecastTeamStats,
  ForecastConfidenceLevel,
  ForecastCommittedWorkload,
} from './types';

// ============================================================================
// TEAM STATS AGGREGATION (Lot 1 + Lot 2 enrichment)
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
  let hasCommittedData = false;

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
