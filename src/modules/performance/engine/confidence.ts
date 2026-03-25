/**
 * Performance Terrain — Confidence scoring
 * 4 sous-scores indépendants + score global pondéré
 */

import type { ConfidenceBreakdown, WorkItem, DurationSource } from './types';
import { CONFIDENCE_WEIGHTS } from './rules';

interface ConfidenceInput {
  workItems: WorkItem[];
  capacityConfidence: number; // from CapacityResult
  matchAmbiguousCount: number;
  matchTotalCount: number;
  classificationFallbackCount: number;
  classificationTotalCount: number;
}

/**
 * Compute the 4 sub-scores and global confidence.
 */
export function computeConfidenceBreakdown(input: ConfidenceInput): ConfidenceBreakdown {
  const { workItems, capacityConfidence, matchAmbiguousCount, matchTotalCount, classificationFallbackCount, classificationTotalCount } = input;

  // 1. Duration confidence: % items with explicit or computed duration
  const reliableSources: DurationSource[] = ['explicit', 'computed'];
  const reliableCount = workItems.filter(w => reliableSources.includes(w.durationSource)).length;
  const durationConfidence = workItems.length > 0 ? reliableCount / workItems.length : 0;

  // 2. Capacity confidence: passed through from capacity computation
  // 1.0 if contract, 0.5 if default

  // 3. Matching confidence: % items without ambiguity
  const matchingConfidence = matchTotalCount > 0 
    ? 1 - (matchAmbiguousCount / matchTotalCount) 
    : 1;

  // 4. Classification confidence: % items classified without fallback
  const classificationConfidence = classificationTotalCount > 0
    ? 1 - (classificationFallbackCount / classificationTotalCount)
    : 1;

  // Global weighted score
  const globalConfidenceScore = 
    CONFIDENCE_WEIGHTS.duration * durationConfidence +
    CONFIDENCE_WEIGHTS.capacity * capacityConfidence +
    CONFIDENCE_WEIGHTS.matching * matchingConfidence +
    CONFIDENCE_WEIGHTS.classification * classificationConfidence;

  return {
    durationConfidence: round2(durationConfidence),
    capacityConfidence: round2(capacityConfidence),
    matchingConfidence: round2(matchingConfidence),
    classificationConfidence: round2(classificationConfidence),
    globalConfidenceScore: round2(globalConfidenceScore),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
