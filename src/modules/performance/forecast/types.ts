/**
 * Forecast — Types canoniques
 * Phase 6 Lot 1 + Lot 2 + Lot 3
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
  | 'PLANNING_ONLY_ABSENCES'
  // Lot 2 — load penalties
  | 'MAJORITY_ESTIMATED_DURATIONS'
  | 'NO_EXPLICIT_DURATIONS'
  | 'MAJORITY_PLANNING_ONLY'
  | 'AMBIGUOUS_MATCHING'
  // Lot 3 — probable penalties
  | 'LOW_PIPELINE_MATURITY'
  | 'HIGH_RISK_PROJECT'
  | 'UNCERTAIN_TECH_ASSIGNMENT'
  | 'LOW_DATA_QUALITY'
  | 'UNKNOWN_UNIVERSE';

// ============================================================================
// PROJECTED CAPACITY
// ============================================================================

export interface ProjectedCapacity {
  /** Capacité brute (jours ouvrés × heures contrat) */
  theoreticalMinutes: number;
  /** Capacité après déduction absences */
  adjustedCapacityMinutes: number;
  /** Capacité réellement disponible */
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
// LOT 3 — PROBABLE WORKLOAD SOURCES
// ============================================================================

export type ForecastProbableSource =
  | 'pipeline_mature'
  | 'travaux_a_planifier'
  | 'dossier_en_attente'
  | 'charge_travaux_engine'
  | 'unassigned_project';

export type ForecastProbabilityTier = 'high' | 'medium' | 'low';

export type ForecastProbableConfidenceLevel = 'high' | 'medium' | 'low';

// ============================================================================
// LOT 3 — PROBABLE WORK ITEM
// ============================================================================

export interface ForecastProbableItem {
  id: string;
  source: ForecastProbableSource;
  projectId?: string;
  label: string;
  universe?: string;
  estimatedMinutes: number;
  targetTechnicianIds: string[];
  maturityScore?: number;
  riskScore?: number;
  confidenceTier: ForecastProbabilityTier;
  dateWindow?: {
    start?: Date;
    end?: Date;
  };
}

// ============================================================================
// LOT 3 — PROBABLE WORKLOAD INPUT
// ============================================================================

export interface ProbableWorkloadInput {
  technicians: Map<string, {
    id: string;
    name: string;
    weeklyHours?: number;
    isKnown: boolean;
    skills?: string[];
  }>;
  period: {
    start: Date;
    end: Date;
  };
  probableSourceData: {
    pipelineMaturity?: {
      commercial: number;
      a_commander: number;
      pret_planification: number;
      planifie: number;
      bloque: number;
    };
    pipelineAging?: {
      bucket_0_7: number;
      bucket_8_15: number;
      bucket_16_30: number;
      bucket_30_plus: number;
      unknown: number;
    };
    riskProjects?: Array<{
      projectId: number | string;
      reference?: string;
      label?: string;
      riskScoreGlobal: number;
      riskFlux: number;
      riskData: number;
      riskValue: number;
      ageDays: number | null;
      devisHT: number;
      etatWorkflowLabel: string;
    }>;
    chargeByTechnician?: Array<{
      technicianId: string;
      hours: number;
      projects: number;
    }>;
    weeklyLoad?: Array<{
      weekLabel: string;
      weekStart: string;
      hours: number;
      projects: number;
    }>;
    dataQuality?: {
      score: number;
      withHours: number;
      withDevis: number;
      withUnivers: number;
      withPlannedDate: number;
      total: number;
      flags: Record<string, number>;
    };
    /** Raw projects from chargeTravauxEngine for detailed item building */
    parProjet?: Array<{
      projectId: number | string;
      label?: string;
      reference?: string;
      etatWorkflow: string;
      etatWorkflowLabel: string;
      universes: string[];
      totalHeuresRdv: number;
      totalHeuresTech: number;
      nbTechs: number;
      devisHT: number;
      ageDays: number | null;
      riskScoreGlobal: number;
      dataQualityFlags: string[];
      includedInChargeCalc: boolean;
      technicianIds: string[];
    }>;
  };
}

