/**
 * Forecast — Projection équipe
 * Phase 6 Lot 1
 *
 * Agrège les snapshots individuels en stats équipe par horizon.
 */

import type { ForecastSnapshot, ForecastHorizon, ForecastTeamStats, ForecastConfidenceLevel } from './types';

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

  for (const snap of filtered) {
    totalTheoreticalMinutes += snap.projectedCapacity.theoreticalMinutes;
    totalAdjustedMinutes += snap.projectedCapacity.adjustedCapacityMinutes;
    totalAvailableMinutes += snap.projectedCapacity.availableMinutes;
    totalAbsenceImpactMinutes += snap.projectedCapacity.absenceImpactMinutes;
    confidenceCounts[snap.forecastConfidenceLevel]++;
  }

  const technicianCount = filtered.length;
  const averageConfidenceLevel = computeTeamConfidence(confidenceCounts, technicianCount);

  return {
    horizon,
    totalTheoreticalMinutes,
    totalAdjustedMinutes,
    totalAvailableMinutes,
    totalAbsenceImpactMinutes,
    technicianCount,
    averageConfidenceLevel,
  };
}

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
