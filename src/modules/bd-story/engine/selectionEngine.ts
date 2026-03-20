/**
 * BD Story — Selection Engine
 * Choisit problème, template, client, lieu, technicien, CTA, trigger, outcome
 * Scoring de qualité du couplage, pas juste un filtre aléatoire
 */

import { 
  BdStoryGenerationInput, ProblemType, StoryTemplate, ClientProfile,
  LocationContext, CtaEntry, Trigger, OutcomeStep, Character,
  ProblemUniverse, BatchState, BatchUniverseQuota
} from '../types/bdStory.types';
import { getProblemsForUniverse } from '../data/problemTypes';
import { STORY_TEMPLATES } from '../data/templates';
import { CLIENT_PROFILES } from '../data/clientProfiles';
import { PROPERTY_TYPES, ROOM_CONTEXTS, TIME_CONTEXTS } from '../data/propertyTypes';
import { CTA_ENTRIES, getCtasByMode } from '../data/ctas';
import { TRIGGERS } from '../data/triggers';
import { OUTCOMES } from '../data/outcomes';
import { BD_STORY_CHARACTERS } from '../data/characters';

// ============================================================================
// TYPES
// ============================================================================

export interface StorySelection {
  problem: ProblemType;
  template: StoryTemplate;
  clientProfile: ClientProfile;
  location: LocationContext;
  technician: Character;
  assistante: Character;
  cta: CtaEntry;
  trigger: Trigger;
  outcomes: OutcomeStep[];
  tone: 'rassurant' | 'pedagogique' | 'reactif' | 'proximite';
  couplingScore: CouplingScore;
}

export interface CouplingScore {
  metierCompat: number;      // 0-1 obligatoire
  clientProblem: number;     // 0-1 forte
  locationProblem: number;   // 0-1 forte
  toneUrgency: number;       // 0-1 forte
  templateOutcome: number;   // 0-1 forte
  diversityFreshness: number; // 0-1 forte
  total: number;             // weighted average
}

// ============================================================================
// HELPERS
// ============================================================================

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function excludeRecent<T extends { slug?: string; key?: string; text?: string }>(
  items: T[],
  recentSlugs: string[],
  getKey: (item: T) => string
): T[] {
  const filtered = items.filter(i => !recentSlugs.includes(getKey(i)));
  return filtered.length > 0 ? filtered : items; // fallback to all if everything excluded
}

// ============================================================================
// UNIVERSE SELECTION
// ============================================================================

const ALL_UNIVERSES: ProblemUniverse[] = [
  'plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'peinture_renovation'
];

// ============================================================================
// UNIVERSE BALANCING — min/max constraints for batch generation
// ============================================================================

const UNIVERSE_BASE_WEIGHTS: Record<ProblemUniverse, number> = {
  plomberie: 2,
  electricite: 2,
  serrurerie: 2,
  vitrerie: 2,
  menuiserie: 2,
  peinture_renovation: 1.5, // Slightly reduced to prevent domination
};

const SEASON_WEIGHTS: Record<string, Partial<Record<ProblemUniverse, number>>> = {
  hiver: { plomberie: 3, electricite: 2, serrurerie: 1.5, vitrerie: 2, menuiserie: 1, peinture_renovation: 0.8 },
  printemps: { plomberie: 1.5, electricite: 1.5, serrurerie: 1.5, vitrerie: 1.5, menuiserie: 2, peinture_renovation: 2 },
  ete: { plomberie: 1, electricite: 2, serrurerie: 1.5, vitrerie: 2, menuiserie: 2, peinture_renovation: 1.5 },
  automne: { plomberie: 2, electricite: 2, serrurerie: 2, vitrerie: 1.5, menuiserie: 1.5, peinture_renovation: 1 },
};

export const DEFAULT_BATCH_UNIVERSE_QUOTAS: Record<ProblemUniverse, BatchUniverseQuota> = {
  plomberie: { minPct: 10, maxPct: 25 },
  electricite: { minPct: 10, maxPct: 25 },
  serrurerie: { minPct: 10, maxPct: 25 },
  vitrerie: { minPct: 10, maxPct: 25 },
  menuiserie: { minPct: 10, maxPct: 25 },
  peinture_renovation: { minPct: 10, maxPct: 22 },
};

function getFinalUniverseBounds(
  universe: ProblemUniverse,
  quotas: Record<ProblemUniverse, BatchUniverseQuota>,
  targetSize: number
): { minCount: number; maxCount: number } {
  const quota = quotas[universe];
  return {
    minCount: Math.ceil((targetSize * quota.minPct) / 100),
    maxCount: Math.max(1, Math.floor((targetSize * quota.maxPct) / 100)),
  };
}

