/**
 * BD Story — Story Composer
 * Transforme une StorySelection en squelette de 12 cases (GeneratedPanel[])
 */

import {
  GeneratedPanel, GeneratedStory, NarrativeFunction,
  BdStoryGenerationInput, BdStoryGenerationOutput
} from '../types/bdStory.types';
import { StorySelection } from './selectionEngine';

// ============================================================================
// SHOT TYPE LOGIC
// ============================================================================

function getShotType(narrativeFunction: NarrativeFunction, panelNumber: number): GeneratedPanel['shotType'] {
  switch (narrativeFunction) {
    case 'client_setup': return 'wide';
    case 'client_context': return 'medium';
    case 'problem_appears': return 'close';
    case 'problem_worsens': return 'detail';
    case 'decision_to_call': return 'medium';
    case 'call_received': return 'medium';
    case 'scheduling': return 'medium';
    case 'technician_arrival': return 'wide';
    case 'inspection_diagnosis': return 'close';
    case 'repair_action': return 'detail';
    case 'result_visible': return panelNumber >= 11 ? 'wide' : 'medium';
    case 'cta_moral': return 'wide';
    default: return 'medium';
  }
}

// ============================================================================
// ACTOR RESOLUTION
// ============================================================================

function resolveActors(
  allowedActors: string[],
  selection: StorySelection
): string[] {
  return allowedActors.map(actor => {
    switch (actor) {
      case 'client': return 'client';
      case 'assistante': return selection.assistante.slug;
      case 'technicien': return selection.technician.slug;
      case 'dirigeant': return 'jerome';
      case 'commercial': return 'sebastien';
      default: return actor;
    }
  });
}

// ============================================================================
// LOCATION RESOLUTION
// ============================================================================

function resolveLocation(
  allowedLocations: string[],
  selection: StorySelection,
  narrativeFunction: NarrativeFunction
): string {
  if (narrativeFunction === 'call_received' || narrativeFunction === 'scheduling') {
    return 'bureau';
  }
  if (narrativeFunction === 'technician_arrival') {
    return 'exterieur';
  }
  if (narrativeFunction === 'cta_moral') {
    return 'general';
  }
  // Default to room from location context
  return selection.location.room;
}

// ============================================================================
// COMPOSE SKELETON
// ============================================================================

export function composeSkeleton(selection: StorySelection): GeneratedPanel[] {
  const { template } = selection;

  return template.panelRules.map(rule => {
    const actors = resolveActors(rule.allowedActors, selection);
    const location = resolveLocation(rule.allowedLocations, selection, rule.narrativeFunction);
    const shotType = getShotType(rule.narrativeFunction, rule.panelNumber);

    return {
      number: rule.panelNumber,
      narrativeFunction: rule.narrativeFunction,
      text: '', // Will be filled by copyEngine
      actors,
      location,
      visualPrompt: '', // Will be filled by visualPromptEngine
      shotType,
    };
  });
}

// ============================================================================
// ASSEMBLE FULL STORY
// ============================================================================

export function assembleStory(
  selection: StorySelection,
  panels: GeneratedPanel[],
  input: BdStoryGenerationInput
): GeneratedStory {
  const storyKey = [
    selection.problem.slug,
    selection.template.key,
    selection.technician.slug,
    selection.clientProfile.slug,
    selection.location.room,
  ].join('_');

  const id = `story_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    storyKey,
    title: `${selection.problem.label} — ${selection.template.label}`,
    summary: `${selection.clientProfile.label} fait face à ${selection.problem.label.toLowerCase()}. ${selection.technician.firstName} intervient.`,
    universe: selection.problem.universe,
    storyFamily: selection.template.storyFamily,
    templateKey: selection.template.key,
    problemSlug: selection.problem.slug,
    locationContext: selection.location,
    clientProfileSlug: selection.clientProfile.slug,
    triggerSlug: selection.trigger.slug,
    assignedCharacters: {
      clientProfile: selection.clientProfile.slug,
      assistante: selection.assistante.slug,
      technician: selection.technician.slug,
    },
    panels,
    outcomeSlugs: selection.outcomes.map(o => o.slug),
    ctaText: selection.cta.text,
    tone: selection.tone,
    visualPack: {
      styleSeed: `seed_${id}`,
      palette: selection.location.visualMood === 'urgence' ? 'warm_alert' : 'neutral_comfort',
      lighting: selection.location.time === 'nuit' || selection.location.time === 'soir' ? 'low_warm' : 'natural_daylight',
      weather: selection.location.weather,
    },
    diversityFingerprint: [
      selection.problem.universe,
      selection.problem.slug,
      selection.template.key,
      selection.technician.slug,
      selection.clientProfile.slug,
      selection.location.room,
      selection.cta.mode,
      selection.tone,
    ],
    diversityScore: {
      sameProblemType: 0,
      sameStoryFamily: 0,
      sameTechnician: 0,
      sameLocation: 0,
      sameOutcomeType: 0,
      sameCta: 0,
      totalScore: 0,
    },
    validation: { isValid: true, issues: [] },
    campaignMode: input.campaignMode,
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// FULL OUTPUT
// ============================================================================

export function buildOutput(story: GeneratedStory, boardPrompt: string): BdStoryGenerationOutput {
  return { story, boardPromptMaster: boardPrompt };
}
