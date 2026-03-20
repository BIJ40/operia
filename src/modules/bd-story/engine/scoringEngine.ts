/**
 * BD Story — Scoring Engine
 * Note la cohérence narrative d'une histoire générée
 */

import { GeneratedStory, NarrativeFunction } from '../types/bdStory.types';

// ============================================================================
// SCORING DIMENSIONS
// ============================================================================

export interface CoherenceScore {
  narrativeFlow: number;     // 0-1 — enchaînement logique des fonctions narratives
  characterConsistency: number; // 0-1 — personnages aux bons endroits
  toneConsistency: number;   // 0-1 — cohérence du ton entre les cases
  locationLogic: number;     // 0-1 — transitions de lieu crédibles
  textVariety: number;       // 0-1 — diversité des textes
  total: number;
}

// ============================================================================
// EXPECTED NARRATIVE FLOW
// ============================================================================

const EXPECTED_FLOW_GROUPS: NarrativeFunction[][] = [
  ['client_setup', 'client_context'],
  ['problem_appears', 'problem_worsens'],
  ['decision_to_call'],
  ['call_received', 'scheduling'],
  ['technician_arrival'],
  ['inspection_diagnosis', 'repair_action'],
  ['result_visible'],
  ['cta_moral'],
];

function scoreNarrativeFlow(story: GeneratedStory): number {
  const funcs = story.panels.map(p => p.narrativeFunction);
  let groupIndex = 0;
  let score = 0;
  const maxScore = EXPECTED_FLOW_GROUPS.length;

  for (const func of funcs) {
    // Find which group this function belongs to
    const funcGroup = EXPECTED_FLOW_GROUPS.findIndex(g => g.includes(func));
    if (funcGroup >= groupIndex) {
      score++;
      groupIndex = funcGroup;
    }
  }

  return Math.min(1, score / maxScore);
}

// ============================================================================
// CHARACTER CONSISTENCY
// ============================================================================

function scoreCharacterConsistency(story: GeneratedStory): number {
  let correct = 0;
  let total = 0;

  for (const panel of story.panels) {
    total++;

    // Amandine only in call/scheduling
    if (panel.actors.includes('amandine')) {
      if (['call_received', 'scheduling'].includes(panel.narrativeFunction)) {
        correct++;
      }
    }
    // Technician only after call
    else if (panel.actors.includes(story.assignedCharacters.technician)) {
      const callPanel = story.panels.find(p => p.narrativeFunction === 'call_received');
      if (callPanel && panel.number >= callPanel.number) {
        correct++;
      }
    }
    // Client in early panels
    else if (panel.actors.includes('client')) {
      correct++; // Client is always valid
    }
    // CTA panel — no actors expected
    else if (panel.narrativeFunction === 'cta_moral') {
      correct++;
    }
    else {
      correct += 0.5; // Unknown but not wrong
    }
  }

  return total > 0 ? correct / total : 1;
}

// ============================================================================
// TONE CONSISTENCY
// ============================================================================

function scoreToneConsistency(story: GeneratedStory): number {
  // Simple heuristic: check if text matches expected tone keywords
  const toneKeywords: Record<string, string[]> = {
    reactif: ['vite', 'urgent', 'rapidement', 'immédiat', 'tout de suite'],
    rassurant: ['calme', 'tranquille', 'normal', 'rassuré', 'soulagé'],
    pedagogique: ['comprendre', 'vérifie', 'inspecte', 'cause', 'diagnostic'],
    proximite: ['quartier', 'famille', 'maison', 'chez', 'local'],
  };

  const keywords = toneKeywords[story.tone] || [];
  if (keywords.length === 0) return 0.7;

  const allText = story.panels.map(p => p.text.toLowerCase()).join(' ');
  const matches = keywords.filter(kw => allText.includes(kw)).length;

  return Math.min(1, 0.5 + (matches / keywords.length) * 0.5);
}

// ============================================================================
// LOCATION LOGIC
// ============================================================================

function scoreLocationLogic(story: GeneratedStory): number {
  let score = 0;
  let total = 0;

  for (const panel of story.panels) {
    total++;
    if (panel.narrativeFunction === 'call_received' || panel.narrativeFunction === 'scheduling') {
      score += panel.location === 'bureau' ? 1 : 0;
    } else if (panel.narrativeFunction === 'technician_arrival') {
      score += panel.location === 'exterieur' ? 1 : 0.5;
    } else if (panel.narrativeFunction === 'cta_moral') {
      score += 1; // Always OK
    } else {
      score += 0.8; // Default OK for room-based panels
    }
  }

  return total > 0 ? score / total : 1;
}

// ============================================================================
// TEXT VARIETY
// ============================================================================

function scoreTextVariety(story: GeneratedStory): number {
  const texts = story.panels.map(p => p.text);
  const unique = new Set(texts).size;
  return unique / texts.length;
}

// ============================================================================
// MAIN — scoreStory
// ============================================================================

export function scoreStory(story: GeneratedStory): CoherenceScore {
  const narrativeFlow = scoreNarrativeFlow(story);
  const characterConsistency = scoreCharacterConsistency(story);
  const toneConsistency = scoreToneConsistency(story);
  const locationLogic = scoreLocationLogic(story);
  const textVariety = scoreTextVariety(story);

  const weights = { flow: 3, char: 3, tone: 2, loc: 2, text: 2 };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const total = (
    narrativeFlow * weights.flow +
    characterConsistency * weights.char +
    toneConsistency * weights.tone +
    locationLogic * weights.loc +
    textVariety * weights.text
  ) / totalWeight;

  return { narrativeFlow, characterConsistency, toneConsistency, locationLogic, textVariety, total };
}
