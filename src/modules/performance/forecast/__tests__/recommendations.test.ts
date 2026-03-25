/**
 * Tests — Forecast Recommendations (Lot 5)
 */
import { describe, it, expect } from 'vitest';
import { generateForecastRecommendations } from '../recommendations';
import { computeForecastTension } from '../tension';
import type {
  ForecastSnapshot,
  ForecastHorizon,
  ForecastTeamStats,
  ForecastRecommendation,
} from '../types';

// ============================================================================
// HELPERS
// ============================================================================

function makeSnap(overrides: Partial<ForecastSnapshot> & { technicianId: string; name: string }): ForecastSnapshot {
  const capacity = overrides.projectedCapacity ?? {
    theoreticalMinutes: 2100,
    adjustedCapacityMinutes: 2100,
    availableMinutes: 2100,
    absenceImpactMinutes: 0,
    workingDays: 5,
    absenceDays: 0,
    horizon: '7d' as ForecastHorizon,
  };

  const committedMinutes = overrides.committedWorkload?.committedMinutes ?? 0;
  const probableMinutes = overrides.probableWorkload?.probableMinutes ?? 0;
  const adj = capacity.adjustedCapacityMinutes;

  return {
    technicianId: overrides.technicianId,
    name: overrides.name,
    horizon: overrides.horizon ?? '7d',
    projectedCapacity: capacity,
    weeklyHours: overrides.weeklyHours ?? 35,
    weeklyHoursSource: overrides.weeklyHoursSource ?? 'contract',
    forecastConfidenceLevel: overrides.forecastConfidenceLevel ?? 'high',
    forecastConfidenceScore: overrides.forecastConfidenceScore ?? 0.9,
    forecastPenalties: overrides.forecastPenalties ?? [],
    committedWorkload: overrides.committedWorkload,
    projectedAvailableMinutesAfterCommitted: overrides.projectedAvailableMinutesAfterCommitted ?? (adj - committedMinutes),
    projectedCommittedLoadRatio: overrides.projectedCommittedLoadRatio ?? (adj > 0 ? committedMinutes / adj : null),
    probableWorkload: overrides.probableWorkload,
    projectedAvailableMinutesAfterProbable: overrides.projectedAvailableMinutesAfterProbable ?? (adj - committedMinutes - probableMinutes),
    projectedGlobalLoadRatio: overrides.projectedGlobalLoadRatio ?? (adj > 0 ? (committedMinutes + probableMinutes) / adj : null),
  };
}

function makeCommitted(minutes: number) {
  return {
    technicianId: '', name: '', horizon: '7d' as ForecastHorizon,
    committedMinutes: minutes, committedProductiveMinutes: minutes,
    committedNonProductiveMinutes: 0, committedSavMinutes: 0, committedOtherMinutes: 0,
    interventionsCount: 1, dossiersCount: 1, sharedSlots: 0,
    loadConfidenceLevel: 'high' as const, loadPenalties: [],
    sourceBreakdown: { planning: minutes, visite: 0, intervention: 0 },
    durationSourceBreakdown: { explicit: minutes, computed: 0, planning: 0, business_default: 0, unknown: 0 },
    consolidationTrace: { merged: 0, keptSeparate: 0, discarded: 0, ambiguous: 0 },
  };
}

function makeProbable(minutes: number, overrides?: Record<string, unknown>) {
  const base = {
    technicianId: '', name: '', horizon: '7d' as ForecastHorizon,
    probableMinutes: minutes, highProbabilityMinutes: minutes, mediumProbabilityMinutes: 0, lowProbabilityMinutes: 0,
    probableItemsCount: 1, sourceBreakdown: { pipeline_mature: minutes, travaux_a_planifier: 0, dossier_en_attente: 0, charge_travaux_engine: 0, unassigned_project: 0 },
    universeBreakdown: {} as Record<string, number>,
    probableConfidenceLevel: 'high' as const, probablePenalties: [] as { code: string; reason: string; value: number }[],
  };
  return { ...base, ...overrides };
}

