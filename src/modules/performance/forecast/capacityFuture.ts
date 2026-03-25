/**
 * Forecast — Capacité future
 * Phase 6 Lot 1
 *
 * Calcule la capacité projetée par technicien et par horizon (J+7, J+14, J+30).
 * Réutilise la logique jours ouvrés de capacity.ts sans toucher au moteur historique.
 */

import type {
  ForecastInput,
  ForecastOutput,
  ForecastCapacitySnapshot,
  ForecastHorizon,
  ForecastConfidenceLevel,
  ForecastPenalty,
  ForecastTechnicianInput,
} from './types';
import { FORECAST_HORIZONS, horizonToDays } from './types';

// ============================================================================
// PUBLIC API
// ============================================================================

export function computeForecastCapacity(input: ForecastInput): ForecastOutput {
  const referenceDate = input.referenceDate ?? new Date();
  const snapshots: ForecastCapacitySnapshot[] = [];

  for (const tech of input.technicians) {
    for (const horizon of FORECAST_HORIZONS) {
      snapshots.push(
        computeOneTechHorizon(tech, horizon, referenceDate, input)
      );
    }
  }

  return {
    snapshots,
    generatedAt: new Date(),
    referenceDate,
  };
}

// ============================================================================
// INTERNAL
// ============================================================================

function computeOneTechHorizon(
  tech: ForecastTechnicianInput,
  horizon: ForecastHorizon,
  referenceDate: Date,
  input: ForecastInput
): ForecastCapacitySnapshot {
  const days = horizonToDays(horizon);
  const periodStart = addDays(referenceDate, 1); // tomorrow
  const periodEnd = addDays(referenceDate, days);

  const weeklyHours = tech.weeklyHours ?? input.defaultWeeklyHours;
  const weeklyHoursSource: 'contract' | 'default' = tech.weeklyHours != null ? 'contract' : 'default';
  const dailyMinutes = (weeklyHours / 5) * 60;

  // Holiday set
  const holidaySet = new Set(input.holidays.map(d => toDateKey(d)));

  // Count working days
  let workingDays = 0;
  const cur = new Date(periodStart);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6 && !holidaySet.has(toDateKey(cur))) {
      workingDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  const projectedCapacityMinutes = Math.round(dailyMinutes * workingDays);

  // Absence impact: only count absences within the horizon period
  let absenceMinutes = 0;
  let absenceDays = 0;
  let hasRhAbsences = false;
  let hasPlanningOnlyAbsences = false;

  for (const abs of tech.futureAbsences) {
    const absDate = new Date(abs.date);
    absDate.setHours(0, 0, 0, 0);
    if (absDate >= periodStart && absDate <= periodEnd) {
      // Check it's a working day
      const dow = absDate.getDay();
      if (dow !== 0 && dow !== 6 && !holidaySet.has(toDateKey(absDate))) {
        absenceMinutes += abs.hours * 60;
        absenceDays++;
        if (abs.source === 'rh') hasRhAbsences = true;
        if (abs.source === 'planning') hasPlanningOnlyAbsences = true;
      }
    }
  }

  const absenceImpactMinutes = Math.round(absenceMinutes);
  const projectedAvailableMinutes = Math.max(0, projectedCapacityMinutes - absenceImpactMinutes);

  // Confidence
  const { score, level, penalties } = computeForecastConfidence(
    tech, horizon, weeklyHoursSource, hasRhAbsences, hasPlanningOnlyAbsences, input.holidays.length
  );

  return {
    technicianId: tech.id,
    horizon,
    projectedCapacityMinutes,
    projectedAvailableMinutes,
    absenceImpactMinutes,
    workingDays,
    absenceDays,
    weeklyHoursSource,
    weeklyHours,
    forecastConfidenceLevel: level,
    forecastConfidenceScore: score,
    forecastPenalties: penalties,
  };
}

// ============================================================================
// CONFIDENCE
// ============================================================================

function computeForecastConfidence(
  tech: ForecastTechnicianInput,
  horizon: ForecastHorizon,
  weeklyHoursSource: 'contract' | 'default',
  hasRhAbsences: boolean,
  hasPlanningOnlyAbsences: boolean,
  holidayCount: number
): { score: number; level: ForecastConfidenceLevel; penalties: ForecastPenalty[] } {
  let score = 1.0;
  const penalties: ForecastPenalty[] = [];

  // No contract → default hours
  if (weeklyHoursSource === 'default') {
    const p: ForecastPenalty = { code: 'DEFAULT_WEEKLY_HOURS', reason: 'Heures hebdo par défaut (pas de contrat)', value: 0.20 };
    penalties.push(p);
    score -= p.value;
  }

  // No absences data at all
  if (tech.futureAbsences.length === 0 && !hasRhAbsences) {
    const p: ForecastPenalty = { code: 'NO_RH_ABSENCES', reason: 'Aucune absence RH future connue', value: 0.15 };
    penalties.push(p);
    score -= p.value;
  }

  // Only planning-based absences (low reliability)
  if (hasPlanningOnlyAbsences && !hasRhAbsences) {
    const p: ForecastPenalty = { code: 'PLANNING_ONLY_ABSENCES', reason: 'Absences uniquement issues du planning (fiabilité faible)', value: 0.15 };
    penalties.push(p);
    score -= p.value;
  }

  // Long horizon penalty
  if (horizon === 'J+30') {
    const p: ForecastPenalty = { code: 'LONG_HORIZON', reason: 'Horizon J+30 : projection à 1 mois, incertitude élevée', value: 0.10 };
    penalties.push(p);
    score -= p.value;
  } else if (horizon === 'J+14') {
    const p: ForecastPenalty = { code: 'LONG_HORIZON', reason: 'Horizon J+14 : incertitude modérée', value: 0.05 };
    penalties.push(p);
    score -= p.value;
  }

  // No holidays configured
  if (holidayCount === 0) {
    const p: ForecastPenalty = { code: 'NO_HOLIDAYS_CONFIG', reason: 'Aucun jour férié configuré', value: 0.05 };
    penalties.push(p);
    score -= p.value;
  }

  score = Math.max(0, Math.round(score * 100) / 100);

  const level = scoreToLevel(score);

  return { score, level, penalties };
}

function scoreToLevel(score: number): ForecastConfidenceLevel {
  if (score >= 0.75) return 'high';
  if (score >= 0.50) return 'medium';
  if (score >= 0.25) return 'low';
  return 'speculative';
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

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
