/**
 * Forecast — Capacité future
 * Phase 6 Lot 1
 *
 * Calcule la capacité projetée par technicien pour un horizon donné.
 * Réutilise computeCapacity() du moteur historique pour la cohérence.
 */

import { computeCapacity } from '../engine/capacity';
import type { AbsenceSource } from '../engine/types';
import type {
  CapacityFutureInput,
  ForecastSnapshot,
  ForecastHorizon,
  ForecastConfidenceLevel,
  ForecastPenalty,
  ProjectedCapacity,
} from './types';
import { FORECAST_HORIZONS, horizonToDays } from './types';

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute future capacity for all technicians across all 3 horizons.
 * Convenience wrapper that calls computeFutureCapacityForHorizon for each.
 */
export function computeFutureCapacityAllHorizons(
  technicians: CapacityFutureInput['technicians'],
  absences: CapacityFutureInput['absences'],
  config: CapacityFutureInput['config'],
  referenceDate?: Date
): ForecastSnapshot[] {
  const ref = referenceDate ?? new Date();
  const snapshots: ForecastSnapshot[] = [];

  for (const horizon of FORECAST_HORIZONS) {
    const days = horizonToDays(horizon);
    const start = addDays(ref, 1);
    const end = addDays(ref, days);

    const input: CapacityFutureInput = {
      technicians,
      absences,
      config,
      period: { start, end },
      horizon,
    };

    snapshots.push(...computeFutureCapacity(input));
  }

  return snapshots;
}

/**
 * Compute future capacity for all technicians for a single horizon.
 */
export function computeFutureCapacity(input: CapacityFutureInput): ForecastSnapshot[] {
  const snapshots: ForecastSnapshot[] = [];

  for (const [techId, tech] of input.technicians) {
    const weeklyHours = tech.weeklyHours ?? input.config.defaultWeeklyHours;
    const weeklyHoursSource: 'contract' | 'default' = tech.weeklyHours != null ? 'contract' : 'default';

    // Get absence info for this technician
    const absenceInfo = input.absences.get(techId);
    const absenceSource: AbsenceSource = absenceInfo?.source ?? 'none';
    const absenceDays = absenceInfo?.days ?? 0;
    const absenceHours = absenceInfo?.hours;

    // Reuse the existing capacity engine
    const capacityResult = computeCapacity(weeklyHours, input.period, {
      holidays: input.config.holidays,
      absenceDays,
      absenceHours,
      absenceSource,
      deductPlanningUnavailability: input.config.deductPlanningUnavailability,
    });

    const absenceImpactMinutes = capacityResult.theoreticalMinutes - capacityResult.adjustedCapacityMinutes;

    const projectedCapacity: ProjectedCapacity = {
      theoreticalMinutes: capacityResult.theoreticalMinutes,
      adjustedCapacityMinutes: capacityResult.adjustedCapacityMinutes,
      availableMinutes: capacityResult.adjustedCapacityMinutes, // Lot 1: no workload deduction yet
      absenceImpactMinutes,
      workingDays: capacityResult.workingDays,
      absenceDays: capacityResult.absenceDays,
      horizon: input.horizon,
    };

    // Compute confidence
    const { score, level, penalties } = computeForecastConfidence(
      weeklyHoursSource,
      absenceSource,
      absenceInfo != null,
      input.horizon,
      input.config.holidays.length
    );

    snapshots.push({
      technicianId: techId,
      name: tech.name,
      horizon: input.horizon,
      projectedCapacity,
      weeklyHours,
      weeklyHoursSource,
      forecastConfidenceLevel: level,
      forecastConfidenceScore: score,
      forecastPenalties: penalties,
    });
  }

  return snapshots;
}

// ============================================================================
// CONFIDENCE
// ============================================================================

function computeForecastConfidence(
  weeklyHoursSource: 'contract' | 'default',
  absenceSource: AbsenceSource,
  hasAbsenceData: boolean,
  horizon: ForecastHorizon,
  holidayCount: number
): { score: number; level: ForecastConfidenceLevel; penalties: ForecastPenalty[] } {
  let score = 1.0;
  const penalties: ForecastPenalty[] = [];

  // No contract → default hours
  if (weeklyHoursSource === 'default') {
    const p: ForecastPenalty = {
      code: 'DEFAULT_WEEKLY_HOURS',
      reason: 'Durée hebdo non renseignée — valeur par défaut utilisée',
      value: 0.20,
    };
    penalties.push(p);
    score -= p.value;
  }

  // Absence reliability
  if (!hasAbsenceData) {
    const p: ForecastPenalty = {
      code: 'NO_RH_ABSENCES',
      reason: 'Aucune donnée d\'absence future',
      value: 0.10,
    };
    penalties.push(p);
    score -= p.value;
  } else if (absenceSource === 'planning_unavailability') {
    const p: ForecastPenalty = {
      code: 'PLANNING_ONLY_ABSENCES',
      reason: 'Absences issues du planning uniquement (fiabilité faible)',
      value: 0.15,
    };
    penalties.push(p);
    score -= p.value;
  }

  // Long horizon penalty
  if (horizon === '30d') {
    const p: ForecastPenalty = {
      code: 'LONG_HORIZON',
      reason: 'Horizon 30 jours : incertitude élevée',
      value: 0.10,
    };
    penalties.push(p);
    score -= p.value;
  } else if (horizon === '14d') {
    const p: ForecastPenalty = {
      code: 'LONG_HORIZON',
      reason: 'Horizon 14 jours : incertitude modérée',
      value: 0.05,
    };
    penalties.push(p);
    score -= p.value;
  }

  // No holidays configured
  if (holidayCount === 0) {
    const p: ForecastPenalty = {
      code: 'NO_HOLIDAYS_CONFIG',
      reason: 'Aucun jour férié configuré',
      value: 0.05,
    };
    penalties.push(p);
    score -= p.value;
  }

  score = Math.max(0, Math.round(score * 100) / 100);
  const level = scoreToLevel(score);

  return { score, level, penalties };
}

function scoreToLevel(score: number): ForecastConfidenceLevel {
  if (score >= 0.70) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}

// ============================================================================
// UTILS
// ============================================================================

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  r.setHours(0, 0, 0, 0);
  return r;
}