// ============================================================================
// LOT 3 — PROBABLE WORKLOAD PER TECHNICIAN
// ============================================================================

export interface ForecastProbableWorkload {
  technicianId: string;
  name: string;
  horizon: ForecastHorizon;
  probableMinutes: number;
  highProbabilityMinutes: number;
  mediumProbabilityMinutes: number;
  lowProbabilityMinutes: number;
  probableItemsCount: number;
  sourceBreakdown: Record<ForecastProbableSource, number>;
  universeBreakdown: Record<string, number>;
  probableConfidenceLevel: ForecastProbableConfidenceLevel;
  probablePenalties: ForecastPenalty[];
}

// ============================================================================
// LOT 3 — PROBABLE TEAM STATS
// ============================================================================

export interface ForecastProbableTeamStats {
  horizon: ForecastHorizon;
  totalProbableMinutes: number;
  highProbabilityMinutes: number;
  mediumProbabilityMinutes: number;
  lowProbabilityMinutes: number;
  averageProbableConfidenceLevel: ForecastProbableConfidenceLevel;
  universeBreakdown: Record<string, number>;
  /** V1 prudente: unassigned minutes kept as team-level bucket */
  unassignedTeamMinutes: number;
}

// ============================================================================
// FORECAST SNAPSHOT — résultat par technicien (enrichi Lot 2 + Lot 3)
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
  /** Lot 3 — Probable workload attached after merge */
  probableWorkload?: ForecastProbableWorkload;
  /** Lot 3 — Capacity remaining after committed + probable */
  projectedAvailableMinutesAfterProbable?: number;
  /** Lot 3 — Global load ratio: (committed + probable) / capacity (null if capacity=0) */
  projectedGlobalLoadRatio?: number | null;
}

// ============================================================================
// TEAM STATS (enrichi Lot 2 + Lot 3)
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
  /** Lot 3 — total probable minutes across team */
  totalProbableMinutes?: number;
  /** Lot 3 — total engaged + probable */
  totalEngagedPlusProbableMinutes?: number;
  /** Lot 3 — capacity remaining after committed + probable */
  totalAvailableAfterProbableMinutes?: number;
  /** Lot 3 — average global load ratio */
  averageGlobalLoadRatio?: number | null;
}

// ============================================================================
// TENSION (Lot 4 stub — types only)
// ============================================================================

export type PredictedTensionLevel = 'comfort' | 'watch' | 'tension' | 'critical';

// ============================================================================
// LOT 4 — TENSION FACTORS
// ============================================================================

export interface ForecastTensionFactor {
  code:
    | 'HIGH_COMMITTED_LOAD'
    | 'HIGH_GLOBAL_LOAD'
    | 'LOW_AVAILABLE_CAPACITY'
    | 'LOW_CONFIDENCE'
    | 'UNCERTAIN_ASSIGNMENT'
    | 'HIGH_PROBABLE_SHARE'
    | 'NO_CAPACITY';
  label: string;
  severity: 'info' | 'warning' | 'critical';
}

// ============================================================================
// LOT 4 — TENSION PER TECHNICIAN
// ============================================================================

export interface ForecastTensionSnapshot {
  technicianId: string;
  name: string;
  horizon: ForecastHorizon;
  committedLoadRatio: number | null;
  globalLoadRatio: number | null;
  availableAfterCommitted: number;
  availableAfterProbable: number;
  predictedTensionLevel: PredictedTensionLevel;
  confidenceLevel: ForecastConfidenceLevel;
  factors: ForecastTensionFactor[];
}

// ============================================================================
// LOT 4 — TEAM TENSION STATS
// ============================================================================

export interface ForecastTeamTensionStats {
  horizon: ForecastHorizon;
  predictedTensionLevel: PredictedTensionLevel;
  techniciansInComfort: number;
  techniciansInWatch: number;
  techniciansInTension: number;
  techniciansInCritical: number;
  averageGlobalLoadRatio: number | null;
  topFactors: ForecastTensionFactor[];
}

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
