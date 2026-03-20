/**
 * BD Story — Campaign Engine
 * Génère des séries équilibrées selon saison, mix métiers, promesse éditoriale
 */

import {
  BdStoryGenerationInput, GeneratedStory, ProblemUniverse,
  StoryCampaignMode, SeasonContext
} from '../types/bdStory.types';
import { extractAvoidanceLists } from './diversityEngine';

// ============================================================================
// CAMPAIGN PROFILES
// ============================================================================

interface CampaignProfile {
  mode: StoryCampaignMode;
  universeWeights: Record<ProblemUniverse, number>;
  tonePreferences: ('rassurant' | 'pedagogique' | 'reactif' | 'proximite')[];
  urgencyMix: { forte: number; moyenne: number; faible: number };
}

const CAMPAIGN_PROFILES: CampaignProfile[] = [
  {
    mode: 'auto_balanced',
    universeWeights: { plomberie: 2, electricite: 2, serrurerie: 2, vitrerie: 2, menuiserie: 2, peinture_renovation: 2 },
    tonePreferences: ['rassurant', 'pedagogique', 'reactif', 'proximite'],
    urgencyMix: { forte: 0.3, moyenne: 0.4, faible: 0.3 },
  },
  {
    mode: 'seasonal',
    universeWeights: { plomberie: 2, electricite: 2, serrurerie: 1, vitrerie: 2, menuiserie: 2, peinture_renovation: 2 },
    tonePreferences: ['rassurant', 'proximite'],
    urgencyMix: { forte: 0.2, moyenne: 0.5, faible: 0.3 },
  },
  {
    mode: 'plomberie_focus',
    universeWeights: { plomberie: 5, electricite: 1, serrurerie: 1, vitrerie: 1, menuiserie: 1, peinture_renovation: 1 },
    tonePreferences: ['reactif', 'rassurant'],
    urgencyMix: { forte: 0.4, moyenne: 0.4, faible: 0.2 },
  },
  {
    mode: 'electricite_focus',
    universeWeights: { plomberie: 1, electricite: 5, serrurerie: 1, vitrerie: 1, menuiserie: 1, peinture_renovation: 1 },
    tonePreferences: ['pedagogique', 'reactif'],
    urgencyMix: { forte: 0.4, moyenne: 0.4, faible: 0.2 },
  },
  {
    mode: 'mix_services',
    universeWeights: { plomberie: 1, electricite: 1, serrurerie: 2, vitrerie: 2, menuiserie: 2, peinture_renovation: 2 },
    tonePreferences: ['proximite', 'rassurant', 'pedagogique'],
    urgencyMix: { forte: 0.2, moyenne: 0.4, faible: 0.4 },
  },
  {
    mode: 'urgence_only',
    universeWeights: { plomberie: 3, electricite: 3, serrurerie: 2, vitrerie: 2, menuiserie: 1, peinture_renovation: 0 },
    tonePreferences: ['reactif'],
    urgencyMix: { forte: 0.7, moyenne: 0.3, faible: 0 },
  },
  {
    mode: 'renovation_soft',
    universeWeights: { plomberie: 1, electricite: 1, serrurerie: 1, vitrerie: 1, menuiserie: 2, peinture_renovation: 5 },
    tonePreferences: ['proximite', 'pedagogique'],
    urgencyMix: { forte: 0.1, moyenne: 0.3, faible: 0.6 },
  },
];

// ============================================================================
// SEASON → CAMPAIGN ADJUSTMENTS
// ============================================================================

const SEASON_UNIVERSE_BOOST: Record<SeasonContext, Partial<Record<ProblemUniverse, number>>> = {
  hiver: { plomberie: 2, electricite: 1, vitrerie: 1 },
  printemps: { peinture_renovation: 2, menuiserie: 1 },
  ete: { vitrerie: 1, menuiserie: 1, electricite: 1 },
  automne: { plomberie: 1, serrurerie: 1 },
};

// ============================================================================
// GENERATE CAMPAIGN INPUTS
// ============================================================================

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(weights: Record<string, number>): string {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function generateCampaignInputs(
  count: number,
  mode: StoryCampaignMode,
  season: SeasonContext,
  existingStories: GeneratedStory[] = [],
  agencyId: string = 'default'
): BdStoryGenerationInput[] {
  const profile = CAMPAIGN_PROFILES.find(p => p.mode === mode) || CAMPAIGN_PROFILES[0];

  // Apply season boost
  const adjustedWeights = { ...profile.universeWeights };
  const seasonBoost = SEASON_UNIVERSE_BOOST[season];
  if (seasonBoost) {
    for (const [universe, boost] of Object.entries(seasonBoost)) {
      adjustedWeights[universe as ProblemUniverse] = (adjustedWeights[universe as ProblemUniverse] || 1) + boost;
    }
  }

  const inputs: BdStoryGenerationInput[] = [];
  let accumulated = [...existingStories];

  for (let i = 0; i < count; i++) {
    const avoidance = extractAvoidanceLists(accumulated);
    const universe = weightedPick(adjustedWeights) as ProblemUniverse;
    const tone = pickRandom(profile.tonePreferences);

    // CTA mode rotation
    const ctaModes = ['appel', 'devis', 'intervention', 'message'] as const;
    const ctaMode = ctaModes[i % ctaModes.length];

    inputs.push({
      agencyId,
      universe,
      season,
      tone,
      ctaMode,
      campaignMode: mode,
      avoidRecentProblemSlugs: avoidance.avoidProblemSlugs,
      avoidRecentTechnicianSlugs: avoidance.avoidTechnicianSlugs,
      avoidRecentStoryKeys: avoidance.avoidStoryKeys,
    });

    // Simulate accumulation for avoidance
    accumulated.push({
      problemSlug: universe,
      assignedCharacters: { technician: '', assistante: '', clientProfile: '' },
      storyKey: `simulated_${i}`,
    } as any);
  }

  return inputs;
}

// ============================================================================
// CAMPAIGN SUMMARY
// ============================================================================

export interface CampaignSummary {
  totalStories: number;
  universeDistribution: Record<string, number>;
  technicianDistribution: Record<string, number>;
  toneDistribution: Record<string, number>;
  avgDiversityScore: number;
}

export function summarizeCampaign(stories: GeneratedStory[]): CampaignSummary {
  const universeDist: Record<string, number> = {};
  const techDist: Record<string, number> = {};
  const toneDist: Record<string, number> = {};
  let totalDiversity = 0;

  for (const s of stories) {
    universeDist[s.universe] = (universeDist[s.universe] || 0) + 1;
    techDist[s.assignedCharacters.technician] = (techDist[s.assignedCharacters.technician] || 0) + 1;
    toneDist[s.tone] = (toneDist[s.tone] || 0) + 1;
    totalDiversity += s.diversityScore.totalScore;
  }

  return {
    totalStories: stories.length,
    universeDistribution: universeDist,
    technicianDistribution: techDist,
    toneDistribution: toneDist,
    avgDiversityScore: stories.length > 0 ? totalDiversity / stories.length : 0,
  };
}
