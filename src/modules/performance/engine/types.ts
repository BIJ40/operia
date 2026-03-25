/**
 * Performance Terrain — Modèle canonique
 * Tous les types du moteur analytique
 */

// ============================================================================
// SOURCES & ENUMS
// ============================================================================

export type DurationSource = 'explicit' | 'computed' | 'planning' | 'business_default' | 'unknown';

export type AbsenceSource = 'leave_table' | 'planning_unavailability' | 'none';

export type MatchOutcome = 'merged' | 'kept_separate' | 'discarded_as_duplicate';

export type UnknownTechnicianPolicy = 'ignore' | 'group_under_unknown' | 'team_only';

export type WorkItemCategory = 'productive' | 'non_productive' | 'sav' | 'other';

export type ProductivityZone = 'critical' | 'warning' | 'optimal';
export type SavZone = 'optimal' | 'warning' | 'critical';
export type LoadZone = 'underload' | 'balanced' | 'overload';
export type TensionLevel = 'comfort' | 'optimization' | 'tension';

// ============================================================================
// WORK ITEM — unité de travail unifiée
// ============================================================================

export interface WorkItem {
  id: string;
  source: 'intervention' | 'visite' | 'planning';
  start: Date;
  end: Date;
  durationMinutes: number;
  durationSource: DurationSource;
  technicians: string[];
  category: WorkItemCategory;
  interventionId?: string;
  projectId?: string;
  type?: string;
  type2?: string;
  isSav: boolean;
}

// ============================================================================
// CAPACITY
// ============================================================================

export interface CapacityResult {
  workingDays: number;
  absenceDays: number;
  absenceSource: AbsenceSource;
  absenceConfidence: number; // 1.0 = leave_table, 0.3 = planning_unavailability, 0 = none
  theoreticalMinutes: number;
  adjustedCapacityMinutes: number;
  capacityConfidence: number; // 1.0 = contract, 0.5 = default
}

// ============================================================================
// CONFIDENCE
// ============================================================================

export interface ConfidenceBreakdown {
  durationConfidence: number;       // % items with explicit/computed duration
  capacityConfidence: number;       // 1.0 if contract, 0.5 if default
  matchingConfidence: number;       // % items without matching ambiguity
  classificationConfidence: number; // % items classified without fallback
  globalConfidenceScore: number;    // weighted sum
}

// ============================================================================
// DATA QUALITY FLAGS
// ============================================================================

export interface DataQualityFlags {
  missingContract: boolean;
  missingExplicitDurations: boolean;
  missingPlanningCoverage: boolean;
  missingAbsenceData: boolean;
  highFallbackUsage: boolean;
  duplicateResolutionApplied: boolean;
  partialPeriodCoverage: boolean;
}

// ============================================================================
// CALCULATION TRACE
// ============================================================================

export type CalculationWarningCode =
  | 'MISSING_CONTRACT'
  | 'MISSING_ABSENCE_DATA'
  | 'HIGH_FALLBACK_USAGE'
  | 'AMBIGUOUS_MATCHING'
  | 'ZERO_WORKING_DAYS'
  | 'NO_ACTIVITY'
  | 'UNKNOWN_TECHNICIAN'
  | 'ABERRANT_DURATION'
  | 'PARTIAL_PERIOD';

export interface CalculationTrace {
  technicianId: string;
  capacityTrace: {
    workingDays: number;
    absenceDays: number;
    absenceSource: AbsenceSource;
    weeklyHours: number;
    weeklyHoursSource: 'contract' | 'default';
  };
  durationTrace: {
    itemCountBySource: Record<string, number>;
    minutesBySource: Record<string, number>;
    totalMinutes: number;
  };
  allocationTrace: {
    sharedSlots: number;
    totalAllocatedMinutes: number;
    method: 'equal_split';
  };
  consolidationTrace: {
    merged: number;
    keptSeparate: number;
    discarded: number;
  };
  warnings: CalculationWarningCode[];
}

// ============================================================================
// TECHNICIAN SNAPSHOT — résultat final par technicien
// ============================================================================

export interface TechnicianSnapshot {
  technicianId: string;
  name: string;
  color?: string;

  // Capacity
  capacity: CapacityResult;
  weeklyHours: number;
  weeklyHoursSource: 'contract' | 'default';

  // Workload (minutes)
  workload: {
    productive: number;
    nonProductive: number;
    sav: number;
    other: number;
    total: number;
  };

  // Ratios
  loadRatio: number | null; // null if capacity = 0
  productivityRatio: number;
  savRate: number;

