/**
 * Forecast — Types canoniques
 * Phase 6 Lot 1 — Séparé du moteur historique
 *
 * Aucun type forecast ne réutilise directement TechnicianSnapshot.
 */

// ============================================================================
// HORIZONS
// ============================================================================

export type ForecastHorizon = '7d' | '14d' | '30d';

export const FORECAST_HORIZONS: ForecastHorizon[] = ['7d', '14d', '30d'];

export function horizonToDays(h: ForecastHorizon): number {
  switch (h) {
    case '7d': return 7;
    case '14d': return 14;
    case '30d': return 30;
  }
}

// ============================================================================
// CONFIDENCE FORECAST
// ============================================================================

export type ForecastConfidenceLevel = 'high' | 'medium' | 'low';

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
// PROJECTED CAPACITY
// ============================================================================

export interface ProjectedCapacity {
  /** Capacité brute (jours ouvrés × heures contrat) */
  theoreticalMinutes: number;
  /** Capacité après déduction absences */
  adjustedCapacityMinutes: number;
  /** Capacité réellement disponible (= adjustedCapacityMinutes pour Lot 1, charge déduite au Lot 3) */
  availableMinutes: number;
  /** Minutes perdues aux absences */
  absenceImpactMinutes: number;
  /** Jours ouvrés dans l'horizon */
  workingDays: number;
  /** Jours d'absence comptés */
  absenceDays: number;
  horizon: ForecastHorizon;
}

// ============================================================================
// FORECAST SNAPSHOT — résultat par technicien
// ============================================================================

export interface ForecastSnapshot {
  technicianId: string;
  name: string;
  horizon: ForecastHorizon;
  projectedCapacity: ProjectedCapacity;
  weeklyHours: number;
  weeklyHoursSource: 'contract' | 'default';
  forecastConfidenceLevel: ForecastConfidenceLevel;
  forecastConfidenceScore: number;
  forecastPenalties: ForecastPenalty[];
}

// ============================================================================
// TEAM STATS
// ============================================================================

export interface ForecastTeamStats {
  horizon: ForecastHorizon;
  totalTheoreticalMinutes: number;
  totalAdjustedMinutes: number;
  totalAvailableMinutes: number;
  totalAbsenceImpactMinutes: number;
  technicianCount: number;
  averageConfidenceLevel: ForecastConfidenceLevel;
}

// ============================================================================
// TENSION (Lot 4 stub — types only)
// ============================================================================

export type PredictedTensionLevel = 'comfort' | 'watch' | 'tension' | 'critical';

// ============================================================================
// RECOMMENDATION (Lot 5 stub — types only)
// ============================================================================

export interface ForecastRecommendation {
  level: 'info' | 'warning' | 'critical';
  message: string;
  technicianId?: string;
  horizon?: ForecastHorizon;
}

// ============================================================================
// INPUT
// ============================================================================

export interface CapacityFutureInput {
  technicians: Map<string, {
    id: string;
    name: string;
    weeklyHours?: number;
    isKnown: boolean;
  }>;
  absences: Map<string, {
    technicianId: string;
    source: 'leave_table' | 'planning_unavailability' | 'none';
    label: string;
    days?: number;
    hours?: number;
  }>;
  config: {
    defaultWeeklyHours: number;
    holidays: Date[];
    deductPlanningUnavailability: boolean;
  };
  /** The future period to project over. start = tomorrow, end = start + horizon */
  period: {
    start: Date;
    end: Date;
  };
  horizon: ForecastHorizon;
}
