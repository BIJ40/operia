import { describe, it, expect } from 'vitest';
import { computeCapacity } from '../capacity';

describe('computeCapacity', () => {
  const period = {
    start: new Date('2025-01-06'), // Monday
    end: new Date('2025-01-10'),   // Friday
  };

  it('computes 5 working days for Mon-Fri week', () => {
    const result = computeCapacity(35, period);
    expect(result.workingDays).toBe(5);
    expect(result.theoreticalMinutes).toBe(35 * 60); // 35h = 2100min
    expect(result.adjustedCapacityMinutes).toBe(2100);
  });

  it('excludes weekends', () => {
    const weekWithWeekend = {
      start: new Date('2025-01-06'), // Monday
      end: new Date('2025-01-12'),   // Sunday
    };
    const result = computeCapacity(35, weekWithWeekend);
    expect(result.workingDays).toBe(5); // Mon-Fri only
  });

  it('uses contract hours when != 35', () => {
    const result = computeCapacity(39, period);
    expect(result.capacityConfidence).toBe(1.0);
    expect(result.theoreticalMinutes).toBe(Math.round((39 / 5) * 60 * 5));
  });

  it('uses default confidence for 35h', () => {
    const result = computeCapacity(35, period);
    expect(result.capacityConfidence).toBe(0.5);
  });

  it('does NOT deduct planning_unavailability by default', () => {
    const result = computeCapacity(35, period, {
      absenceDays: 2,
      absenceSource: 'planning_unavailability',
      deductPlanningUnavailability: false,
    });
    expect(result.absenceDays).toBe(0);
    expect(result.reportedAbsenceDays).toBe(2);
    expect(result.adjustedCapacityMinutes).toBe(2100);
    expect(result.absenceConfidence).toBe(0.3);
  });

  it('deducts planning_unavailability when config allows', () => {
    const result = computeCapacity(35, period, {
      absenceDays: 2,
      absenceSource: 'planning_unavailability',
      deductPlanningUnavailability: true,
    });
    expect(result.absenceDays).toBe(2);
    expect(result.adjustedCapacityMinutes).toBe(Math.round((35 / 5) * 60 * 3));
  });

  it('fully deducts leave_table absences', () => {
    const result = computeCapacity(35, period, {
      absenceDays: 3,
      absenceSource: 'leave_table',
    });
    expect(result.absenceDays).toBe(3);
    expect(result.absenceConfidence).toBe(1.0);
    expect(result.adjustedCapacityMinutes).toBe(Math.round((35 / 5) * 60 * 2));
  });

  it('converts absenceHours into reported absence days', () => {
    const result = computeCapacity(35, period, {
      absenceHours: 3.5,
      absenceSource: 'leave_table',
    });
    expect(result.reportedAbsenceHours).toBe(3.5);
    expect(result.reportedAbsenceDays).toBe(0.5);
  });

  it('handles 100% weekend period', () => {
    const weekend = {
      start: new Date('2025-01-11'), // Saturday
      end: new Date('2025-01-12'),   // Sunday
    };
    const result = computeCapacity(35, weekend);
    expect(result.workingDays).toBe(0);
    expect(result.adjustedCapacityMinutes).toBe(0);
  });

  it('excludes holidays', () => {
    const result = computeCapacity(35, period, {
      holidays: [new Date('2025-01-08')], // Wednesday
    });
    expect(result.workingDays).toBe(4);
  });

  it('does not go below 0 days', () => {
    const result = computeCapacity(35, period, {
      absenceDays: 10,
      absenceSource: 'leave_table',
    });
    expect(result.adjustedCapacityMinutes).toBe(0);
  });
});