function isUniverseCapped(
  universe: ProblemUniverse,
  state: BatchState,
  quotas: Record<ProblemUniverse, BatchUniverseQuota>
): boolean {
  const count = state.countsByUniverse[universe] || 0;
  const { maxCount } = getFinalUniverseBounds(universe, quotas, state.targetSize);
  return count >= maxCount;
}

function isUniverseMandatoryNow(
  universe: ProblemUniverse,
  state: BatchState,
  quotas: Record<ProblemUniverse, BatchUniverseQuota>
): boolean {
  const count = state.countsByUniverse[universe] || 0;
  const { minCount } = getFinalUniverseBounds(universe, quotas, state.targetSize);
  const remainingAfterThisPick = Math.max(0, state.targetSize - (state.generatedCount + 1));
  const missingIfSkipped = Math.max(0, minCount - count);
  return missingIfSkipped > remainingAfterThisPick;
}

export function getUniverseBatchCorrection(
  universe: ProblemUniverse,
  state: BatchState,
  quotas: Record<ProblemUniverse, BatchUniverseQuota>
): number {
  const count = state.countsByUniverse[universe] || 0;
  const nextGeneratedCount = state.generatedCount + 1;
  const { minCount, maxCount } = getFinalUniverseBounds(universe, quotas, state.targetSize);

  if (count >= maxCount) return 0;
  if (isUniverseMandatoryNow(universe, state, quotas)) return 12;

  const expectedMinByNow = Math.floor((nextGeneratedCount / state.targetSize) * minCount);
  const expectedMaxByNow = Math.ceil((nextGeneratedCount / state.targetSize) * maxCount);
  let correction = 1;

  if (count < expectedMinByNow) {
    correction += (expectedMinByNow - count) * 4;
  }

  if (count >= expectedMaxByNow) {
    correction *= 0.2;
  }

  if (count === 0 && state.generatedCount > 0) {
    correction *= 1.15;
  }

  return correction;
}

function scoreTextFreshness(text: string, input: BdStoryGenerationInput): number {
  const usage = input.atomUsageState?.atomUsageCount[text] || 0;
  const isRecent = input.atomUsageState?.recentAtomTexts.includes(text) || false;
  return (isRecent ? -100 : 0) - usage * 8;
}

function selectUniverse(input: BdStoryGenerationInput): ProblemUniverse {
  if (input.universe) return input.universe;

  // Apply season adjustments on top of base weights
  const baseWeights = { ...UNIVERSE_BASE_WEIGHTS };
  const seasonAdj = input.season ? SEASON_WEIGHTS[input.season] : undefined;
  const quotas = input.batchUniverseQuotas || DEFAULT_BATCH_UNIVERSE_QUOTAS;
  const batchState = input.batchState;

  let candidates = [...ALL_UNIVERSES];
  if (batchState) {
    candidates = candidates.filter(u => !isUniverseCapped(u, batchState, quotas));
    const mandatory = candidates.filter(u => isUniverseMandatoryNow(u, batchState, quotas));
    if (mandatory.length > 0) {
      candidates = mandatory;
    }
  }

  const finalWeights: Record<string, number> = {};
  for (const u of candidates) {
    const seasonWeight = seasonAdj?.[u] ?? baseWeights[u];
    const batchCorrection = batchState ? getUniverseBatchCorrection(u, batchState, quotas) : 1;
    finalWeights[u] = seasonWeight * batchCorrection;
  }

  // Weighted random pick
  const entries = candidates
    .map(u => ({ u, w: finalWeights[u] || 1 }))
    .filter(entry => entry.w > 0);

  if (entries.length === 0) {
    return ALL_UNIVERSES[0];
  }

  const totalW = entries.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * totalW;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.u;
  }
  return entries[entries.length - 1].u;
}

// ============================================================================
// PROBLEM SELECTION
// ============================================================================

function selectProblem(
  universe: ProblemUniverse,
  input: BdStoryGenerationInput
): ProblemType {
  let pool = getProblemsForUniverse(universe);
  pool = excludeRecent(pool, input.avoidRecentProblemSlugs || [], p => p.slug);
  return pickRandom(pool);
}

// ============================================================================
// TEMPLATE SELECTION (compatible with story family + outcome type)
// ============================================================================

