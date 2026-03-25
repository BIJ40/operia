/**
 * Forecast — Tests projection équipe
 * Phase 6 Lot 1 + Lot 2 + Lot 3
 */

import { describe, it, expect } from 'vitest';
import { aggregateForecastTeamStats, mergeCapacityAndCommittedWorkload, mergeCommittedAndProbableIntoForecast } from '../projection';
import type { ForecastSnapshot, ProjectedCapacity, ForecastCommittedWorkload, ForecastConsolidationTrace, ForecastProbableWorkload } from '../types';

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

const defaultTrace: ForecastConsolidationTrace = { merged: 0, keptSeparate: 0, discarded: 0, ambiguous: 0 };

function makeCommittedWorkload(
  id: string,
  horizon: '7d' | '14d' | '30d',
  committedMinutes: number
): ForecastCommittedWorkload {
  return {
    technicianId: id,
    name: `Tech ${id}`,
    horizon,
    committedMinutes,
    committedProductiveMinutes: committedMinutes,
    committedNonProductiveMinutes: 0,
    committedSavMinutes: 0,
    committedOtherMinutes: 0,
    interventionsCount: 1,
    dossiersCount: 1,
    sharedSlots: 0,
    loadConfidenceLevel: 'high',
    loadPenalties: [],
    sourceBreakdown: { planning: committedMinutes, visite: 0, intervention: 0 },
    durationSourceBreakdown: { explicit: 0, computed: 0, planning: committedMinutes, business_default: 0, unknown: 0 },
    consolidationTrace: defaultTrace,
  };
}

function makeProbableWorkload(
  id: string,
  horizon: '7d' | '14d' | '30d',
  probableMinutes: number
): ForecastProbableWorkload {
  return {
    technicianId: id,
    name: `Tech ${id}`,
    horizon,
    probableMinutes,
    highProbabilityMinutes: probableMinutes * 0.5,
    mediumProbabilityMinutes: probableMinutes * 0.3,
    lowProbabilityMinutes: probableMinutes * 0.2,
    probableItemsCount: 2,
    sourceBreakdown: {
      pipeline_mature: probableMinutes * 0.5,
      travaux_a_planifier: probableMinutes * 0.5,
      dossier_en_attente: 0,
      charge_travaux_engine: 0,
      unassigned_project: 0,
    },
    universeBreakdown: { 'Plomberie': probableMinutes },
    probableConfidenceLevel: 'medium',
    probablePenalties: [],
  };
}

// ============================================================================
// Lot 1 tests
// ============================================================================

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
  });

  it('ignores snapshots from other horizons', () => {
    const snapshots = [makeSnapshot('a', '7d'), makeSnapshot('b', '14d'), makeSnapshot('c', '30d')];
    const stats = aggregateForecastTeamStats(snapshots, '7d');
    expect(stats.technicianCount).toBe(1);
  });

  it('returns high confidence when majority is high', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { confidenceLevel: 'high' }),
      makeSnapshot('b', '7d', { confidenceLevel: 'high' }),
      makeSnapshot('c', '7d', { confidenceLevel: 'low' }),
    ];
    expect(aggregateForecastTeamStats(snapshots, '7d').averageConfidenceLevel).toBe('high');
  });

  it('returns low confidence when majority is low', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { confidenceLevel: 'low' }),
      makeSnapshot('b', '7d', { confidenceLevel: 'low' }),
      makeSnapshot('c', '7d', { confidenceLevel: 'high' }),
    ];
    expect(aggregateForecastTeamStats(snapshots, '7d').averageConfidenceLevel).toBe('low');
  });

  it('returns medium confidence when mixed', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { confidenceLevel: 'high' }),
      makeSnapshot('b', '7d', { confidenceLevel: 'low' }),
      makeSnapshot('c', '7d', { confidenceLevel: 'medium' }),
      makeSnapshot('d', '7d', { confidenceLevel: 'medium' }),
    ];
    expect(aggregateForecastTeamStats(snapshots, '7d').averageConfidenceLevel).toBe('medium');
  });

  it('sums absence impact across team', () => {
    const snapshots = [
      makeSnapshot('a', '7d', { theoreticalMinutes: 2100, adjustedMinutes: 1680 }),
      makeSnapshot('b', '7d', { theoreticalMinutes: 2100, adjustedMinutes: 1260 }),
    ];
    expect(aggregateForecastTeamStats(snapshots, '7d').totalAbsenceImpactMinutes).toBe((2100 - 1680) + (2100 - 1260));
  });

  it('handles empty snapshot list', () => {
    const stats = aggregateForecastTeamStats([], '7d');
    expect(stats.technicianCount).toBe(0);
    expect(stats.averageConfidenceLevel).toBe('low');
  });

  // Lot 2 — committed data in team stats
  it('includes committed minutes in team stats when present', () => {
    const snap = makeSnapshot('a', '7d', { adjustedMinutes: 2100 });
    snap.committedWorkload = makeCommittedWorkload('a', '7d', 600);
    const stats = aggregateForecastTeamStats([snap], '7d');
    expect(stats.totalCommittedMinutes).toBe(600);
    expect(stats.totalAvailableAfterCommittedMinutes).toBe(2100 - 600);
    expect(stats.averageCommittedLoadRatio).toBeCloseTo(600 / 2100, 2);
  });

  // Lot 3 — probable data in team stats
  it('includes probable minutes in team stats when present', () => {
    const snap = makeSnapshot('a', '7d', { adjustedMinutes: 2100 });
    snap.committedWorkload = makeCommittedWorkload('a', '7d', 600);
    snap.probableWorkload = makeProbableWorkload('a', '7d', 300);
    const stats = aggregateForecastTeamStats([snap], '7d');
    expect(stats.totalProbableMinutes).toBe(300);
    expect(stats.totalEngagedPlusProbableMinutes).toBe(900);
    expect(stats.totalAvailableAfterProbableMinutes).toBe(2100 - 900);
    expect(stats.averageGlobalLoadRatio).toBeCloseTo(900 / 2100, 2);
  });
});

