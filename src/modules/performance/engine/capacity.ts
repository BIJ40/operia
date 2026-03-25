/**
 * Performance Terrain — Capacity computation
 * Calcul de la capacité en minutes sur jours ouvrés uniquement
 */

import type { AbsenceSource, CapacityResult } from './types';

interface CapacityOptions {
  holidays?: Date[];
  absenceDays?: number;
  absenceHours?: number; // if provided, takes priority over absenceDays for deduction
  absenceSource?: AbsenceSource;
  deductPlanningUnavailability?: boolean;
}

/**
 * Compute capacity for a technician over a period.
 * Only counts weekdays (Mon-Fri), excludes holidays.
 * Absences from planning_unavailability are NOT deducted unless config allows it.
 */
export function computeCapacity(
  weeklyHours: number,
  period: { start: Date; end: Date },
  options: CapacityOptions = {}
): CapacityResult {
  const {
    holidays = [],
    absenceDays = 0,
    absenceHours,
    absenceSource = 'none',
    deductPlanningUnavailability = false,
  } = options;

  // Build holiday set for fast lookup (YYYY-MM-DD)
  const holidaySet = new Set(
    holidays.map(d => toDateKey(d))
  );

  // Count working days (Mon-Fri, not holiday)
  let workingDays = 0;
  const current = new Date(period.start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(period.end);
  endDate.setHours(23, 59, 59, 999);

  while (current <= endDate) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6 && !holidaySet.has(toDateKey(current))) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  const dailyMinutes = (weeklyHours / 5) * 60;
  const theoreticalMinutes = Math.round(dailyMinutes * workingDays);

  // Determine effective absence deduction
  let effectiveAbsenceDays = 0;
  let absenceConfidence = 0;
  let absenceMinutesOverride: number | undefined;

  if (absenceSource === 'leave_table') {
    absenceConfidence = 1.0;
    if (absenceHours !== undefined) {
      // Use hours directly (supports half-days)
      absenceMinutesOverride = absenceHours * 60;
    } else {
      effectiveAbsenceDays = absenceDays;
    }
  } else if (absenceSource === 'planning_unavailability') {
    absenceConfidence = 0.3;
    // Only deduct if config allows it
    effectiveAbsenceDays = deductPlanningUnavailability ? absenceDays : 0;
  }
  // absenceSource === 'none' → no deduction, confidence = 0

  let adjustedCapacityMinutes: number;
  if (absenceMinutesOverride !== undefined) {
    adjustedCapacityMinutes = Math.max(0, theoreticalMinutes - Math.round(absenceMinutesOverride));
  } else {
    const adjustedWorkingDays = Math.max(0, workingDays - effectiveAbsenceDays);
    adjustedCapacityMinutes = Math.round(dailyMinutes * adjustedWorkingDays);
  }

  const capacityConfidence = weeklyHours !== 35 ? 1.0 : 0.5; // contract vs default

  return {
    workingDays,
    absenceDays: effectiveAbsenceDays,
    absenceSource,
    absenceConfidence,
    theoreticalMinutes,
    adjustedCapacityMinutes,
    capacityConfidence,
  };
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