function selectTemplate(
  problem: ProblemType,
  input: BdStoryGenerationInput
): StoryTemplate {
  let pool = [...STORY_TEMPLATES];
  
  // If user specified a template, use it
  if (input.templateType) {
    const found = pool.find(t => t.key === input.templateType);
    if (found) return found;
  }

  // If user specified a story family, filter
  if (input.storyFamily) {
    const filtered = pool.filter(t => t.storyFamily === input.storyFamily);
    if (filtered.length > 0) pool = filtered;
  }

  // Favor templates compatible with problem characteristics
  const scored = pool.map(t => {
    let score = 1;
    // Urgency match
    if (problem.urgencyLevel === 'forte' && ['urgence_simple', 'mise_en_securite', 'reparation_immediate'].includes(t.key)) score += 2;
    if (problem.urgencyLevel === 'faible' && ['diagnostic_travaux', 'avant_apres', 'retour_confort', 'intervention_preventive'].includes(t.key)) score += 2;
    // Temporary repair match
    if (problem.allowsTemporaryRepair && t.key === 'provisoire_devis') score += 3;
    if (problem.allowsQuote && ['provisoire_devis', 'diagnostic_travaux'].includes(t.key)) score += 1;
    return { template: t, score };
  });

  // Weighted random selection
  const totalScore = scored.reduce((s, e) => s + e.score, 0);
  let r = Math.random() * totalScore;
  for (const e of scored) {
    r -= e.score;
    if (r <= 0) return e.template;
  }
  return scored[scored.length - 1].template;
}

// ============================================================================
// CLIENT PROFILE
// ============================================================================

function selectClientProfile(
  problem: ProblemType,
  tone: 'rassurant' | 'pedagogique' | 'reactif' | 'proximite'
): ClientProfile {
  const scored = CLIENT_PROFILES.map(cp => {
    let score = 1;
    // Tone matching
    if (cp.tone === 'inquiet' && tone === 'rassurant') score += 2;
    if (cp.tone === 'presse' && tone === 'reactif') score += 2;
    if (cp.tone === 'calme' && tone === 'pedagogique') score += 2;
    if (cp.tone === 'calme' && tone === 'proximite') score += 1;
    // Category matching with problem context
    if (cp.category === 'pro' && problem.compatibleRooms.includes('vitrine_commerce')) score += 3;
    if (cp.category === 'contextuel') score += 1; // adds variety
    return { profile: cp, score };
  });

  const totalScore = scored.reduce((s, e) => s + e.score, 0);
  let r = Math.random() * totalScore;
  for (const e of scored) {
    r -= e.score;
    if (r <= 0) return e.profile;
  }
  return scored[scored.length - 1].profile;
}

// ============================================================================
// LOCATION
// ============================================================================

function selectLocation(
  problem: ProblemType,
  input: BdStoryGenerationInput
): LocationContext {
  const room = pickRandom(problem.compatibleRooms);
  const property = pickRandom(PROPERTY_TYPES);
  const time = pickRandom(TIME_CONTEXTS);

  // Season from input or random
  const seasons = ['printemps', 'ete', 'automne', 'hiver'] as const;
  const season = input.season || pickRandom([...seasons]);

  // Weather coherent with season
  const weatherByseason: Record<string, string[]> = {
    hiver: ['pluie', 'neige', 'brouillard', 'vent'],
    printemps: ['beau', 'pluie', 'vent'],
    ete: ['beau', 'canicule', 'orage'],
    automne: ['pluie', 'vent', 'brouillard'],
  };
  const weather = pickRandom(weatherByseason[season] || ['beau']) as LocationContext['weather'];

  // Occupancy coherent with problem urgency
  const occupancies: LocationContext['occupancy'][] = problem.urgencyLevel === 'forte'
    ? ['famille_presente', 'senior_seul', 'magasin_ouvert']
    : ['famille_presente', 'maison_vide', 'invites_attendus', 'retour_vacances'];
  const occupancy = pickRandom(occupancies);

  // Visual mood from urgency
  const moodMap: Record<string, LocationContext['visualMood'][]> = {
    forte: ['stressant', 'urgence'],
    moyenne: ['calme', 'degrade'],
    faible: ['calme', 'cosy', 'lumineux'],
  };
  const visualMood = pickRandom(moodMap[problem.urgencyLevel] || ['calme']) as LocationContext['visualMood'];

  return { propertyType: property, room, time, season, weather, occupancy, visualMood };
}

// ============================================================================
// TECHNICIAN (from crew pool, least recently used)
// ============================================================================

