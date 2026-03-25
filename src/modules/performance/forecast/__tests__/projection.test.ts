/**
 * Forecast — Tests projection équipe
 * Phase 6 Lot 1
 */

import { describe, it, expect } from 'vitest';
import { aggregateForecastTeamStats } from '../projection';
import type { ForecastSnapshot, ProjectedCapacity } from '../types';

function makeSnapshot(
  id: string,
  horizon: '7d' | '14d' | '30d',
  overrides: Partial<{
    theoreticalMinutes: number;
    adjustedMinutes: number;
    availableMinutes: number;
    absenceImpactMinutes: number;
    confidenceLevel: 'high' | 'medium' | 'low';
  }> = {}
): ForecastSnapshot {
  const theoretical = overrides.theoreticalMinutes ?? 2100;
  const adjusted = overrides.adjustedMinutes ?? theoretical;
  const available = overrides.availableMinutes ?? adjusted;
  const absenceImpact = overrides.absenceImpactMinutes ?? (theoretical - adjusted);

  const projectedCapacity: ProjectedCapacity = {
    theoreticalMinutes: theoretical,
    adjustedCapacityMinutes: adjusted,
    availableMinutes: available,
    absenceImpactMinutes: absenceImpact,
    workingDays: 5,
    absenceDays: 0,
    horizon,
  };

  return {
    technicianId: id,
    name: `Tech ${id}`,
    horizon,
    projectedCapacity,
    weeklyHours: 35,
    weeklyHoursSource: 'contract',
    forecastConfidenceLevel: overrides.confidenceLevel ?? 'high',
    forecastConfidenceScore: 0.85,
    forecastPenalties: [],
  };
}

describe('aggregateForecastTeamStats', () => {
  it('aggregates total capacity for one horizon', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { theoreticalMinutes: 2100, adjustedMinutes: 1680 }),
      makeSnapshot('b', '7d', { theoreticalMinutes: 2340, adjustedMinutes: 2340 }),
    ];

    const stats = aggregateForecastTeamStats(snapshots, '7d');

    expect(stats.horizon).toBe('7d');
    expect(stats.technicianCount).toBe(2);
    expect(stats.totalTheoreticalMinutes).toBe(2100 + 2340);
    expect(stats.totalAdjustedMinutes).toBe(1680 + 2340);
    expect(stats.totalAvailableMinutes).toBe(1680 + 2340);
  });

  it('ignores snapshots from other horizons', () => {
    const snapshots = [
      makeSnapshot('a', '7d'),
      makeSnapshot('b', '14d'),
      makeSnapshot('c', '30d'),
    ];

    const stats = aggregateForecastTeamStats(snapshots, '7d');
    expect(stats.technicianCount).toBe(1);
  });

  it('returns high confidence when majority is high', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { confidenceLevel: 'high' }),
      makeSnapshot('b', '7d', { confidenceLevel: 'high' }),
      makeSnapshot('c', '7d', { confidenceLevel: 'low' }),
    ];

    const stats = aggregateForecastTeamStats(snapshots, '7d');
    expect(stats.averageConfidenceLevel).toBe('high');
  });

  it('returns low confidence when majority is low', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { confidenceLevel: 'low' }),
      makeSnapshot('b', '7d', { confidenceLevel: 'low' }),
      makeSnapshot('c', '7d', { confidenceLevel: 'high' }),
    ];

    const stats = aggregateForecastTeamStats(snapshots, '7d');
    expect(stats.averageConfidenceLevel).toBe('low');
  });

  it('returns medium confidence when mixed', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { confidenceLevel: 'high' }),
      makeSnapshot('b', '7d', { confidenceLevel: 'low' }),
      makeSnapshot('c', '7d', { confidenceLevel: 'medium' }),
      makeSnapshot('d', '7d', { confidenceLevel: 'medium' }),
    ];

    const stats = aggregateForecastTeamStats(snapshots, '7d');
    expect(stats.averageConfidenceLevel).toBe('medium');
  });

  it('sums absence impact across team', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { theoreticalMinutes: 2100, adjustedMinutes: 1680 }),
      makeSnapshot('b', '7d', { theoreticalMinutes: 2100, adjustedMinutes: 1260 }),
    ];

    const stats = aggregateForecastTeamStats(snapshots, '7d');
    expect(stats.totalAbsenceImpactMinutes).toBe((2100 - 1680) + (2100 - 1260));
  });

  it('handles empty snapshot list', () => {
    const stats = aggregateForecastTeamStats([], '7d');
    expect(stats.technicianCount).toBe(0);
    expect(stats.totalTheoreticalMinutes).toBe(0);
    expect(stats.averageConfidenceLevel).toBe('low');
  });
});
