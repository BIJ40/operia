/**
 * Forecast — Types canoniques
 * Phase 6 Lot 1 — Séparé du moteur historique
 */

// ============================================================================
// HORIZONS
// ============================================================================

export type ForecastHorizon = 'J+7' | 'J+14' | 'J+30';

export const FORECAST_HORIZONS: ForecastHorizon[] = ['J+7', 'J+14', 'J+30'];

export function horizonToDays(h: ForecastHorizon): number {
  switch (h) {
    case 'J+7': return 7;
    case 'J+14': return 14;
    case 'J+30': return 30;
  }
}

// ============================================================================
// CONFIDENCE FORECAST
// ============================================================================

export type ForecastConfidenceLevel = 'high' | 'medium' | 'low' | 'speculative';

export interface ForecastPenalty {
  code: ForecastPenaltyCode;
  reason: string;
  /** Impact on confidence score (0–1, subtracted) */
  value: number;
}

export type ForecastPenaltyCode =
  | 'NO_CONTRACT'
  | 'DEFAULT_WEEKLY_HOURS'
  | 'NO_RH_ABSENCES'
  | 'PARTIAL_ABSENCE_DATA'
  | 'LONG_HORIZON'
  | 'NO_HOLIDAYS_CONFIG'
  | 'PLANNING_ONLY_ABSENCES';

// ============================================================================
// CAPACITY FORECAST
// ============================================================================

export interface ForecastCapacitySnapshot {
  technicianId: string;
  horizon: ForecastHorizon;

  /** Capacity théorique (jours ouvrés × heures contrat), en minutes */
  projectedCapacityMinutes: number;

  /** Capacity après déduction absences connues, en minutes */
  projectedAvailableMinutes: number;

  /** Minutes perdues à cause des absences futures connues */
  absenceImpactMinutes: number;

  /** Jours ouvrés dans l'horizon */
  workingDays: number;

  /** Jours d'absence future connus */
  absenceDays: number;

  /** Source des heures hebdo */
  weeklyHoursSource: 'contract' | 'default';
  weeklyHours: number;

  /** Confiance du forecast */
  forecastConfidenceLevel: ForecastConfidenceLevel;
  forecastConfidenceScore: number;
  forecastPenalties: ForecastPenalty[];
}

// ============================================================================
// TENSION (Lot 4 placeholder — types only)
// ============================================================================

export type PredictedTensionLevel = 'comfort' | 'watch' | 'tension' | 'critical';

// ============================================================================
// RECOMMENDATION (Lot 5 placeholder — types only)
// ============================================================================

export interface Recommendation {
  type: 'individual' | 'team' | 'business';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  technicianId?: string;
  horizon: ForecastHorizon;
}

// ============================================================================
// FORECAST INPUT / OUTPUT
// ============================================================================

export interface ForecastTechnicianInput {
  id: string;
  name: string;
  weeklyHours?: number;       // from contract; undefined = default 35h
  /** Known future absences: array of { date, hours } */
  futureAbsences: FutureAbsenceEntry[];
}

export interface FutureAbsenceEntry {
  date: Date;
  hours: number;
  type: string;
  source: 'rh' | 'planning';
}

export interface ForecastInput {
  technicians: ForecastTechnicianInput[];
  holidays: Date[];
  defaultWeeklyHours: number;
  referenceDate?: Date; // defaults to today
}

export interface ForecastOutput {
  snapshots: ForecastCapacitySnapshot[];
  generatedAt: Date;
  referenceDate: Date;
}
