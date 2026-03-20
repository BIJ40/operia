/**
 * BD Story — Panel Render Plan Engine
 * Transforms story JSON panels into visual render briefs for image generation
 */

import { GeneratedStory, GeneratedPanel, NarrativeFunction } from '../types/bdStory.types';
import { BD_STORY_CHARACTERS } from '../data/characters';

// ============================================================================
// TYPES
// ============================================================================

export interface CharacterPlacement {
  slug: string;
  placement: 'left' | 'center' | 'right' | 'background';
  expression: string;
  outfit?: string;
}

export interface EnvironmentBrief {
  room: string;
  mood: string;
  lighting: string;
  weatherHint?: string;
  timeOfDay: string;
}

export interface PanelRenderPlan {
  panelNumber: number;
  imagePrompt: string;
  speechBubbleText: string;
  captionText: string | null;
  cameraAngle: string;
  shotSize: string;
  expressionNotes: string;
  continuityNotes: string[];
  characters: CharacterPlacement[];
  environment: EnvironmentBrief;
  colorNotes: string;
  forbiddenElements: string[];
}

// ============================================================================
// EXPRESSION MAPPING
// ============================================================================

const EXPRESSION_BY_FUNCTION: Record<NarrativeFunction, string> = {
  client_setup: 'neutral, relaxed',
  client_context: 'normal, everyday',
  problem_appears: 'surprised, concerned',
  problem_worsens: 'worried, stressed',
  decision_to_call: 'determined, relieved',
  call_received: 'professional, attentive, warm smile',
  scheduling: 'focused, organized',
  technician_arrival: 'confident, professional',
  inspection_diagnosis: 'concentrated, analytical',
  repair_action: 'focused, skilled',
  result_visible: 'satisfied, proud',
  cta_moral: 'warm, inviting',
};

const CAMERA_BY_FUNCTION: Record<NarrativeFunction, { angle: string; shot: string }> = {
  client_setup: { angle: 'eye level', shot: 'medium' },
  client_context: { angle: 'slightly high', shot: 'wide' },
  problem_appears: { angle: 'eye level', shot: 'medium close' },
  problem_worsens: { angle: 'close', shot: 'close-up' },
  decision_to_call: { angle: 'eye level', shot: 'medium' },
  call_received: { angle: 'eye level', shot: 'medium' },
  scheduling: { angle: 'over shoulder', shot: 'medium' },
  technician_arrival: { angle: 'low angle', shot: 'wide' },
  inspection_diagnosis: { angle: 'eye level', shot: 'medium close' },
  repair_action: { angle: 'detail', shot: 'close-up' },
  result_visible: { angle: 'eye level', shot: 'medium' },
  cta_moral: { angle: 'front facing', shot: 'wide' },
};

// ============================================================================
// CHARACTER DESCRIPTION FOR PROMPTS
// ============================================================================

function buildCharacterDescription(slug: string): string {
  const char = BD_STORY_CHARACTERS.find(c => c.slug === slug);
  if (!char) {
    if (slug === 'client') return 'French homeowner, casual everyday clothes';
    return slug;
  }
  const vi = char.visualIdentity;
  const parts = [
    char.firstName,
    `(${char.role})`,
    `hair: ${vi.hair}`,
    `build: ${vi.silhouette}`,
    `wearing: ${vi.clothes}`,
    ...vi.facialTraits.map(t => t),
  ];
  return parts.join(', ');
}

function getCharacterPlacement(actors: string[], narrativeFunction: NarrativeFunction): CharacterPlacement[] {
  const expression = EXPRESSION_BY_FUNCTION[narrativeFunction] || 'neutral';
  
  if (actors.length === 0) return [];
  if (actors.length === 1) {
    return [{ slug: actors[0], placement: 'center', expression }];
  }
  
  const placements: ('left' | 'right' | 'center')[] = ['left', 'right', 'center'];
  return actors.map((slug, i) => ({
    slug,
    placement: placements[i] || 'background',
    expression: slug === 'client'
      ? expression
      : (narrativeFunction === 'call_received' ? 'professional, smiling' : expression),
  }));
}

// ============================================================================
// ENVIRONMENT
// ============================================================================

