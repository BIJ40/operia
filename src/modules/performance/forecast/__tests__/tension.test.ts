/**
 * Forecast — Tests tension prédictive
 * Phase 6 Lot 4
 */

import { describe, it, expect } from 'vitest';
import { computeForecastTension, aggregateForecastTeamTension } from '../tension';
import type { ForecastSnapshot, ForecastHorizon } from '../types';

const HORIZON: ForecastHorizon = '7d';

function makeSnapshot(overrides: Partial<ForecastSnapshot> & {
  committedMinutes?: number;
  probableMinutes?: number;
  adjustedCapacity?: number;
} = {}): ForecastSnapshot {
  const adjusted = overrides.adjustedCapacity ?? 2400; // 5 days × 8h
  const committed = overrides.committedMinutes ?? 0;
  const probable = overrides.probableMinutes ?? 0;
  const totalLoad = committed + probable;

  const snap: ForecastSnapshot = {
    technicianId: overrides.technicianId ?? 't1',
    name: overrides.name ?? 'Tech A',
    horizon: overrides.horizon ?? HORIZON,
    projectedCapacity: {
      theoreticalMinutes: adjusted,
      adjustedCapacityMinutes: adjusted,
      availableMinutes: adjusted,
      absenceImpactMinutes: 0,
      workingDays: 5,
      absenceDays: 0,
      horizon: overrides.horizon ?? HORIZON,
    },
    weeklyHours: 35,
    weeklyHoursSource: 'contract',
    forecastConfidenceLevel: overrides.forecastConfidenceLevel ?? 'high',
    forecastConfidenceScore: 0.9,
    forecastPenalties: [],
  };

  if (committed > 0) {
    snap.committedWorkload = {
      technicianId: snap.technicianId,
      name: snap.name,
      horizon: HORIZON,
      committedMinutes: committed,
      committedProductiveMinutes: committed,
      committedNonProductiveMinutes: 0,
      committedSavMinutes: 0,
      committedOtherMinutes: 0,
      interventionsCount: 1,
      dossiersCount: 1,
      sharedSlots: 0,
      loadConfidenceLevel: 'high',
      loadPenalties: [],
      sourceBreakdown: { planning: committed, visite: 0, intervention: 0 },
      durationSourceBreakdown: { explicit: committed, computed: 0, planning: 0, business_default: 0, unknown: 0 },
      consolidationTrace: { merged: 0, keptSeparate: 1, discarded: 0, ambiguous: 0 },
    };
    snap.projectedAvailableMinutesAfterCommitted = adjusted - committed;
    snap.projectedCommittedLoadRatio = adjusted > 0 ? Math.round((committed / adjusted) * 1000) / 1000 : null;
  }

  if (probable > 0) {
    snap.probableWorkload = {
      technicianId: snap.technicianId,
      name: snap.name,
      horizon: HORIZON,
      probableMinutes: probable,
      highProbabilityMinutes: probable,
      mediumProbabilityMinutes: 0,
      lowProbabilityMinutes: 0,
      probableItemsCount: 1,
      sourceBreakdown: { pipeline_mature: 0, travaux_a_planifier: probable, dossier_en_attente: 0, charge_travaux_engine: 0, unassigned_project: 0 },
      universeBreakdown: { Plomberie: probable },
      probableConfidenceLevel: 'high',
      probablePenalties: overrides.probableWorkload?.probablePenalties ?? [],
    };
    snap.projectedAvailableMinutesAfterProbable = adjusted - totalLoad;
    snap.projectedGlobalLoadRatio = adjusted > 0 ? Math.round((totalLoad / adjusted) * 1000) / 1000 : null;
  } else if (committed > 0) {
    // Global ratio = committed only
    snap.projectedAvailableMinutesAfterProbable = adjusted - committed;
    snap.projectedGlobalLoadRatio = snap.projectedCommittedLoadRatio;
  }

  return snap;
}

