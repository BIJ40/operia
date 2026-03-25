/**
 * Forecast — Tests capacité future
 * Phase 6 Lot 1
 */

import { describe, it, expect } from 'vitest';
import { computeForecastCapacity } from '../capacityFuture';
import type { ForecastInput, ForecastTechnicianInput } from '../types';

// Helper: create a Monday reference date
function monday(y: number, m: number, d: number): Date {
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

describe('computeForecastCapacity', () => {
  const baseTech: ForecastTechnicianInput = {
    id: 'tech-1',
    name: 'Jean',
    weeklyHours: 35,
    futureAbsences: [],
  };

  const baseInput: ForecastInput = {
    technicians: [baseTech],
    holidays: [],
    defaultWeeklyHours: 35,
    referenceDate: monday(2026, 3, 23), // Monday 2026-03-23
  };

  it('computes 3 horizons per technician', () => {
    const output = computeForecastCapacity(baseInput);
    expect(output.snapshots).toHaveLength(3);
    expect(output.snapshots.map(s => s.horizon)).toEqual(['J+7', 'J+14', 'J+30']);
  });

  it('J+7 from Monday = 5 working days', () => {
    const output = computeForecastCapacity(baseInput);
    const snap = output.snapshots.find(s => s.horizon === 'J+7')!;
    // Tue 24 to Mon 30 = 5 weekdays (Tue-Fri + Mon)
    expect(snap.workingDays).toBe(5);
    expect(snap.projectedCapacityMinutes).toBe(5 * 7 * 60); // 5 days × 7h × 60
    expect(snap.projectedAvailableMinutes).toBe(snap.projectedCapacityMinutes);
    expect(snap.absenceImpactMinutes).toBe(0);
  });

  it('deducts known future absences', () => {
    const input: ForecastInput = {
      ...baseInput,
      technicians: [{
        ...baseTech,
        futureAbsences: [
          { date: new Date(2026, 2, 25), hours: 7, type: 'conge', source: 'rh' }, // Wed
          { date: new Date(2026, 2, 26), hours: 7, type: 'conge', source: 'rh' }, // Thu
        ],
      }],
    };
    const output = computeForecastCapacity(input);
    const snap = output.snapshots.find(s => s.horizon === 'J+7')!;
    expect(snap.absenceDays).toBe(2);
    expect(snap.absenceImpactMinutes).toBe(2 * 7 * 60);
    expect(snap.projectedAvailableMinutes).toBe(snap.projectedCapacityMinutes - snap.absenceImpactMinutes);
  });

  it('excludes holidays from working days', () => {
    const input: ForecastInput = {
      ...baseInput,
      holidays: [new Date(2026, 2, 24)], // Tue is holiday
    };
    const output = computeForecastCapacity(input);
    const snap = output.snapshots.find(s => s.horizon === 'J+7')!;
    expect(snap.workingDays).toBe(4); // 5 - 1 holiday
  });

  it('excludes weekend absences', () => {
    const input: ForecastInput = {
      ...baseInput,
      technicians: [{
        ...baseTech,
        futureAbsences: [
          { date: new Date(2026, 2, 28), hours: 7, type: 'conge', source: 'rh' }, // Saturday
        ],
      }],
    };
    const output = computeForecastCapacity(input);
    const snap = output.snapshots.find(s => s.horizon === 'J+7')!;
    expect(snap.absenceDays).toBe(0);
  });

  it('supports half-day absences', () => {
    const input: ForecastInput = {
      ...baseInput,
      technicians: [{
        ...baseTech,
        futureAbsences: [
          { date: new Date(2026, 2, 25), hours: 3.5, type: 'conge', source: 'rh' },
        ],
      }],
    };
    const output = computeForecastCapacity(input);
    const snap = output.snapshots.find(s => s.horizon === 'J+7')!;
    expect(snap.absenceImpactMinutes).toBe(210); // 3.5h × 60
  });

  it('uses default hours when no contract', () => {
    const input: ForecastInput = {
      ...baseInput,
      technicians: [{ id: 'tech-2', name: 'Paul', futureAbsences: [] }],
    };
    const output = computeForecastCapacity(input);
    const snap = output.snapshots.find(s => s.horizon === 'J+7')!;
    expect(snap.weeklyHoursSource).toBe('default');
    expect(snap.weeklyHours).toBe(35);
  });

  // Confidence tests
  it('high confidence with contract + RH absences + holidays + short horizon', () => {
    const input: ForecastInput = {
      ...baseInput,
      holidays: [new Date(2026, 4, 1)],
      technicians: [{
        ...baseTech,
        futureAbsences: [
          { date: new Date(2026, 2, 25), hours: 7, type: 'conge', source: 'rh' },
        ],
      }],
    };
    const output = computeForecastCapacity(input);
    const snap = output.snapshots.find(s => s.horizon === 'J+7')!;
    expect(snap.forecastConfidenceLevel).toBe('high');
    expect(snap.forecastConfidenceScore).toBeGreaterThanOrEqual(0.75);
  });

  it('lower confidence for J+30 with no contract and no absences', () => {
    const input: ForecastInput = {
      ...baseInput,
      technicians: [{ id: 'tech-3', name: 'Luc', futureAbsences: [] }],
    };
    const output = computeForecastCapacity(input);
    const snap = output.snapshots.find(s => s.horizon === 'J+30')!;
    expect(snap.forecastConfidenceLevel).not.toBe('high');
    expect(snap.forecastPenalties.length).toBeGreaterThan(0);
  });

  it('penalizes planning-only absences', () => {
    const input: ForecastInput = {
      ...baseInput,
      technicians: [{
        ...baseTech,
        futureAbsences: [
          { date: new Date(2026, 2, 25), hours: 7, type: 'indispo', source: 'planning' },
        ],
      }],
    };
    const output = computeForecastCapacity(input);
    const snap = output.snapshots.find(s => s.horizon === 'J+7')!;
    const hasPlanningPenalty = snap.forecastPenalties.some(p => p.code === 'PLANNING_ONLY_ABSENCES');
    expect(hasPlanningPenalty).toBe(true);
  });

  it('available minutes never goes below 0', () => {
    const absences = [];
    for (let i = 24; i <= 30; i++) {
      absences.push({ date: new Date(2026, 2, i), hours: 14, type: 'maladie', source: 'rh' as const });
    }
    const input: ForecastInput = {
      ...baseInput,
      technicians: [{ ...baseTech, futureAbsences: absences }],
    };
    const output = computeForecastCapacity(input);
    for (const snap of output.snapshots) {
      expect(snap.projectedAvailableMinutes).toBeGreaterThanOrEqual(0);
    }
  });

  it('handles multiple technicians', () => {
    const input: ForecastInput = {
      ...baseInput,
      technicians: [
        { id: 'a', name: 'A', weeklyHours: 35, futureAbsences: [] },
        { id: 'b', name: 'B', weeklyHours: 39, futureAbsences: [] },
      ],
    };
    const output = computeForecastCapacity(input);
    expect(output.snapshots).toHaveLength(6); // 2 techs × 3 horizons
    const bJ7 = output.snapshots.find(s => s.technicianId === 'b' && s.horizon === 'J+7')!;
    expect(bJ7.weeklyHours).toBe(39);
  });
});
