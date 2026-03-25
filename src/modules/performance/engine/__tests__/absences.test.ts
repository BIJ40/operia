import { describe, it, expect } from 'vitest';
import { computeCapacity } from '../capacity';

describe('capacity — absence RH scenarios', () => {
  const baseWeekly = 35;

  // Helper: create date without time issues
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

  it('1. full day absence — 1 jour plein', () => {
    // Mon 2026-03-02 to Fri 2026-03-06 = 5 working days
    const result = computeCapacity(baseWeekly, {
      start: d(2026, 3, 2),
      end: d(2026, 3, 6),
    }, {
      absenceDays: 1,
      absenceSource: 'leave_table',
    });
    expect(result.workingDays).toBe(5);
    expect(result.absenceDays).toBe(1);
    expect(result.absenceConfidence).toBe(1.0);
    // 4 days * 7h * 60 = 1680
    expect(result.adjustedCapacityMinutes).toBe(1680);
  });

  it('2. half-day absence via absenceHours', () => {
    // Mon 2026-03-02 to Fri 2026-03-06 = 5 working days
    const result = computeCapacity(baseWeekly, {
      start: d(2026, 3, 2),
      end: d(2026, 3, 6),
    }, {
      absenceHours: 3.5, // half day
      absenceSource: 'leave_table',
    });
    expect(result.workingDays).toBe(5);
    // theoretical = 5 * 7 * 60 = 2100
    // adjusted = 2100 - (3.5 * 60) = 2100 - 210 = 1890
    expect(result.adjustedCapacityMinutes).toBe(1890);
    expect(result.absenceConfidence).toBe(1.0);
  });

  it('3. multi-day absence spanning weekend', () => {
    // Thu 2026-03-05 to Mon 2026-03-09 = period covers 3 working days
    // If absence is 3 working days deducted
    const result = computeCapacity(baseWeekly, {
      start: d(2026, 3, 5),
      end: d(2026, 3, 9),
    }, {
      absenceDays: 3,
      absenceSource: 'leave_table',
    });
    expect(result.workingDays).toBe(3); // Thu, Fri, Mon
    expect(result.absenceDays).toBe(3);
    // All days absent = 0 capacity
    expect(result.adjustedCapacityMinutes).toBe(0);
  });

  it('4. absenceHours takes priority over absenceDays', () => {
    const result = computeCapacity(baseWeekly, {
      start: d(2026, 3, 2),
      end: d(2026, 3, 6),
    }, {
      absenceDays: 5, // would zero out capacity
      absenceHours: 7, // but hours override = 1 day only
      absenceSource: 'leave_table',
    });
    // theoretical = 2100, adjusted = 2100 - 420 = 1680
    expect(result.adjustedCapacityMinutes).toBe(1680);
  });

  it('5. RH absence has confidence 1.0, planning has 0.3', () => {
    const rh = computeCapacity(baseWeekly, {
      start: d(2026, 3, 2),
      end: d(2026, 3, 6),
    }, {
      absenceDays: 1,
      absenceSource: 'leave_table',
    });
    expect(rh.absenceConfidence).toBe(1.0);

    const planning = computeCapacity(baseWeekly, {
      start: d(2026, 3, 2),
      end: d(2026, 3, 6),
    }, {
      absenceDays: 1,
      absenceSource: 'planning_unavailability',
      deductPlanningUnavailability: true,
    });
    expect(planning.absenceConfidence).toBe(0.3);
  });

  it('6. no absence source = no deduction, confidence 0', () => {
    const result = computeCapacity(baseWeekly, {
      start: d(2026, 3, 2),
      end: d(2026, 3, 6),
    }, {
      absenceSource: 'none',
    });
    expect(result.absenceConfidence).toBe(0);
    expect(result.absenceDays).toBe(0);
    expect(result.adjustedCapacityMinutes).toBe(result.theoreticalMinutes);
  });

  it('7. absenceHours handles large value (multiple days)', () => {
    // 5 working days, 21h absence = 3 days
    const result = computeCapacity(baseWeekly, {
      start: d(2026, 3, 2),
      end: d(2026, 3, 6),
    }, {
      absenceHours: 21,
      absenceSource: 'leave_table',
    });
    // theoretical = 2100, adjusted = 2100 - 1260 = 840
    expect(result.adjustedCapacityMinutes).toBe(840);
  });

  it('8. capacity cannot go below 0', () => {
    const result = computeCapacity(baseWeekly, {
      start: d(2026, 3, 2),
      end: d(2026, 3, 6),
    }, {
      absenceHours: 100, // way more than capacity
      absenceSource: 'leave_table',
    });
    expect(result.adjustedCapacityMinutes).toBe(0);
  });
});
