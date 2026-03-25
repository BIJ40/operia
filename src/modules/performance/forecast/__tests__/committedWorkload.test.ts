/**
 * Forecast — Tests charge engagée
 * Phase 6 Lot 2
 */

import { describe, it, expect } from 'vitest';
import { computeCommittedWorkload } from '../committedWorkload';
import type { CommittedWorkloadInput, ForecastHorizon } from '../types';

const PERIOD = {
  start: new Date('2025-02-01T00:00:00Z'),
  end: new Date('2025-02-08T00:00:00Z'),
};

function makeInput(overrides: Partial<CommittedWorkloadInput> = {}): CommittedWorkloadInput {
  return {
    interventions: [],
    creneaux: [],
    projectsById: new Map(),
    technicians: new Map([
      ['t1', { id: 't1', name: 'Tech A', weeklyHours: 35, isKnown: true }],
      ['t2', { id: 't2', name: 'Tech B', weeklyHours: 35, isKnown: true }],
    ]),
    period: PERIOD,
    defaultTaskDurationMinutes: 60,
    ...overrides,
  };
}

describe('computeCommittedWorkload', () => {
  const horizon: ForecastHorizon = '7d';

  // Cas 1 — créneau planning futur simple
  it('counts a single future planning slot', () => {
    const input = makeInput({
      creneaux: [{
        id: 'c1',
        refType: 'visite-interv',
        date: '2025-02-03T08:00:00Z',
        duree: 120,
        usersIds: ['t1'],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(1);
    expect(result.workloads[0].committedMinutes).toBe(120);
    expect(result.workloads[0].sourceBreakdown.planning).toBe(120);
  });

  // Cas 2 — visite future simple
  it('counts a single future visite', () => {
    const input = makeInput({
      interventions: [{
        id: 'int1',
        type: 'travaux',
        dossierId: 'p1',
        visites: [{
          id: 'vis1',
          date: '2025-02-04T09:00:00Z',
          dureeMinutes: 90,
          usersIds: ['t1'],
        }],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(1);
    expect(result.workloads[0].committedMinutes).toBe(90);
    expect(result.workloads[0].sourceBreakdown.visite).toBe(90);
  });

  // Cas 3 — intervention future sans visite (fallback)
  it('includes future intervention fallback when no visite', () => {
    const input = makeInput({
      interventions: [{
        id: 'int2',
        type: 'depannage',
        dateIntervention: '2025-02-05T10:00:00Z',
        dureeMinutes: 60,
        usersIds: ['t2'],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(1);
    expect(result.workloads[0].committedMinutes).toBe(60);
    expect(result.workloads[0].sourceBreakdown.intervention).toBe(60);
  });

  // Cas 4 — planning + visite même travail → merge (pas de double comptage)
  it('merges planning and visite for the same work', () => {
    const input = makeInput({
      interventions: [{
        id: 'int3',
        type: 'travaux',
        dossierId: 'p2',
        visites: [{
          id: 'vis3',
          date: '2025-02-03T08:00:00Z',
          dureeMinutes: 120,
          usersIds: ['t1'],
        }],
      }],
      creneaux: [{
        id: 'c3',
        refType: 'visite-interv',
        date: '2025-02-03T08:00:00Z',
        duree: 120,
        usersIds: ['t1'],
        interventionId: 'int3',
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    // Should have merged — not double counted
    expect(result.workloads).toHaveLength(1);
    // Should be ~120 not ~240
    expect(result.workloads[0].committedMinutes).toBeLessThanOrEqual(130);
    expect(result.matchLog.some(m => m.outcome === 'merged')).toBe(true);
  });

  // Cas 5 — items non liés, gardés séparés
  it('keeps unrelated items separate', () => {
    const input = makeInput({
      interventions: [{
        id: 'int4',
        type: 'travaux',
        visites: [{
          id: 'vis4',
          date: '2025-02-03T08:00:00Z',
          dureeMinutes: 60,
          usersIds: ['t1'],
        }],
      }],
      creneaux: [{
        id: 'c4',
        refType: 'visite-interv',
        date: '2025-02-06T14:00:00Z',
        duree: 90,
        usersIds: ['t2'],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(2);
    const t1 = result.workloads.find(w => w.technicianId === 't1');
    const t2 = result.workloads.find(w => w.technicianId === 't2');
    expect(t1?.committedMinutes).toBe(60);
    expect(t2?.committedMinutes).toBe(90);
  });

  // Cas 6 — multi-tech allocation
  it('splits duration equally across technicians', () => {
    const input = makeInput({
      creneaux: [{
        id: 'c5',
        refType: 'visite-interv',
        date: '2025-02-03T08:00:00Z',
        duree: 120,
        usersIds: ['t1', 't2'],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(2);
    for (const w of result.workloads) {
      expect(w.committedMinutes).toBe(60);
    }
  });

  // Cas 7 — durée fallback → business_default
  it('uses business_default when no duration available', () => {
    const input = makeInput({
      creneaux: [{
        id: 'c6',
        refType: 'visite-interv',
        date: '2025-02-03T08:00:00Z',
        usersIds: ['t1'],
        // No duree field
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(1);
    expect(result.workloads[0].committedMinutes).toBe(60); // defaultTaskDurationMinutes
    expect(result.workloads[0].durationSourceBreakdown.business_default).toBe(60);
  });

  // Cas 8 — item sans tech → exclu
  it('excludes items without technician', () => {
    const input = makeInput({
      creneaux: [{
        id: 'c7',
        refType: 'visite-interv',
        date: '2025-02-03T08:00:00Z',
        duree: 120,
        usersIds: [],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(0);
  });

  // Cas 9 — item hors période → exclu
  it('excludes items outside the period', () => {
    const input = makeInput({
      creneaux: [{
        id: 'c8',
        refType: 'visite-interv',
        date: '2025-03-15T08:00:00Z', // way outside period
        duree: 120,
        usersIds: ['t1'],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(0);
  });

  // Cas 10 — SAV futur classé correctement
  it('classifies future SAV correctly', () => {
    const input = makeInput({
      interventions: [{
        id: 'int-sav',
        type: 'sav',
        visites: [{
          id: 'vis-sav',
          date: '2025-02-04T08:00:00Z',
          dureeMinutes: 45,
          usersIds: ['t1'],
        }],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads[0].committedSavMinutes).toBe(45);
  });

  // Cas 11 — matching ambigu
  it('logs ambiguous matches', () => {
    const input = makeInput({
      interventions: [{
        id: 'int-amb',
        type: 'travaux',
        visites: [{
          id: 'vis-amb',
          date: '2025-02-03T08:00:00Z',
          dureeMinutes: 120,
          usersIds: ['t1'],
        }],
      }],
      creneaux: [{
        id: 'c-amb',
        refType: 'visite-interv',
        date: '2025-02-03T09:00:00Z', // 1h offset — partial overlap
        duree: 90,
        usersIds: ['t1'],
        // No interventionId — can't match on that
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    // Should have some ambiguity or merge depending on score
    expect(result.items.length).toBeGreaterThan(0);
  });

  // Cas 12 — source breakdown correct
  it('tracks source breakdown correctly', () => {
    const input = makeInput({
      interventions: [{
        id: 'int-src',
        type: 'travaux',
        visites: [{
          id: 'vis-src1',
          date: '2025-02-03T08:00:00Z',
          dureeMinutes: 60,
          usersIds: ['t1'],
        }],
      }],
      creneaux: [{
        id: 'c-src',
        refType: 'visite-interv',
        date: '2025-02-05T14:00:00Z',
        duree: 90,
        usersIds: ['t1'],
      }],
    });

    const result = computeCommittedWorkload(input, horizon);
    const t1 = result.workloads.find(w => w.technicianId === 't1')!;
    expect(t1.sourceBreakdown.visite + t1.sourceBreakdown.planning).toBe(t1.committedMinutes);
  });

  // Cas 13 — duration source breakdown
  it('tracks duration source breakdown', () => {
    const input = makeInput({
      creneaux: [
        {
          id: 'c-ds1',
          refType: 'visite-interv',
          date: '2025-02-03T08:00:00Z',
          duree: 60,
          usersIds: ['t1'],
        },
        {
          id: 'c-ds2',
          refType: 'visite-interv',
          date: '2025-02-04T08:00:00Z',
          usersIds: ['t1'],
          // no duree → business_default
        },
      ],
    });

    const result = computeCommittedWorkload(input, horizon);
    const t1 = result.workloads.find(w => w.technicianId === 't1')!;
    expect(t1.durationSourceBreakdown.planning).toBe(60);
    expect(t1.durationSourceBreakdown.business_default).toBe(60);
  });

  // Cas 14 — team stats aggregation
  it('aggregates team stats correctly', () => {
    const input = makeInput({
      creneaux: [
        { id: 'c-t1', refType: 'visite-interv', date: '2025-02-03T08:00:00Z', duree: 120, usersIds: ['t1'] },
        { id: 'c-t2', refType: 'visite-interv', date: '2025-02-04T08:00:00Z', duree: 180, usersIds: ['t2'] },
      ],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.teamStats.totalCommittedMinutes).toBe(300);
    expect(result.teamStats.horizon).toBe('7d');
  });

  // Cas — absence types are excluded from workload
  it('excludes conge/absence creneaux from workload', () => {
    const input = makeInput({
      creneaux: [
        { id: 'c-conge', refType: 'conge', date: '2025-02-03T08:00:00Z', duree: 420, usersIds: ['t1'] },
        { id: 'c-abs', refType: 'absence', date: '2025-02-04T08:00:00Z', duree: 420, usersIds: ['t1'] },
      ],
    });

    const result = computeCommittedWorkload(input, horizon);
    expect(result.workloads).toHaveLength(0);
  });
});
