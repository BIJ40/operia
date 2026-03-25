/**
 * Forecast — Types canoniques
 * Phase 6 Lot 1 + Lot 2
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
// CONFIDENCE FORECAST (capacity)
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
// LOT 2 — WORK SOURCES & CATEGORIES
// ============================================================================

export type ForecastWorkSource = 'planning' | 'visite' | 'intervention';

export type ForecastWorkCategory = 'productive' | 'non_productive' | 'sav' | 'other';

export type ForecastLoadConfidenceLevel = 'high' | 'medium' | 'low';

// ============================================================================
// LOT 2 — FORECAST WORK ITEM (unified future work unit)
// ============================================================================

export interface ForecastWorkItem {
  id: string;
  source: ForecastWorkSource;
  start: Date;
  end: Date;
  durationMinutes: number;
  durationSource: 'explicit' | 'computed' | 'planning' | 'business_default' | 'unknown';
  technicians: string[];
  category: ForecastWorkCategory;
  interventionId?: string;
  projectId?: string;
  type?: string;
  type2?: string;
  isSav: boolean;
}

// ============================================================================
// LOT 2 — COMMITTED WORKLOAD INPUT
// ============================================================================

export interface CommittedWorkloadInput {
  interventions: Record<string, unknown>[];
  creneaux: Record<string, unknown>[];
  projectsById: Map<string, Record<string, unknown>>;
  technicians: Map<string, {
    id: string;
    name: string;
    weeklyHours?: number;
    isKnown: boolean;
  }>;
  period: {
    start: Date;
    end: Date;
  };
  defaultTaskDurationMinutes: number;
}

// ============================================================================
// LOT 2 — CONSOLIDATION TRACE
// ============================================================================

export interface ForecastConsolidationTrace {
  merged: number;
  keptSeparate: number;
  discarded: number;
  ambiguous: number;
}

// ============================================================================
// LOT 2 — COMMITTED WORKLOAD PER TECHNICIAN
// ============================================================================

export interface ForecastCommittedWorkload {
  technicianId: string;
  name: string;
  horizon: ForecastHorizon;
  committedMinutes: number;
  committedProductiveMinutes: number;
  committedNonProductiveMinutes: number;
  committedSavMinutes: number;
  committedOtherMinutes: number;
  interventionsCount: number;
  dossiersCount: number;
  sharedSlots: number;
  loadConfidenceLevel: ForecastLoadConfidenceLevel;
  loadPenalties: ForecastPenalty[];
  sourceBreakdown: {
    planning: number;
    visite: number;
    intervention: number;
  };
  durationSourceBreakdown: {
    explicit: number;
    computed: number;
    planning: number;
    business_default: number;
    unknown: number;
  };
  consolidationTrace: ForecastConsolidationTrace;
}

// ============================================================================
// LOT 2 — COMMITTED TEAM STATS
// ============================================================================

export interface ForecastCommittedTeamStats {
  horizon: ForecastHorizon;
  totalCommittedMinutes: number;
  productiveMinutes: number;
  nonProductiveMinutes: number;
  savMinutes: number;
  otherMinutes: number;
  totalInterventions: number;
  totalDossiers: number;
  averageLoadConfidenceLevel: ForecastLoadConfidenceLevel;
}

// ============================================================================
// FORECAST SNAPSHOT — résultat par technicien (enrichi Lot 2)
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
  /** Lot 2 — Committed workload attached after merge */
  committedWorkload?: ForecastCommittedWorkload;
  /** Lot 2 — Capacity remaining after committed workload */
  projectedAvailableMinutesAfterCommitted?: number;
  /** Lot 2 — Committed load ratio (null if capacity=0) */
  projectedCommittedLoadRatio?: number | null;
}

// ============================================================================
// TEAM STATS (enrichi Lot 2)
// ============================================================================

export interface ForecastTeamStats {
  horizon: ForecastHorizon;
  totalTheoreticalMinutes: number;
  totalAdjustedMinutes: number;
  totalAvailableMinutes: number;
  totalAbsenceImpactMinutes: number;
  technicianCount: number;
  averageConfidenceLevel: ForecastConfidenceLevel;
  /** Lot 2 — total committed minutes across team */
  totalCommittedMinutes?: number;
  /** Lot 2 — capacity remaining after committed work */
  totalAvailableAfterCommittedMinutes?: number;
  /** Lot 2 — average committed load ratio */
  averageCommittedLoadRatio?: number | null;
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
// INPUT (Lot 1)
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