function selectTechnician(
  problem: ProblemType,
  input: BdStoryGenerationInput
): Character {
  const compatibleSlugs = problem.allowedTechnicians;
  let pool = BD_STORY_CHARACTERS.filter(
    c => c.role === 'technicien' && c.active && compatibleSlugs.includes(c.slug)
  );

  // Prefer user preference
  if (input.technicianPreference && input.technicianPreference.length > 0) {
    const preferred = pool.filter(c => input.technicianPreference!.includes(c.slug));
    if (preferred.length > 0) pool = preferred;
  }

  // Exclude recently used
  if (input.avoidRecentTechnicianSlugs && input.avoidRecentTechnicianSlugs.length > 0) {
    const filtered = pool.filter(c => !input.avoidRecentTechnicianSlugs!.includes(c.slug));
    if (filtered.length > 0) pool = filtered;
  }

  return pickRandom(pool);
}

// ============================================================================
// TONE
// ============================================================================

function selectTone(
  problem: ProblemType,
  template: StoryTemplate,
  input: BdStoryGenerationInput
): 'rassurant' | 'pedagogique' | 'reactif' | 'proximite' {
  if (input.tone) return input.tone;

  // Map brand promise to default tone
  const promiseTone: Record<string, 'rassurant' | 'pedagogique' | 'reactif' | 'proximite'> = {
    reactivite: 'reactif',
    rassurance: 'rassurant',
    expertise: 'pedagogique',
    proximite: 'proximite',
  };
  
  const baseTone = promiseTone[template.brandPromise] || 'rassurant';
  
  // Override for strong urgency
  if (problem.urgencyLevel === 'forte' && baseTone === 'pedagogique') return 'reactif';
  
  return baseTone;
}

// ============================================================================
// CTA
// ============================================================================

function selectCta(
  template: StoryTemplate,
  input: BdStoryGenerationInput
): CtaEntry {
  const mode = input.ctaMode || (() => {
    switch (template.outcomeType) {
      case 'reparation_immediate': return 'intervention';
      case 'mise_en_securite': return 'appel';
      case 'provisoire_plus_devis': return 'devis';
      case 'diagnostic_plus_travaux': return 'devis';
      default: return 'general';
    }
  })();
  const pool = getCtasByMode(mode);

  const ranked = pool
    .map(cta => ({ cta, freshness: scoreTextFreshness(cta.text, input) + Math.random() }))
    .sort((a, b) => b.freshness - a.freshness);

  return ranked[0]?.cta || pool[0] || CTA_ENTRIES[0];
}

// ============================================================================
// TRIGGER
// ============================================================================

function selectTrigger(problem: ProblemType): Trigger {
  // Context-aware trigger selection
  const urgentTriggers = ['au_reveil', 'retour_maison', 'nuit', 'apres_choc', 'sans_prevenir'];
  const calmTriggers = ['preparation_repas', 'nettoyage', 'fin_journee', 'weekend', 'changement_saison'];
  
  const pool = problem.urgencyLevel === 'forte'
    ? TRIGGERS.filter(t => urgentTriggers.includes(t.slug))
    : problem.urgencyLevel === 'faible'
      ? TRIGGERS.filter(t => calmTriggers.includes(t.slug))
      : TRIGGERS;
  
  return pickRandom(pool.length > 0 ? pool : TRIGGERS);
}

// ============================================================================
// OUTCOMES
// ============================================================================

function selectOutcomes(
  problem: ProblemType,
  template: StoryTemplate
): OutcomeStep[] {
  // Filter outcomes by action type matching template outcome
  const actionTypeMap: Record<string, string[]> = {
    reparation_immediate: ['reparation'],
    mise_en_securite: ['securisation'],
    provisoire_plus_devis: ['provisoire', 'chiffrage'],
    diagnostic_plus_travaux: ['inspection', 'chiffrage'],
  };
  const targetActions = actionTypeMap[template.outcomeType] || ['reparation'];
  
  let pool = OUTCOMES.filter(o => targetActions.includes(o.actionType));
  if (pool.length === 0) pool = OUTCOMES.filter(o => o.actionType === 'reparation');
  
  return pickRandomN(pool, Math.min(2, pool.length));
}

// ============================================================================
// COUPLING SCORE
// ============================================================================

