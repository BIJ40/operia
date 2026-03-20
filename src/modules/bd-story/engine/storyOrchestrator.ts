/**
 * BD Story — Main Orchestrator
 * Pipeline complet : Selection → Compose → Copy → Validate → Score → Diversity → Visual
 */

import { BdStoryGenerationInput, BdStoryGenerationOutput, GeneratedStory } from '../types/bdStory.types';
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
    const panelsWithText = fillPanelTexts(skeleton, selection);

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
    const panelsWithText = fillPanelTexts(skeleton, selection);
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

  for (const input of inputs) {
    const result = generateStory(input, accumulated);
    results.push(result);
    accumulated.push(result.story);
  }

  return results;
}
