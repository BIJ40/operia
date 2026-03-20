/**
 * BD Story — Diversity Engine
 * Score pondéré anti-répétition sur fenêtre glissante
 * + proximité narrative perçue (ouverture, tension, résolution, morale)
 */

import { GeneratedStory, DiversityScoreBreakdown } from '../types/bdStory.types';
import { narrativeDistance } from '../data/storyBible';

// ============================================================================
// WEIGHTS — importance de chaque dimension
// ============================================================================

const DIVERSITY_WEIGHTS = {
  sameProblemType: 5,    // poids très fort
  sameStoryFamily: 4,   // poids très fort
  sameTechnician: 3,     // poids moyen
  sameLocation: 3,       // poids moyen
  sameOutcomeType: 2,    // poids moyen-faible
  sameCta: 1,            // poids faible
};

const BLOCKING_THRESHOLD = 0.6; // Above this = too similar

// ============================================================================
// FINGERPRINT COMPARISON
// ============================================================================

function compareDimension(current: string, recent: string): number {
  return current === recent ? 1 : 0;
}

// ============================================================================
// SCORE AGAINST ONE PREVIOUS STORY
// ============================================================================

function scoreAgainstOne(
  current: GeneratedStory,
  previous: GeneratedStory,
  recencyWeight: number // 1.0 for most recent, decays
): DiversityScoreBreakdown {
  const sameProblemType = compareDimension(current.problemSlug, previous.problemSlug) * recencyWeight;
  const sameStoryFamily = compareDimension(current.storyFamily, previous.storyFamily) * recencyWeight;
  const sameTechnician = compareDimension(
    current.assignedCharacters.technician,
    previous.assignedCharacters.technician
  ) * recencyWeight;
  const sameLocation = compareDimension(
    current.locationContext.room,
    previous.locationContext.room
  ) * recencyWeight;
  const sameOutcomeType = (
    current.outcomeSlugs.some(o => previous.outcomeSlugs.includes(o)) ? 1 : 0
  ) * recencyWeight;
  const sameCta = compareDimension(current.ctaText, previous.ctaText) * recencyWeight;

  // Narrative proximity (0 = very different, 1 = identical feel)
  const narDist = narrativeDistance(current.templateKey, previous.templateKey);
  const narrativeProximity = (1 - narDist / 4) * recencyWeight;

  const totalWeight = Object.values(DIVERSITY_WEIGHTS).reduce((a, b) => a + b, 0);
  const totalScore = (
    sameProblemType * DIVERSITY_WEIGHTS.sameProblemType +
    sameStoryFamily * DIVERSITY_WEIGHTS.sameStoryFamily +
    sameTechnician * DIVERSITY_WEIGHTS.sameTechnician +
    sameLocation * DIVERSITY_WEIGHTS.sameLocation +
    sameOutcomeType * DIVERSITY_WEIGHTS.sameOutcomeType +
    sameCta * DIVERSITY_WEIGHTS.sameCta +
    narrativeProximity * 3 // strong weight on perceived similarity
  ) / (totalWeight + 3);

  return { sameProblemType, sameStoryFamily, sameTechnician, sameLocation, sameOutcomeType, sameCta, totalScore };
}

// ============================================================================
// SCORE AGAINST WINDOW
// ============================================================================

export function scoreDiversity(
  candidate: GeneratedStory,
  recentStories: GeneratedStory[],
  windowSize: number = 20
): DiversityScoreBreakdown {
  const window = recentStories.slice(-windowSize);

  if (window.length === 0) {
    return {
      sameProblemType: 0,
      sameStoryFamily: 0,
      sameTechnician: 0,
      sameLocation: 0,
      sameOutcomeType: 0,
      sameCta: 0,
      totalScore: 0,
    };
  }

  // Aggregate worst (highest) scores with recency decay
  let worstScore: DiversityScoreBreakdown = {
    sameProblemType: 0,
    sameStoryFamily: 0,
    sameTechnician: 0,
    sameLocation: 0,
    sameOutcomeType: 0,
    sameCta: 0,
    totalScore: 0,
  };

  for (let i = 0; i < window.length; i++) {
    // More recent = higher weight
    const recencyWeight = 1 - (i / window.length) * 0.5; // 1.0 → 0.5
    const score = scoreAgainstOne(candidate, window[window.length - 1 - i], recencyWeight);

    if (score.totalScore > worstScore.totalScore) {
      worstScore = score;
    }
  }

  return worstScore;
}

// ============================================================================
// DIVERSITY CHECK — should we block this story?
// ============================================================================

export function isDiversityAcceptable(score: DiversityScoreBreakdown): boolean {
  return score.totalScore < BLOCKING_THRESHOLD;
}

// ============================================================================
// EXTRACT AVOIDANCE LISTS from recent stories
// ============================================================================

export function extractAvoidanceLists(
  recentStories: GeneratedStory[],
  window: number = 5
): {
  avoidProblemSlugs: string[];
  avoidTechnicianSlugs: string[];
  avoidStoryKeys: string[];
} {
  const recent = recentStories.slice(-window);
  return {
    avoidProblemSlugs: recent.map(s => s.problemSlug),
    avoidTechnicianSlugs: recent.slice(-3).map(s => s.assignedCharacters.technician),
    avoidStoryKeys: recent.map(s => s.storyKey),
  };
}