function computeCouplingScore(
  problem: ProblemType,
  template: StoryTemplate,
  clientProfile: ClientProfile,
  location: LocationContext,
  tone: 'rassurant' | 'pedagogique' | 'reactif' | 'proximite',
  technician: Character
): CouplingScore {
  // Métier compatibility (binary, must be 1)
  const metierCompat = technician.specialties.some(s => 
    problem.universe.startsWith(s) || s === 'polyvalent' || s === 'fuites'
  ) ? 1 : 0;

  // Client-problem coherence
  let clientProblem = 0.5;
  if (clientProfile.tone === 'presse' && problem.urgencyLevel === 'forte') clientProblem = 1;
  if (clientProfile.tone === 'calme' && problem.urgencyLevel === 'faible') clientProblem = 1;
  if (clientProfile.tone === 'inquiet' && problem.urgencyLevel !== 'faible') clientProblem = 0.8;

  // Location-problem coherence
  const locationProblem = problem.compatibleRooms.includes(location.room) ? 1 : 0.3;

  // Tone-urgency coherence
  let toneUrgency = 0.5;
  if (tone === 'reactif' && problem.urgencyLevel === 'forte') toneUrgency = 1;
  if (tone === 'rassurant' && problem.urgencyLevel !== 'forte') toneUrgency = 0.9;
  if (tone === 'pedagogique' && problem.urgencyLevel === 'faible') toneUrgency = 1;

  // Template-outcome coherence
  let templateOutcome = 0.7;
  if (problem.allowsTemporaryRepair && template.outcomeType === 'provisoire_plus_devis') templateOutcome = 1;
  if (problem.allowsQuote && ['provisoire_plus_devis', 'diagnostic_plus_travaux'].includes(template.outcomeType)) templateOutcome = 0.9;

  const diversityFreshness = 1; // Will be computed by diversityEngine

  const weights = { metier: 3, client: 2, location: 2, tone: 2, template: 2, diversity: 1 };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const total = (
    metierCompat * weights.metier +
    clientProblem * weights.client +
    locationProblem * weights.location +
    toneUrgency * weights.tone +
    templateOutcome * weights.template +
    diversityFreshness * weights.diversity
  ) / totalWeight;

  return { metierCompat, clientProblem, locationProblem, toneUrgency, templateOutcome, diversityFreshness, total };
}

// ============================================================================
// MAIN — generateSelection
// ============================================================================

const MAX_ATTEMPTS = 10;

export function generateSelection(input: BdStoryGenerationInput): StorySelection {
  let bestSelection: StorySelection | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const universe = selectUniverse(input);
    const problem = selectProblem(universe, input);
    const template = selectTemplate(problem, input);
    const tone = selectTone(problem, template, input);
    const clientProfile = selectClientProfile(problem, tone);
    const location = selectLocation(problem, input);
    const technician = selectTechnician(problem, input);
    const cta = selectCta(template, input);
    const trigger = selectTrigger(problem);
    const outcomes = selectOutcomes(problem, template);

    const assistante = BD_STORY_CHARACTERS.find(c => c.slug === 'amandine')!;

    const couplingScore = computeCouplingScore(
      problem, template, clientProfile, location, tone, technician
    );

    // Hard constraint: metier must be compatible
    if (couplingScore.metierCompat < 1) continue;

    if (couplingScore.total > bestScore) {
      bestScore = couplingScore.total;
      bestSelection = {
        problem, template, clientProfile, location, technician,
        assistante, cta, trigger, outcomes, tone, couplingScore
      };
    }

    // Good enough threshold
    if (couplingScore.total >= 0.85) break;
  }

  if (!bestSelection) {
    // Fallback: simple valid selection
    const universe = input.universe || 'plomberie';
    const problem = getProblemsForUniverse(universe)[0];
    const template = STORY_TEMPLATES[0];
    const tone = input.tone || 'rassurant';
    return {
      problem,
      template,
      clientProfile: CLIENT_PROFILES[0],
      location: {
        propertyType: 'maison_moderne',
        room: problem.compatibleRooms[0],
        time: 'matin',
        season: input.season || 'printemps',
        weather: 'beau',
        occupancy: 'famille_presente',
        visualMood: 'calme',
      },
      technician: BD_STORY_CHARACTERS.find(c => problem.allowedTechnicians.includes(c.slug))!,
      assistante: BD_STORY_CHARACTERS.find(c => c.slug === 'amandine')!,
      cta: CTA_ENTRIES[0],
      trigger: TRIGGERS[0],
      outcomes: [OUTCOMES[0]],
      tone,
      couplingScore: { metierCompat: 1, clientProblem: 0.5, locationProblem: 0.5, toneUrgency: 0.5, templateOutcome: 0.5, diversityFreshness: 0.5, total: 0.5 }
    };
  }

  return bestSelection;
}
