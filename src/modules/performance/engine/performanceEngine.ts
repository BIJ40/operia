/**
 * Performance Terrain — Engine orchestrator
 * Pure function: data in → TechnicianSnapshot[] out
 */

import type {
  PerformanceEngineInput,
  PerformanceEngineOutput,
  TechnicianSnapshot,
  CalculationTrace,
  CalculationWarningCode,
  DataQualityFlags,
  WorkItem,
  DurationSource,
  MatchLogEntry,
} from './types';
import { MATCHING_THRESHOLDS } from './rules';
import { computeCapacity } from './capacity';
import { allocateDuration } from './allocation';
import { computeConfidenceBreakdown } from './confidence';
import { getProductivityZone, getSavZone, getLoadZone, getTensionLevel } from './zones';
import { UNKNOWN_TECHNICIAN_POLICY } from './rules';

/**
 * Main engine: compute all technician snapshots from unified work items.
 */
export function computeTechnicianSnapshots(input: PerformanceEngineInput): PerformanceEngineOutput {
  const { workItems, technicians, absences, config, period, matchLog = [] } = input;

  // Build item→technicians index for matchLog attribution
  const itemTechIndex = new Map<string, string[]>();
  for (const item of workItems) {
    itemTechIndex.set(item.id, item.technicians);
  }

  // Pre-compute per-tech consolidation traces from matchLog
  const techConsolidation = new Map<string, { merged: number; keptSeparate: number; discarded: number }>();
  const techAmbiguousCount = new Map<string, number>();

  for (const entry of matchLog) {
    // Find technicians involved in this match
    const techsA = itemTechIndex.get(entry.aId) || [];
    const techsB = itemTechIndex.get(entry.bId) || [];
    const involvedTechs = new Set([...techsA, ...techsB]);

    // Is this match ambiguous? Score in grey zone: > 0.3 but below merge threshold
    const isAmbiguous = entry.score > 0.3 && entry.score < MATCHING_THRESHOLDS.mergeMinScore;

    for (const techId of involvedTechs) {
      // Consolidation trace
      if (!techConsolidation.has(techId)) {
        techConsolidation.set(techId, { merged: 0, keptSeparate: 0, discarded: 0 });
      }
      const tc = techConsolidation.get(techId)!;
      switch (entry.outcome) {
        case 'merged': tc.merged++; break;
        case 'kept_separate': tc.keptSeparate++; break;
        case 'discarded_as_duplicate': tc.discarded++; break;
      }

      // Ambiguous count
      if (isAmbiguous) {
        techAmbiguousCount.set(techId, (techAmbiguousCount.get(techId) || 0) + 1);
      }
    }
  }

  // Aggregate per technician
  const techAgg = new Map<string, {
    productive: number;
    nonProductive: number;
    sav: number;
    other: number;
    interventionIds: Set<string>;
    savInterventionIds: Set<string>;
    projectIds: Set<string>;
    items: WorkItem[];
    sharedSlots: number;
  }>();

  let unknownWorkload = 0;
  let totalClassificationFallback = 0;

  // Initialize all known technicians
  for (const [id] of technicians) {
    techAgg.set(id, {
      productive: 0, nonProductive: 0, sav: 0, other: 0,
      interventionIds: new Set(), savInterventionIds: new Set(), projectIds: new Set(),
      items: [], sharedSlots: 0,
    });
  }

  // Allocate each work item
  for (const item of workItems) {
    // Count classification fallbacks
    if (item.category === 'other') totalClassificationFallback++;

    const allocation = allocateDuration(item.durationMinutes, item.technicians);
    const isShared = item.technicians.length > 1;

    for (const [techId, minutes] of allocation.allocations) {
      const isKnown = technicians.has(techId);

      if (!isKnown) {
        // Unknown technician policy: team_only
        if (UNKNOWN_TECHNICIAN_POLICY === 'team_only') {
          unknownWorkload += minutes;
          continue;
        } else if (UNKNOWN_TECHNICIAN_POLICY === 'ignore') {
          continue;
        }
      }

      if (!techAgg.has(techId)) {
        techAgg.set(techId, {
          productive: 0, nonProductive: 0, sav: 0, other: 0,
          interventionIds: new Set(), savInterventionIds: new Set(), projectIds: new Set(),
          items: [], sharedSlots: 0,
        });
      }

      const agg = techAgg.get(techId)!;
      agg.items.push(item);
      if (isShared) agg.sharedSlots++;

      switch (item.category) {
        case 'productive': agg.productive += minutes; break;
        case 'non_productive': agg.nonProductive += minutes; break;
        case 'sav': agg.sav += minutes; break;
        default: agg.other += minutes; break;
      }

      if (item.interventionId) agg.interventionIds.add(item.interventionId);
      if (item.isSav && item.interventionId) agg.savInterventionIds.add(item.interventionId);
      if (item.projectId) agg.projectIds.add(item.projectId);
    }
  }

  // Build snapshots
  const snapshots: TechnicianSnapshot[] = [];
  let totalProductivity = 0;
  let totalLoad = 0;
  let activeTechCount = 0;
  let totalSav = 0;
  let totalInterventions = 0;

  for (const [techId, agg] of techAgg) {
    const techInput = technicians.get(techId);
    if (!techInput) continue; // unknown tech, already handled

    const weeklyHours = techInput.weeklyHours || config.defaultWeeklyHours;
    const weeklyHoursSource: 'contract' | 'default' = techInput.weeklyHours ? 'contract' : 'default';

    const absenceInfo = absences.get(techId);
    const isAbsent = !!absenceInfo;

    const capacity = computeCapacity(weeklyHours, period, {
      holidays: config.holidays,
      absenceDays: absenceInfo?.days || 0,
      absenceSource: absenceInfo?.source || 'none',
      deductPlanningUnavailability: config.deductPlanningUnavailability,
    });

    const total = agg.productive + agg.nonProductive + agg.sav + agg.other;
    const productivityRatio = total > 0 ? agg.productive / total : 0;

    // Load ratio: null if capacity is 0 (ZERO_WORKING_DAYS constraint)
    const loadRatio = capacity.adjustedCapacityMinutes > 0
      ? total / capacity.adjustedCapacityMinutes
      : null;

    const interventionsCount = agg.interventionIds.size;
    const savCount = agg.savInterventionIds.size;
    const savRate = interventionsCount > 0 ? savCount / interventionsCount : 0;

    // Build warnings
    const warnings: CalculationWarningCode[] = [];
    if (weeklyHoursSource === 'default') warnings.push('MISSING_CONTRACT');
    if (!absenceInfo || absenceInfo.source === 'none') warnings.push('MISSING_ABSENCE_DATA');
    if (capacity.adjustedCapacityMinutes === 0) warnings.push('ZERO_WORKING_DAYS');
    if (total === 0) warnings.push('NO_ACTIVITY');

    // Count duration sources
    const itemCountBySource: Record<string, number> = {};
    const minutesBySource: Record<string, number> = {};
    let fallbackCount = 0;

    for (const item of agg.items) {
      const src = item.durationSource;
      itemCountBySource[src] = (itemCountBySource[src] || 0) + 1;
      minutesBySource[src] = (minutesBySource[src] || 0) + item.durationMinutes;
      if (src === 'business_default' || src === 'unknown') fallbackCount++;
    }

    const highFallback = agg.items.length > 0 && fallbackCount / agg.items.length > 0.5;
    if (highFallback) warnings.push('HIGH_FALLBACK_USAGE');

    // Data quality flags
    const techConsol = techConsolidation.get(techId) || { merged: 0, keptSeparate: 0, discarded: 0 };
    const techAmbiguous = techAmbiguousCount.get(techId) || 0;

    if (techAmbiguous > 0) warnings.push('AMBIGUOUS_MATCHING');

    const dataQualityFlags: DataQualityFlags = {
      missingContract: weeklyHoursSource === 'default',
      missingExplicitDurations: (itemCountBySource['explicit'] || 0) === 0 && agg.items.length > 0,
      missingPlanningCoverage: agg.items.length === 0,
      missingAbsenceData: !absenceInfo || absenceInfo.source === 'none',
      highFallbackUsage: highFallback,
      duplicateResolutionApplied: techConsol.merged > 0,
      partialPeriodCoverage: false,
    };

    // Confidence
    const classificationFallbackForTech = agg.items.filter(i => i.category === 'other').length;
    const confidenceBreakdown = computeConfidenceBreakdown({
      workItems: agg.items,
      capacityConfidence: capacity.capacityConfidence,
      matchAmbiguousCount: techAmbiguous,
      matchTotalCount: agg.items.length,
      classificationFallbackCount: classificationFallbackForTech,
      classificationTotalCount: agg.items.length,
    });

    // Trace
    const calculationTrace: CalculationTrace = {
      technicianId: techId,
      capacityTrace: {
        workingDays: capacity.workingDays,
        absenceDays: capacity.absenceDays,
        absenceSource: capacity.absenceSource,
        weeklyHours,
        weeklyHoursSource,
      },
      durationTrace: {
        itemCountBySource,
        minutesBySource,
        totalMinutes: total,
      },
      allocationTrace: {
        sharedSlots: agg.sharedSlots,
        totalAllocatedMinutes: total,
        method: 'equal_split',
      },
      consolidationTrace: {
        merged: 0, keptSeparate: 0, discarded: 0, // populated from matchLog
      },
      warnings,
    };

    const snapshot: TechnicianSnapshot = {
      technicianId: techId,
      name: techInput.name,
      color: techInput.color,
      capacity,
      weeklyHours,
      weeklyHoursSource,
      workload: {
        productive: Math.round(agg.productive),
        nonProductive: Math.round(agg.nonProductive),
        sav: Math.round(agg.sav),
        other: Math.round(agg.other),
        total: Math.round(total),
      },
      loadRatio,
      productivityRatio,
      savRate,
      interventionsCount,
      savCount,
      dossiersCount: agg.projectIds.size,
      caGenerated: null, // V1: always null
      caAvailability: 'not_available',
      productivityZone: getProductivityZone(productivityRatio, config),
      savZone: getSavZone(savRate, config),
      loadZone: loadRatio != null ? getLoadZone(loadRatio, config) : 'underload',
      tensionLevel: getTensionLevel(productivityRatio, loadRatio, savRate, config),
      isAbsent,
      absenceLabel: absenceInfo?.label,
      confidenceBreakdown,
      dataQualityFlags,
      calculationTrace,
    };

    snapshots.push(snapshot);

    if (!isAbsent && total > 0) {
      totalProductivity += productivityRatio;
      totalLoad += loadRatio ?? 0;
      activeTechCount++;
    }
    totalSav += savCount;
    totalInterventions += interventionsCount;
  }

  return {
    snapshots: snapshots.sort((a, b) => b.productivityRatio - a.productivityRatio),
    teamStats: {
      avgProductivityRate: activeTechCount > 0 ? totalProductivity / activeTechCount : 0,
      avgLoadRatio: activeTechCount > 0 ? totalLoad / activeTechCount : 0,
      totalSavCount: totalSav,
      totalInterventions,
    },
    unknownTechnicianWorkload: unknownWorkload,
    matchLog: [], // populated by caller from consolidation
  };
}
