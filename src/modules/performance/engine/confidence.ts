/**
 * Performance Terrain — Confidence scoring V2
 * 4 sous-scores + malus dynamiques + tiers
 */

import type { ConfidenceBreakdown, ConfidenceLevel, ConfidencePenalty, WorkItem, DurationSource } from './types';
import { CONFIDENCE_WEIGHTS } from './rules';

interface ConfidenceInput {
  workItems: WorkItem[];
  capacityConfidence: number;
  matchAmbiguousCount: number;
  matchTotalCount: number;
  classificationFallbackCount: number;
  classificationTotalCount: number;
  // V2: penalty inputs
  highFallbackUsage?: boolean;
  missingContract?: boolean;
}

/**
 * Compute the 4 sub-scores, dynamic penalties, tier, and global confidence.
 */
export function computeConfidenceBreakdown(input: ConfidenceInput): ConfidenceBreakdown {
  const {
    workItems, capacityConfidence, matchAmbiguousCount, matchTotalCount,
    classificationFallbackCount, classificationTotalCount,
    highFallbackUsage = false, missingContract = false,
  } = input;

  // 1. Duration confidence
  const reliableSources: DurationSource[] = ['explicit', 'computed'];
  const reliableCount = workItems.filter(w => reliableSources.includes(w.durationSource)).length;
  const durationConfidence = workItems.length > 0 ? reliableCount / workItems.length : 0;

  // 2. Capacity confidence (passed through)

  // 3. Matching confidence
  const matchingConfidence = matchTotalCount > 0 
    ? 1 - (matchAmbiguousCount / matchTotalCount) 
    : 1;

  // 4. Classification confidence
  const classificationConfidence = classificationTotalCount > 0
    ? 1 - (classificationFallbackCount / classificationTotalCount)
    : 1;

  // Base weighted score
  let globalConfidenceScore = 
    CONFIDENCE_WEIGHTS.duration * durationConfidence +
    CONFIDENCE_WEIGHTS.capacity * capacityConfidence +
    CONFIDENCE_WEIGHTS.matching * matchingConfidence +
    CONFIDENCE_WEIGHTS.classification * classificationConfidence;

  // Dynamic penalties
  const penalties: ConfidencePenalty[] = [];
  if (matchAmbiguousCount > 0) {
    penalties.push({ reason: 'Rapprochement ambigu', value: 0.10 });
  }
  if (highFallbackUsage) {
    penalties.push({ reason: 'Durées majoritairement estimées', value: 0.15 });
  }
  if (missingContract) {
    penalties.push({ reason: 'Durée hebdo non renseignée', value: 0.20 });
  }

  const totalPenalty = penalties.reduce((sum, p) => sum + p.value, 0);
  globalConfidenceScore = Math.max(0, globalConfidenceScore - totalPenalty);

  // Confidence tier
  const confidenceLevel: ConfidenceLevel = 
    globalConfidenceScore > 0.8 ? 'high' :
    globalConfidenceScore >= 0.6 ? 'medium' : 'low';

  return {
    durationConfidence: round2(durationConfidence),
    capacityConfidence: round2(capacityConfidence),
    matchingConfidence: round2(matchingConfidence),
    classificationConfidence: round2(classificationConfidence),
    globalConfidenceScore: round2(globalConfidenceScore),
    confidenceLevel,
    penalties,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