function buildEnvironment(story: GeneratedStory, panelLocation: string): EnvironmentBrief {
  const ctx = story.locationContext;
  const timeMap: Record<string, string> = {
    matin: 'morning', midi: 'midday', apres_midi: 'afternoon',
    soir: 'evening', nuit: 'night',
  };
  const moodMap: Record<string, string> = {
    calme: 'calm', stressant: 'tense', urgence: 'urgent',
    cosy: 'cozy', degrade: 'worn', lumineux: 'bright', sombre: 'dark',
  };

  if (panelLocation === 'bureau') {
    return {
      room: 'professional office with desk, phone, computer',
      mood: 'clean, organized, professional',
      lighting: 'bright office lighting',
      timeOfDay: timeMap[ctx.time] || 'daytime',
    };
  }

  return {
    room: `${ctx.room.replace(/_/g, ' ')} in a ${ctx.propertyType.replace(/_/g, ' ')}`,
    mood: moodMap[ctx.visualMood || 'calme'] || 'neutral',
    lighting: ctx.time === 'soir' || ctx.time === 'nuit' ? 'warm indoor' : 'natural daylight',
    weatherHint: ctx.weather,
    timeOfDay: timeMap[ctx.time] || 'daytime',
  };
}

// ============================================================================
// MAIN: GENERATE PANEL RENDER PLAN
// ============================================================================

export function generatePanelRenderPlan(panel: GeneratedPanel, story: GeneratedStory): PanelRenderPlan {
  const camera = CAMERA_BY_FUNCTION[panel.narrativeFunction] || { angle: 'eye level', shot: 'medium' };
  const characters = getCharacterPlacement(panel.actors, panel.narrativeFunction);
  const environment = buildEnvironment(story, panel.location);
  const expression = EXPRESSION_BY_FUNCTION[panel.narrativeFunction] || 'neutral';

  // Build continuity notes
  const continuityNotes: string[] = [
    'same client appearance across all panels',
    'same house interior style and palette',
  ];
  const techSlug = story.assignedCharacters.technician;
  const techChar = BD_STORY_CHARACTERS.find(c => c.slug === techSlug);
  if (techChar && panel.actors.includes(techSlug)) {
    continuityNotes.push(`${techChar.firstName} must look identical to reference photos`);
    continuityNotes.push(`${techChar.firstName} wears HelpConfort branded work clothes`);
  }
  if (panel.actors.includes('amandine')) {
    continuityNotes.push('Amandine is at office desk, never on site');
  }

  // Forbidden elements
  const forbiddenElements: string[] = [
    'text or letters in the image',
    'speech bubbles in the generated image',
    'logos or watermarks',
  ];
  if (panel.narrativeFunction !== 'cta_moral') {
    forbiddenElements.push('promotional text');
  }

  // Build the full image prompt
  const charDescriptions = characters.map(c => 
    `${buildCharacterDescription(c.slug)} (${c.placement}, ${c.expression})`
  ).join('; ');

  const imagePrompt = [
    `Comic panel ${panel.number}/12, Franco-Belgian style comic book illustration.`,
    `Camera: ${camera.angle}, ${camera.shot}.`,
    charDescriptions ? `Characters: ${charDescriptions}.` : '',
    `Setting: ${environment.room}, ${environment.mood} atmosphere, ${environment.lighting}.`,
    `Time: ${environment.timeOfDay}.`,
    `Style: Clean line art, warm professional colors, expressive faces, readable composition.`,
    `HelpConfort brand colors (blue, white). Professional service company.`,
    `NO text, NO speech bubbles, NO watermarks in the image.`,
  ].filter(Boolean).join(' ');

  // Color notes based on universe
  const universeColors: Record<string, string> = {
    plomberie: 'blues and water tones',
    electricite: 'warm yellows and safety orange',
    serrurerie: 'metallic grays and deep blues',
    vitrerie: 'glass greens and light blues',
    menuiserie: 'warm wood browns and earth tones',
    peinture_renovation: 'fresh whites and accent colors',
  };

  return {
    panelNumber: panel.number,
    imagePrompt,
    speechBubbleText: panel.text,
    captionText: panel.narrativeFunction === 'cta_moral' ? story.ctaText : null,
    cameraAngle: camera.angle,
    shotSize: camera.shot,
    expressionNotes: expression,
    continuityNotes,
    characters,
    environment,
    colorNotes: universeColors[story.universe] || 'warm professional tones',
    forbiddenElements,
  };
}

/**
 * Generate all 12 panel render plans for a full story
 */
export function generateFullRenderPlan(story: GeneratedStory): PanelRenderPlan[] {
  return story.panels.map(panel => generatePanelRenderPlan(panel, story));
}