describe('computeForecastTension', () => {
  // Cas 1 — charge faible → comfort
  it('returns comfort for low load', () => {
    const snaps = [makeSnapshot({ committedMinutes: 480, probableMinutes: 200 })]; // ~28%
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].predictedTensionLevel).toBe('comfort');
  });

  // Cas 2 — ratio global 0.8 → watch
  it('returns watch for moderate load', () => {
    const snaps = [makeSnapshot({ committedMinutes: 1440, probableMinutes: 480 })]; // 1920/2400 = 0.8
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].predictedTensionLevel).toBe('watch');
  });

  // Cas 3 — ratio global ~1.0 → tension
  it('returns tension for high load', () => {
    const snaps = [makeSnapshot({ committedMinutes: 1920, probableMinutes: 400 })]; // 2320/2400 = 0.967
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].predictedTensionLevel).toBe('tension');
  });

  // Cas 4 — ratio global 1.2 → critical
  it('returns critical for overloaded', () => {
    const snaps = [makeSnapshot({ committedMinutes: 2400, probableMinutes: 480 })]; // 2880/2400 = 1.2
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].predictedTensionLevel).toBe('critical');
  });

  // Cas 5 — capacité nulle → critical
  it('returns critical when capacity is zero', () => {
    const snaps = [makeSnapshot({ adjustedCapacity: 0, committedMinutes: 0, probableMinutes: 0 })];
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].predictedTensionLevel).toBe('critical');
    expect(result.snapshots[0].factors.some(f => f.code === 'NO_CAPACITY')).toBe(true);
  });

  // Cas 6 — confiance faible mais charge modérée → watch
  it('returns watch when confidence is low with moderate load', () => {
    const snaps = [makeSnapshot({
      committedMinutes: 480,
      probableMinutes: 200,
      forecastConfidenceLevel: 'low',
    })];
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].predictedTensionLevel).toBe('watch');
    expect(result.snapshots[0].factors.some(f => f.code === 'LOW_CONFIDENCE')).toBe(true);
  });

  // Cas 7 — forte part probable → facteur HIGH_PROBABLE_SHARE
  it('flags HIGH_PROBABLE_SHARE when probable exceeds 40% of total', () => {
    const snaps = [makeSnapshot({ committedMinutes: 200, probableMinutes: 600 })]; // 600/800 = 75%
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].factors.some(f => f.code === 'HIGH_PROBABLE_SHARE')).toBe(true);
  });

  // Cas 8 — affectation incertaine → facteur UNCERTAIN_ASSIGNMENT
  it('flags UNCERTAIN_ASSIGNMENT when penalty present', () => {
    const snap = makeSnapshot({ committedMinutes: 480, probableMinutes: 200 });
    snap.probableWorkload!.probablePenalties = [
      { code: 'UNCERTAIN_TECH_ASSIGNMENT', reason: 'test', value: 0.15 },
    ];
    const result = computeForecastTension([snap], HORIZON);
    expect(result.snapshots[0].factors.some(f => f.code === 'UNCERTAIN_ASSIGNMENT')).toBe(true);
  });

  // Cas 9 — capacité restante négative → critical
  it('returns critical when available is negative', () => {
    const snaps = [makeSnapshot({ committedMinutes: 2000, probableMinutes: 800 })]; // -400
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].predictedTensionLevel).toBe('critical');
    expect(result.snapshots[0].availableAfterProbable).toBeLessThan(0);
  });

  // Cas 10 — agrégation équipe correcte
  it('aggregates team tension correctly', () => {
    const snaps = [
      makeSnapshot({ technicianId: 't1', committedMinutes: 480, probableMinutes: 200 }),   // comfort
      makeSnapshot({ technicianId: 't2', committedMinutes: 1440, probableMinutes: 480 }),   // watch
      makeSnapshot({ technicianId: 't3', committedMinutes: 2400, probableMinutes: 480 }),   // critical
    ];
    const result = computeForecastTension(snaps, HORIZON);

    expect(result.teamStats.techniciansInComfort).toBe(1);
    expect(result.teamStats.techniciansInWatch).toBe(1);
    expect(result.teamStats.techniciansInCritical).toBe(1);
    expect(result.teamStats.averageGlobalLoadRatio).not.toBeNull();
    expect(result.teamStats.topFactors.length).toBeGreaterThan(0);
  });

  // Cas 11 — HIGH_COMMITTED_LOAD factor
  it('flags HIGH_COMMITTED_LOAD when committed ratio >= 0.85', () => {
    const snaps = [makeSnapshot({ committedMinutes: 2100, probableMinutes: 0 })]; // 2100/2400 = 0.875
    const result = computeForecastTension(snaps, HORIZON);
    expect(result.snapshots[0].factors.some(f => f.code === 'HIGH_COMMITTED_LOAD')).toBe(true);
  });

  // Cas 12 — no data = comfort
  it('returns empty results for empty snapshots', () => {
    const result = computeForecastTension([], HORIZON);
    expect(result.snapshots).toHaveLength(0);
    expect(result.teamStats.predictedTensionLevel).toBe('comfort');
  });
});
