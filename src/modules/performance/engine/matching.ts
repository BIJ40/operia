/**
 * Performance Terrain — Work item matching engine
 * Rapprochement visite ↔ créneau par score de similarité
 */

import type { WorkItem, MatchOutcome } from './types';
import { MATCHING_THRESHOLDS, MATCHING_WEIGHTS, DEFAULT_THRESHOLDS } from './rules';

export interface MatchDecision {
  aId: string;
  bId: string;
  score: number;
  outcome: MatchOutcome;
}

/**
 * Compute similarity score between two work items (0-1).
 * Uses 4 weighted criteria.
 */
export function scoreWorkItemSimilarity(a: WorkItem, b: WorkItem): number {
  let score = 0;

  // 1. Same interventionId (weight: 0.4)
  if (a.interventionId && b.interventionId && a.interventionId === b.interventionId) {
    score += MATCHING_WEIGHTS.sameInterventionId;
  }

  // 2. Time overlap (weight: 0.3)
  const overlap = computeOverlapRatio(a.start, a.end, b.start, b.end);
  score += MATCHING_WEIGHTS.timeOverlap * overlap;

  // 3. Common technicians (weight: 0.2)
  const commonTechs = a.technicians.filter(t => b.technicians.includes(t));
  const unionTechs = new Set([...a.technicians, ...b.technicians]);
  if (unionTechs.size > 0) {
    score += MATCHING_WEIGHTS.commonTechnicians * (commonTechs.length / unionTechs.size);
  }

  // 4. Same projectId (weight: 0.1)
  if (a.projectId && b.projectId && a.projectId === b.projectId) {
    score += MATCHING_WEIGHTS.sameProjectId;
  }

  return Math.min(1, score);
}

/**
 * Whether two items should be merged based on score threshold.
 */
export function shouldMergeWorkItems(a: WorkItem, b: WorkItem): boolean {
  return scoreWorkItemSimilarity(a, b) >= MATCHING_THRESHOLDS.mergeMinScore;
}

/**
 * Merge two work items. Priority: visite > planning for duration.
 * Keeps the item with better duration source.
 */
export function mergeWorkItems(a: WorkItem, b: WorkItem): WorkItem {
  // Prefer visite/intervention source over planning
  const primary = prioritizeSource(a, b);
  const secondary = primary === a ? b : a;

  return {
    ...primary,
    // Merge technician lists
    technicians: [...new Set([...primary.technicians, ...secondary.technicians])],
    // Keep primary duration (better source)
    durationMinutes: primary.durationMinutes,
    durationSource: primary.durationSource,
  };
}

function prioritizeSource(a: WorkItem, b: WorkItem): WorkItem {
  const sourcePriority: Record<string, number> = {
    visite: 3,
    intervention: 2,
    planning: 1,
  };
  return (sourcePriority[a.source] || 0) >= (sourcePriority[b.source] || 0) ? a : b;
}

/**
 * Compute temporal overlap ratio between two time ranges.
 * Returns 0-1: overlap duration / min(durationA, durationB).
 */
function computeOverlapRatio(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const overlapStart = Math.max(aStart.getTime(), bStart.getTime());
  const overlapEnd = Math.min(aEnd.getTime(), bEnd.getTime());
  const overlap = Math.max(0, overlapEnd - overlapStart);

  const durationA = aEnd.getTime() - aStart.getTime();
  const durationB = bEnd.getTime() - bStart.getTime();
  const minDuration = Math.min(durationA, durationB);

  if (minDuration <= 0) return 0;
  return overlap / minDuration;
}

/**
 * Normalize a work item's end date if missing.
 * Items without end get: end = start + durationMinutes.
 */
export function normalizeWorkItemDates(item: WorkItem, defaultDuration: number = DEFAULT_THRESHOLDS.defaultTaskDurationMinutes): WorkItem {
  let { start, end, durationMinutes } = item;

  // Ensure UTC
  if (!(start instanceof Date) || isNaN(start.getTime())) {
    start = new Date(0);
  }

  if (!(end instanceof Date) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    // Compute end from duration
    const dur = durationMinutes > 0 ? durationMinutes : defaultDuration;
    end = new Date(start.getTime() + dur * 60000);
  }

  return { ...item, start, end };
}