  // Counts
  interventionsCount: number;
  savCount: number;
  dossiersCount: number;

  // CA
  caGenerated: number | null;
  caAvailability: 'available' | 'not_available' | 'excluded';

  // Zones
  productivityZone: ProductivityZone;
  savZone: SavZone;
  loadZone: LoadZone;
  tensionLevel: TensionLevel;

  // Absence
  isAbsent: boolean;
  absenceLabel?: string;

  // Quality
  confidenceBreakdown: ConfidenceBreakdown;
  dataQualityFlags: DataQualityFlags;
  calculationTrace: CalculationTrace;
}

// ============================================================================
// PERFORMANCE CONFIG (from agency_performance_config or defaults)
// ============================================================================

export interface PerformanceConfig {
  productivityOptimal: number;
  productivityWarning: number;
  loadMin: number;
  loadMax: number;
  savOptimal: number;
  savWarning: number;
  defaultWeeklyHours: number;
  defaultTaskDurationMinutes: number;
  deductPlanningUnavailability: boolean;
  holidays: Date[];
}

// ============================================================================
// ENGINE INPUT/OUTPUT
// ============================================================================

export interface TechnicianInput {
  id: string;
  name: string;
  color?: string;
  weeklyHours?: number; // from contract; undefined = use default
  isKnown: boolean; // false if not in collaborators
}

export interface AbsenceInfo {
  technicianId: string;
  source: AbsenceSource;
  label: string;
  days: number;
}

export interface MatchLogEntry {
  aId: string;
  bId: string;
  outcome: MatchOutcome;
  score: number;
}

export interface PerformanceEngineInput {
  workItems: WorkItem[];
  technicians: Map<string, TechnicianInput>;
  absences: Map<string, AbsenceInfo>;
  config: PerformanceConfig;
  period: { start: Date; end: Date };
  matchLog?: MatchLogEntry[];
}

export interface PerformanceEngineOutput {
  snapshots: TechnicianSnapshot[];
  teamStats: {
    avgProductivityRate: number;
    avgLoadRatio: number;
    totalSavCount: number;
    totalInterventions: number;
  };
  unknownTechnicianWorkload: number; // minutes from unknown techs (team_only policy)
  matchLog: Array<{ a: string; b: string; outcome: MatchOutcome; score: number }>;
}

// ============================================================================
// LEGACY COMPAT — TechnicianPerformance alias
// ============================================================================

export interface TechnicianPerformance {
  id: string;
  name: string;
  color?: string;
  timeTotal: number;
  timeProductive: number;
  timeNonProductive: number;
  productivityRate: number;
  productivityZone: ProductivityZone;
  interventionsCount: number;
  savCount: number;
  savRate: number;
  savZone: SavZone;
  capacityMinutes: number;
  loadRatio: number;
  loadZone: LoadZone;
  weeklyHours: number;
  weeklyHoursSource: 'contract' | 'default';
  isAbsent: boolean;
  absenceLabel?: string;
  caGenerated: number;
  dossiersCount: number;
  // V2 extensions
  confidenceBreakdown?: ConfidenceBreakdown;
  dataQualityFlags?: DataQualityFlags;
  calculationTrace?: CalculationTrace;
  tensionLevel?: TensionLevel;
}

/** Convert snapshot to legacy format */
export function snapshotToLegacy(s: TechnicianSnapshot): TechnicianPerformance {
  return {
    id: s.technicianId,
    name: s.name,
    color: s.color,
    timeTotal: s.workload.total,
    timeProductive: s.workload.productive,
    timeNonProductive: s.workload.nonProductive + s.workload.other,
    productivityRate: s.productivityRatio,
    productivityZone: s.productivityZone,
    interventionsCount: s.interventionsCount,
    savCount: s.savCount,
    savRate: s.savRate,
    savZone: s.savZone,
    capacityMinutes: s.capacity.adjustedCapacityMinutes,
    loadRatio: s.loadRatio ?? 0,
    loadZone: s.loadZone,
    weeklyHours: s.weeklyHours,
    weeklyHoursSource: s.weeklyHoursSource,
    isAbsent: s.isAbsent,
    absenceLabel: s.absenceLabel,
    caGenerated: s.caGenerated ?? 0,
    dossiersCount: s.dossiersCount,
    confidenceBreakdown: s.confidenceBreakdown,
    dataQualityFlags: s.dataQualityFlags,
    calculationTrace: s.calculationTrace,
    tensionLevel: s.tensionLevel,
  };
}
