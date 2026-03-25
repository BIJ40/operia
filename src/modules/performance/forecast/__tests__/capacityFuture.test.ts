/**
 * Forecast — Tests capacité future
 * Phase 6 Lot 1
 */

import { describe, it, expect } from 'vitest';
import { computeFutureCapacity, computeFutureCapacityAllHorizons } from '../capacityFuture';
import type { CapacityFutureInput } from '../types';

// Helper: create a Monday reference date
function monday(y: number, m: number, d: number): Date {
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function makeInput(overrides: Partial<CapacityFutureInput> = {}): CapacityFutureInput {
  const ref = monday(2026, 3, 23); // Monday 2026-03-23
  const start = new Date(ref); start.setDate(start.getDate() + 1); // Tue
  const end = new Date(ref); end.setDate(end.getDate() + 7); // Mon next week

  const technicians = new Map([
    ['tech-1', { id: 'tech-1', name: 'Jean', weeklyHours: 35, isKnown: true }],
  ]);

  return {
    technicians: overrides.technicians ?? technicians,
    absences: overrides.absences ?? new Map(),
    config: overrides.config ?? {
      defaultWeeklyHours: 35,
      holidays: [],
      deductPlanningUnavailability: false,
    },
    period: overrides.period ?? { start, end },
    horizon: overrides.horizon ?? '7d',
  };
}

describe('computeFutureCapacity', () => {
  it('computes capacity for a single technician on 7d horizon', () => {
    const input = makeInput();
    const snapshots = computeFutureCapacity(input);

    expect(snapshots).toHaveLength(1);
    const snap = snapshots[0];
    expect(snap.technicianId).toBe('tech-1');
    expect(snap.horizon).toBe('7d');
    // Tue to Mon = 5 weekdays
    expect(snap.projectedCapacity.workingDays).toBe(5);
    expect(snap.projectedCapacity.theoreticalMinutes).toBe(5 * 7 * 60);
    expect(snap.projectedCapacity.availableMinutes).toBe(snap.projectedCapacity.adjustedCapacityMinutes);
    expect(snap.projectedCapacity.absenceImpactMinutes).toBe(0);
  });

  it('uses default 35h when no contract', () => {
    const technicians = new Map([
      ['tech-2', { id: 'tech-2', name: 'Paul', isKnown: true }], // no weeklyHours
    ]);
    const snapshots = computeFutureCapacity(makeInput({ technicians }));
    const snap = snapshots[0];
    expect(snap.weeklyHoursSource).toBe('default');
    expect(snap.weeklyHours).toBe(35);
  });

  it('deducts full-day RH absence', () => {
    const absences = new Map([
      ['tech-1', {
        technicianId: 'tech-1',
        source: 'leave_table' as const,
        label: 'Congé',
        days: 2,
      }],
    ]);
    const snapshots = computeFutureCapacity(makeInput({ absences }));
    const snap = snapshots[0];
    expect(snap.projectedCapacity.absenceDays).toBe(2);
    expect(snap.projectedCapacity.absenceImpactMinutes).toBe(2 * 7 * 60);
    expect(snap.projectedCapacity.adjustedCapacityMinutes).toBe(3 * 7 * 60);
  });

  it('deducts partial absence in hours', () => {
    const absences = new Map([
      ['tech-1', {
        technicianId: 'tech-1',
        source: 'leave_table' as const,
        label: 'Demi-journée',
        hours: 3.5,
      }],
    ]);
    const snapshots = computeFutureCapacity(makeInput({ absences }));
    const snap = snapshots[0];
    expect(snap.projectedCapacity.absenceImpactMinutes).toBe(210); // 3.5h × 60
  });

  it('does NOT deduct planning absence when config disallows', () => {
    const absences = new Map([
      ['tech-1', {
        technicianId: 'tech-1',
        source: 'planning_unavailability' as const,
        label: 'Indispo planning',
        days: 1,
      }],
    ]);
    const snapshots = computeFutureCapacity(makeInput({ absences }));
    const snap = snapshots[0];
    // deductPlanningUnavailability = false → 0 deduction
    expect(snap.projectedCapacity.absenceDays).toBe(0);
    expect(snap.projectedCapacity.absenceImpactMinutes).toBe(0);
  });

  it('deducts planning absence when config allows', () => {
    const absences = new Map([
      ['tech-1', {
        technicianId: 'tech-1',
        source: 'planning_unavailability' as const,
        label: 'Indispo planning',
        days: 1,
      }],
    ]);
    const config = { defaultWeeklyHours: 35, holidays: [], deductPlanningUnavailability: true };
    const snapshots = computeFutureCapacity(makeInput({ absences, config }));
    const snap = snapshots[0];
    expect(snap.projectedCapacity.absenceDays).toBe(1);
  });

  it('excludes holidays from working days', () => {
    const ref = monday(2026, 3, 23);
    const tue = new Date(2026, 2, 24); // Tue = holiday
    const config = { defaultWeeklyHours: 35, holidays: [tue], deductPlanningUnavailability: false };
    const snapshots = computeFutureCapacity(makeInput({ config }));
    const snap = snapshots[0];
    expect(snap.projectedCapacity.workingDays).toBe(4);
  });

  // Confidence tests
  it('high confidence with contract + RH absence + holidays', () => {
    const absences = new Map([
      ['tech-1', {
        technicianId: 'tech-1',
        source: 'leave_table' as const,
        label: 'Congé',
        days: 1,
      }],
    ]);
    const config = { defaultWeeklyHours: 35, holidays: [new Date(2026, 4, 1)], deductPlanningUnavailability: false };
    const snapshots = computeFutureCapacity(makeInput({ absences, config }));
    const snap = snapshots[0];
    expect(snap.forecastConfidenceLevel).toBe('high');
    expect(snap.forecastConfidenceScore).toBeGreaterThanOrEqual(0.70);
  });

  it('penalizes default weekly hours', () => {
    const technicians = new Map([
      ['tech-no-contract', { id: 'tech-no-contract', name: 'Luc', isKnown: true }],
    ]);
    const snapshots = computeFutureCapacity(makeInput({ technicians }));
    const snap = snapshots[0];
    const hasPenalty = snap.forecastPenalties.some(p => p.code === 'DEFAULT_WEEKLY_HOURS');
    expect(hasPenalty).toBe(true);
  });

  it('penalizes planning-only absences', () => {
    const absences = new Map([
      ['tech-1', {
        technicianId: 'tech-1',
        source: 'planning_unavailability' as const,
        label: 'Indispo',
        days: 1,
      }],
    ]);
    const snapshots = computeFutureCapacity(makeInput({ absences }));
    const snap = snapshots[0];
    expect(snap.forecastPenalties.some(p => p.code === 'PLANNING_ONLY_ABSENCES')).toBe(true);
  });

  it('penalizes no absence data', () => {
    const snapshots = computeFutureCapacity(makeInput());
    const snap = snapshots[0];
    expect(snap.forecastPenalties.some(p => p.code === 'NO_RH_ABSENCES')).toBe(true);
  });

  it('available minutes never goes below 0', () => {
    const absences = new Map([
      ['tech-1', {
        technicianId: 'tech-1',
        source: 'leave_table' as const,
        label: 'Long arrêt',
        days: 30,
      }],
    ]);
    const snapshots = computeFutureCapacity(makeInput({ absences }));
    for (const snap of snapshots) {
      expect(snap.projectedCapacity.availableMinutes).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('computeFutureCapacityAllHorizons', () => {
  it('produces 3 snapshots per technician across all horizons', () => {
    const technicians = new Map([
      ['a', { id: 'a', name: 'A', weeklyHours: 35, isKnown: true }],
      ['b', { id: 'b', name: 'B', weeklyHours: 39, isKnown: true }],
    ]);
    const snapshots = computeFutureCapacityAllHorizons(
      technicians,
      new Map(),
      { defaultWeeklyHours: 35, holidays: [], deductPlanningUnavailability: false },
      monday(2026, 3, 23)
    );
    expect(snapshots).toHaveLength(6); // 2 techs × 3 horizons
    expect(snapshots.filter(s => s.technicianId === 'b' && s.horizon === '7d')).toHaveLength(1);
  });

  it('30d horizon has more working days than 7d', () => {
    const technicians = new Map([
      ['t', { id: 't', name: 'T', weeklyHours: 35, isKnown: true }],
    ]);
    const snapshots = computeFutureCapacityAllHorizons(
      technicians,
      new Map(),
      { defaultWeeklyHours: 35, holidays: [], deductPlanningUnavailability: false },
      monday(2026, 3, 23)
    );
    const s7 = snapshots.find(s => s.horizon === '7d')!;
    const s30 = snapshots.find(s => s.horizon === '30d')!;
    expect(s30.projectedCapacity.workingDays).toBeGreaterThan(s7.projectedCapacity.workingDays);
  });

  it('penalizes 30d horizon more than 7d', () => {
    const technicians = new Map([
      ['t', { id: 't', name: 'T', weeklyHours: 35, isKnown: true }],
    ]);
    const snapshots = computeFutureCapacityAllHorizons(
      technicians,
      new Map(),
      { defaultWeeklyHours: 35, holidays: [new Date(2026, 4, 1)], deductPlanningUnavailability: false },
      monday(2026, 3, 23)
    );
    const s7 = snapshots.find(s => s.horizon === '7d')!;
    const s30 = snapshots.find(s => s.horizon === '30d')!;
    expect(s30.forecastConfidenceScore).toBeLessThan(s7.forecastConfidenceScore);
  });
});