// ============================================================================
// Lot 2 — merge tests
// ============================================================================

describe('mergeCapacityAndCommittedWorkload', () => {
  it('attaches committed workload and computes available remaining', () => {
    const caps = [makeSnapshot('a', '7d', { adjustedMinutes: 2100 })];
    const committed = [makeCommittedWorkload('a', '7d', 840)];
    const merged = mergeCapacityAndCommittedWorkload(caps, committed, '7d');
    expect(merged[0].committedWorkload?.committedMinutes).toBe(840);
    expect(merged[0].projectedAvailableMinutesAfterCommitted).toBe(2100 - 840);
    expect(merged[0].projectedCommittedLoadRatio).toBeCloseTo(840 / 2100, 2);
  });

  it('returns null ratio when capacity is zero', () => {
    const caps = [makeSnapshot('a', '7d', { adjustedMinutes: 0 })];
    const committed = [makeCommittedWorkload('a', '7d', 100)];
    const merged = mergeCapacityAndCommittedWorkload(caps, committed, '7d');
    expect(merged[0].projectedCommittedLoadRatio).toBeNull();
  });

  it('leaves snapshot unchanged when no committed workload found', () => {
    const caps = [makeSnapshot('a', '7d')];
    const merged = mergeCapacityAndCommittedWorkload(caps, [], '7d');
    expect(merged[0].committedWorkload).toBeUndefined();
  });

  it('aggregates enriched team stats with committed data', () => {
    const caps = [
      makeSnapshot('a', '7d', { adjustedMinutes: 2100 }),
      makeSnapshot('b', '7d', { adjustedMinutes: 1800 }),
    ];
    const committed = [makeCommittedWorkload('a', '7d', 600), makeCommittedWorkload('b', '7d', 400)];
    const merged = mergeCapacityAndCommittedWorkload(caps, committed, '7d');
    const stats = aggregateForecastTeamStats(merged, '7d');
    expect(stats.totalCommittedMinutes).toBe(1000);
    expect(stats.totalAvailableAfterCommittedMinutes).toBe((2100 + 1800) - 1000);
  });
});

// ============================================================================
// Lot 3 — merge committed + probable tests
// ============================================================================

describe('mergeCommittedAndProbableIntoForecast', () => {
  it('attaches probable workload and computes global load ratio', () => {
    const snap = makeSnapshot('a', '7d', { adjustedMinutes: 2100 });
    snap.committedWorkload = makeCommittedWorkload('a', '7d', 600);
    snap.projectedAvailableMinutesAfterCommitted = 1500;
    snap.projectedCommittedLoadRatio = 600 / 2100;

    const probable = [makeProbableWorkload('a', '7d', 300)];
    const merged = mergeCommittedAndProbableIntoForecast([snap], probable, '7d');

    expect(merged[0].probableWorkload?.probableMinutes).toBe(300);
    expect(merged[0].projectedAvailableMinutesAfterProbable).toBe(2100 - 600 - 300);
    expect(merged[0].projectedGlobalLoadRatio).toBeCloseTo((600 + 300) / 2100, 2);
  });

  it('returns null global ratio when capacity is zero', () => {
    const snap = makeSnapshot('a', '7d', { adjustedMinutes: 0 });
    snap.committedWorkload = makeCommittedWorkload('a', '7d', 0);
    const probable = [makeProbableWorkload('a', '7d', 100)];
    const merged = mergeCommittedAndProbableIntoForecast([snap], probable, '7d');
    expect(merged[0].projectedGlobalLoadRatio).toBeNull();
  });

  it('leaves snapshot unchanged when no probable workload', () => {
    const snap = makeSnapshot('a', '7d');
    const merged = mergeCommittedAndProbableIntoForecast([snap], [], '7d');
    expect(merged[0].probableWorkload).toBeUndefined();
    expect(merged[0].projectedGlobalLoadRatio).toBeUndefined();
  });

  it('handles probable > capacity (overload allowed)', () => {
    const snap = makeSnapshot('a', '7d', { adjustedMinutes: 500 });
    snap.committedWorkload = makeCommittedWorkload('a', '7d', 400);
    const probable = [makeProbableWorkload('a', '7d', 300)];
    const merged = mergeCommittedAndProbableIntoForecast([snap], probable, '7d');
    // Available goes negative = overload
    expect(merged[0].projectedAvailableMinutesAfterProbable).toBe(500 - 400 - 300);
    expect(merged[0].projectedGlobalLoadRatio!).toBeGreaterThan(1);
  });

  it('aggregates team stats with all 3 layers', () => {
    const snap = makeSnapshot('a', '7d', { adjustedMinutes: 2100 });
    snap.committedWorkload = makeCommittedWorkload('a', '7d', 600);
    snap.probableWorkload = makeProbableWorkload('a', '7d', 300);

    const stats = aggregateForecastTeamStats([snap], '7d');
    expect(stats.totalCommittedMinutes).toBe(600);
    expect(stats.totalProbableMinutes).toBe(300);
    expect(stats.totalEngagedPlusProbableMinutes).toBe(900);
    expect(stats.totalAvailableAfterProbableMinutes).toBe(2100 - 900);
  });
});