function makeTeamStats(overrides?: Partial<ForecastTeamStats>): ForecastTeamStats {
  return {
    horizon: '7d', totalTheoreticalMinutes: 4200, totalAdjustedMinutes: 4200,
    totalAvailableMinutes: 4200, totalAbsenceImpactMinutes: 0, technicianCount: 2,
    averageConfidenceLevel: 'high', ...overrides,
  };
}

function runRecs(snapshots: ForecastSnapshot[], teamStatsOverrides?: Partial<ForecastTeamStats>) {
  const horizon: ForecastHorizon = '7d';
  const { snapshots: tensionSnaps, teamStats: teamTension } = computeForecastTension(snapshots, horizon);
  const teamStats = makeTeamStats(teamStatsOverrides);
  return generateForecastRecommendations(snapshots, tensionSnaps, teamStats, teamTension, horizon);
}

// ============================================================================
// TESTS
// ============================================================================

describe('Forecast Recommendations (Lot 5)', () => {
  it('Cas 1: tech critical → protect_technician', () => {
    const snaps = [
      makeSnap({ technicianId: 'A', name: 'Alice', committedWorkload: makeCommitted(2400), projectedGlobalLoadRatio: 1.2, projectedAvailableMinutesAfterProbable: -200 }),
    ];
    const result = runRecs(snaps);
    const protect = result.technicianRecommendations.find(r => r.type === 'protect_technician');
    expect(protect).toBeDefined();
    expect(protect!.technicianId).toBe('A');
    expect(protect!.priority).toBe('critical');
  });

  it('Cas 2: tech comfort with margin → use_available_capacity', () => {
    const snaps = [
      makeSnap({ technicianId: 'B', name: 'Bob', committedWorkload: makeCommitted(200), projectedGlobalLoadRatio: 0.1, projectedAvailableMinutesAfterProbable: 1900 }),
    ];
    const result = runRecs(snaps);
    const use = result.technicianRecommendations.find(r => r.type === 'use_available_capacity');
    expect(use).toBeDefined();
    expect(use!.priority).toBe('medium');
  });

  it('Cas 3: team with tension + comfort → rebalance_load', () => {
    const snaps = [
      makeSnap({ technicianId: 'A', name: 'Alice', committedWorkload: makeCommitted(2200), projectedGlobalLoadRatio: 1.05, projectedAvailableMinutesAfterProbable: -100 }),
      makeSnap({ technicianId: 'B', name: 'Bob', committedWorkload: makeCommitted(200), projectedGlobalLoadRatio: 0.1, projectedAvailableMinutesAfterProbable: 1900 }),
    ];
    const result = runRecs(snaps);
    const rebalance = result.teamRecommendations.find(r => r.type === 'rebalance_load');
    expect(rebalance).toBeDefined();
  });

  it('Cas 4: uncertain assignment → secure_assignment', () => {
    const snaps = [
      makeSnap({
        technicianId: 'A', name: 'Alice',
        committedWorkload: makeCommitted(500),
        probableWorkload: makeProbable(800, {
          probablePenalties: [{ code: 'UNCERTAIN_TECH_ASSIGNMENT', reason: 'test', value: 0.5 }],
        }),
      }),
    ];
    const result = runRecs(snaps);
    const secure = result.teamRecommendations.find(r => r.type === 'secure_assignment');
    expect(secure).toBeDefined();
    expect(secure!.priority).toBe('high');
  });

  it('Cas 5: low confidence → increase_visibility', () => {
    const snaps = [
      makeSnap({ technicianId: 'A', name: 'Alice', forecastConfidenceLevel: 'low', committedWorkload: makeCommitted(500) }),
    ];
    const result = runRecs(snaps, { averageConfidenceLevel: 'low' });
    // Should have either tech or team level increase_visibility
    const vis = result.all.filter(r => r.type === 'increase_visibility');
    expect(vis.length).toBeGreaterThanOrEqual(1);
  });

  it('Cas 6: high probable share → review_probable_pipeline', () => {
    const snaps = [
      makeSnap({
        technicianId: 'A', name: 'Alice',
        committedWorkload: makeCommitted(400),
        probableWorkload: makeProbable(600),
        projectedGlobalLoadRatio: 0.48,
        projectedAvailableMinutesAfterProbable: 1100,
      }),
    ];
    const result = runRecs(snaps, {
      totalCommittedMinutes: 400,
      totalProbableMinutes: 600,
    });
    const pipeline = result.all.filter(r => r.type === 'review_probable_pipeline');
    expect(pipeline.length).toBeGreaterThanOrEqual(1);
  });

  it('Cas 7: concentrated universe → watch_universe', () => {
    const snaps = [
      makeSnap({
        technicianId: 'A', name: 'Alice',
        committedWorkload: makeCommitted(500),
        probableWorkload: makeProbable(800, { universeBreakdown: { plomberie: 700, electricite: 100 } }),
      }),
      makeSnap({
        technicianId: 'B', name: 'Bob',
        committedWorkload: makeCommitted(300),
        probableWorkload: makeProbable(200, { universeBreakdown: { plomberie: 200 } }),
      }),
    ];
    const result = runRecs(snaps);
    const watch = result.universeRecommendations.find(r => r.type === 'watch_universe');
    // plomberie = 900/1000 = 90% → should trigger
    expect(watch).toBeDefined();
    expect(watch!.universe).toBe('plomberie');
  });

  it('Cas 8: stable system → no_action', () => {
    const snaps = [
      makeSnap({ technicianId: 'A', name: 'Alice', committedWorkload: makeCommitted(500), projectedGlobalLoadRatio: 0.24, projectedAvailableMinutesAfterProbable: 1600 }),
      makeSnap({ technicianId: 'B', name: 'Bob', committedWorkload: makeCommitted(400), projectedGlobalLoadRatio: 0.19, projectedAvailableMinutesAfterProbable: 1700 }),
    ];
    const result = runRecs(snaps);
    const noAction = result.teamRecommendations.find(r => r.type === 'no_action');
    expect(noAction).toBeDefined();
    expect(noAction!.priority).toBe('low');
  });

  it('Cas 9: deduplication keeps highest priority', () => {
    const snaps = [
      makeSnap({ technicianId: 'A', name: 'Alice', committedWorkload: makeCommitted(2400), projectedGlobalLoadRatio: 1.2, projectedAvailableMinutesAfterProbable: -200 }),
    ];
    const result = runRecs(snaps);
    // Should have at most 1 rec per tech
    const techRecs = result.technicianRecommendations.filter(r => r.technicianId === 'A');
    expect(techRecs.length).toBeLessThanOrEqual(1);
  });

  it('Cas 10: priority sort is correct', () => {
    const snaps = [
      makeSnap({ technicianId: 'A', name: 'Alice', committedWorkload: makeCommitted(2400), projectedGlobalLoadRatio: 1.2, projectedAvailableMinutesAfterProbable: -200 }),
      makeSnap({ technicianId: 'B', name: 'Bob', committedWorkload: makeCommitted(200), projectedGlobalLoadRatio: 0.1, projectedAvailableMinutesAfterProbable: 1900 }),
    ];
    const result = runRecs(snaps);
    const priorities = result.all.map(r => r.priority);
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
    }
  });

  it('Cas 11: volume limits respected', () => {
    // Create many techs to test limits
    const snaps = Array.from({ length: 10 }, (_, i) =>
      makeSnap({
        technicianId: `T${i}`, name: `Tech${i}`,
        committedWorkload: makeCommitted(2400),
        projectedGlobalLoadRatio: 1.2,
        projectedAvailableMinutesAfterProbable: -200,
      })
    );
    const result = runRecs(snaps);
    expect(result.teamRecommendations.length).toBeLessThanOrEqual(3);
    expect(result.universeRecommendations.length).toBeLessThanOrEqual(3);
    // Each tech should have at most 1 rec
    const techIds = result.technicianRecommendations.map(r => r.technicianId);
    expect(new Set(techIds).size).toBe(techIds.length);
  });
});