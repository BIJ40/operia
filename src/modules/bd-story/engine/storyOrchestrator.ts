/**
 * BD Story — Main Orchestrator
 * Pipeline complet : Selection → Compose → Copy → Validate → Score → Diversity → Visual
 */

import { AtomUsageState, BdStoryGenerationInput, BdStoryGenerationOutput, GeneratedStory, ProblemUniverse } from '../types/bdStory.types';
import { generateSelection } from './selectionEngine';
import { composeSkeleton, assembleStory, buildOutput } from './storyComposer';
import { fillPanelTexts } from './copyEngine';
import { validateStory, getBlockingIssues } from './ruleValidator';
import { scoreStory } from './scoringEngine';
import { scoreDiversity, isDiversityAcceptable } from './diversityEngine';
import { generateBoardPrompt, fillVisualPrompts } from './visualPromptEngine';

// ============================================================================
// CONFIG
// ============================================================================

const MAX_GENERATION_ATTEMPTS = 5;
const EMPTY_BATCH_COUNTS: Record<ProblemUniverse, number> = {
  plomberie: 0,
  electricite: 0,
  serrurerie: 0,
  vitrerie: 0,
  menuiserie: 0,
  peinture_renovation: 0,
};

// ============================================================================
// GENERATE ONE STORY
// ============================================================================

export function generateStory(
  input: BdStoryGenerationInput,
  recentStories: GeneratedStory[] = []
): BdStoryGenerationOutput {
  let bestResult: BdStoryGenerationOutput | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    // 1. Selection
    const selection = generateSelection(input);

    // 2. Compose skeleton
    const skeleton = composeSkeleton(selection);

    // 3. Fill texts
    const panelsWithText = fillPanelTexts(skeleton, selection, input.atomUsageState);

    // 4. Assemble story
    let story = assembleStory(selection, panelsWithText, input);

    // 5. Validate
    const validation = validateStory(story);
    story = { ...story, validation };

    // If blocking issues, retry
    if (getBlockingIssues(validation).length > 0) continue;

    // 6. Score coherence
    const coherence = scoreStory(story);

    // 7. Score diversity
    const diversity = scoreDiversity(story, recentStories);
    story = { ...story, diversityScore: diversity };

    // If too similar, retry
    if (!isDiversityAcceptable(diversity) && attempt < MAX_GENERATION_ATTEMPTS - 1) continue;

    // 8. Fill visual prompts
    story = fillVisualPrompts(story);

    // 9. Generate board prompt
    const boardPrompt = generateBoardPrompt(story);

    const totalScore = coherence.total * 0.6 + (1 - diversity.totalScore) * 0.4;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestResult = buildOutput(story, boardPrompt);
    }

    // Good enough
    if (totalScore >= 0.8) break;
  }

  if (!bestResult) {
    // Emergency fallback — generate without diversity checks
    const selection = generateSelection(input);
    const skeleton = composeSkeleton(selection);
    const panelsWithText = fillPanelTexts(skeleton, selection, input.atomUsageState);
    let story = assembleStory(selection, panelsWithText, input);
    story = fillVisualPrompts(story);
    story = { ...story, validation: validateStory(story) };
    const boardPrompt = generateBoardPrompt(story);
    bestResult = buildOutput(story, boardPrompt);
  }

  return bestResult;
}

// ============================================================================
// GENERATE BATCH
// ============================================================================

export function generateBatch(
  inputs: BdStoryGenerationInput[],
  existingStories: GeneratedStory[] = []
): BdStoryGenerationOutput[] {
  const results: BdStoryGenerationOutput[] = [];
  const accumulated = [...existingStories];
  const batchCounts: Record<ProblemUniverse, number> = { ...EMPTY_BATCH_COUNTS };
  const atomUsageState: AtomUsageState = { atomUsageCount: {}, recentAtomTexts: [] };

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const enrichedInput: BdStoryGenerationInput = {
      ...input,
      batchState: {
        generatedCount: i,
        countsByUniverse: { ...batchCounts },
        targetSize: inputs.length,
      },
      atomUsageState,
    };

    const result = generateStory(enrichedInput, accumulated);
    results.push(result);
    accumulated.push(result.story);
    batchCounts[result.story.universe] = (batchCounts[result.story.universe] || 0) + 1;
  }

  return results;
}
