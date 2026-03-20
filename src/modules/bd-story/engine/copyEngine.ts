/**
 * BD Story — Copy Engine
 * Remplit les textes de chaque case à partir du squelette
 * Inclut un audit de couverture interne
 */

import { GeneratedPanel, NarrativeFunction, ProblemUniverse, UrgencyLevel } from '../types/bdStory.types';
import { getTextAtoms, getTextAtomsCount } from '../data/textAtoms';
import { StorySelection } from './selectionEngine';

// ============================================================================
// HELPERS
// ============================================================================

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// TEXT SELECTION — cascading fallback
// ============================================================================

function findText(
  narrativeFunction: NarrativeFunction,
  universe: ProblemUniverse,
  tone: 'rassurant' | 'pedagogique' | 'reactif' | 'proximite',
  urgencyLevel: UrgencyLevel,
  usedTexts: Set<string>
): string {
  // Level 1: exact match (universe + function + tone + urgency)
  let candidates = getTextAtoms(narrativeFunction, universe)
    .filter(a => a.tone === tone && a.urgencyLevel === urgencyLevel && !usedTexts.has(a.text));

  // Level 2: universe + function + tone (any urgency)
  if (candidates.length === 0) {
    candidates = getTextAtoms(narrativeFunction, universe)
      .filter(a => a.tone === tone && !usedTexts.has(a.text));
  }

  // Level 3: universe + function (any tone)
  if (candidates.length === 0) {
    candidates = getTextAtoms(narrativeFunction, universe)
      .filter(a => !usedTexts.has(a.text));
  }

  // Level 4: general + function + tone
  if (candidates.length === 0) {
    candidates = getTextAtoms(narrativeFunction, 'general' as any)
      .filter(a => a.tone === tone && !usedTexts.has(a.text));
  }

  // Level 5: general + function (any)
  if (candidates.length === 0) {
    candidates = getTextAtoms(narrativeFunction, 'general' as any)
      .filter(a => !usedTexts.has(a.text));
  }

  // Level 6: allow repeats
  if (candidates.length === 0) {
    candidates = getTextAtoms(narrativeFunction, universe);
    if (candidates.length === 0) {
      candidates = getTextAtoms(narrativeFunction, 'general' as any);
    }
  }

  if (candidates.length === 0) {
    return '…'; // Ultimate fallback
  }

  const selected = pickRandom(candidates);
  return selected.text;
}

// ============================================================================
// CTA TEXT (case 12 — always from selection)
// ============================================================================

function getCtaText(selection: StorySelection): string {
  return selection.cta.text;
}

// ============================================================================
// MAIN — fillPanelTexts
// ============================================================================

export function fillPanelTexts(
  panels: GeneratedPanel[],
  selection: StorySelection
): GeneratedPanel[] {
  const usedTexts = new Set<string>();

  return panels.map(panel => {
    let text: string;

    if (panel.narrativeFunction === 'cta_moral') {
      text = getCtaText(selection);
    } else {
      text = findText(
        panel.narrativeFunction,
        selection.problem.universe,
        selection.tone,
        selection.problem.urgencyLevel,
        usedTexts
      );
    }

    usedTexts.add(text);

    return { ...panel, text };
  });
}

// ============================================================================
// COVERAGE AUDIT
// ============================================================================

export interface CoverageReport {
  totalAtoms: number;
  coveredCombinations: number;
  totalPossibleCombinations: number;
  coveragePercent: number;
  gaps: CoverageGap[];
}

export interface CoverageGap {
  universe: string;
  narrativeFunction: string;
  tone?: string;
  urgencyLevel?: string;
  available: number;
}

const ALL_TONES = ['rassurant', 'pedagogique', 'reactif', 'proximite'] as const;
const ALL_URGENCIES: UrgencyLevel[] = ['faible', 'moyenne', 'forte'];
const ALL_FUNCTIONS: NarrativeFunction[] = [
  'client_setup', 'client_context', 'problem_appears', 'problem_worsens',
  'decision_to_call', 'call_received', 'scheduling', 'technician_arrival',
  'inspection_diagnosis', 'repair_action', 'result_visible', 'cta_moral'
];
const ALL_UNIVERSES = ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'peinture_renovation', 'general'];

export function auditCoverage(): CoverageReport {
  const gaps: CoverageGap[] = [];
  let covered = 0;
  let total = 0;
  const totalAtoms = getTextAtomsCount();

  for (const universe of ALL_UNIVERSES) {
    for (const func of ALL_FUNCTIONS) {
      // Skip cta_moral — always from CTA list
      if (func === 'cta_moral') continue;

      const atoms = getTextAtoms(func, universe as any);
      
      for (const tone of ALL_TONES) {
        total++;
        const toneAtoms = atoms.filter(a => a.tone === tone || !a.tone);
        
        if (toneAtoms.length >= 2) {
          covered++;
        } else {
          gaps.push({
            universe,
            narrativeFunction: func,
            tone,
            available: toneAtoms.length,
          });
        }
      }
    }
  }

  return {
    totalAtoms,
    coveredCombinations: covered,
    totalPossibleCombinations: total,
    coveragePercent: Math.round((covered / total) * 100),
    gaps: gaps.filter(g => g.available === 0), // Only show zero-coverage
  };
}
