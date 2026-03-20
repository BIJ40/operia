/**
 * BD Story — Panel Render Plan Engine
 * Transforms story JSON panels into visual render briefs for image generation
 */

import { GeneratedStory, GeneratedPanel, NarrativeFunction, ProblemUniverse } from '../types/bdStory.types';
import { BD_STORY_CHARACTERS } from '../data/characters';

// ============================================================================
// TYPES
// ============================================================================

export type BubbleSafeZone = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

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

export interface CompositionRules {
  bubbleSafeZone: BubbleSafeZone;
  subjectSafeZone: 'center' | 'left' | 'right';
  mustLeaveNegativeSpace: boolean;
  negativeSpacePosition: 'top' | 'bottom';
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
  composition: CompositionRules;
}

// ============================================================================
// DOMAIN CONSTRAINTS — VISUAL LOCK PER UNIVERSE
// ============================================================================

interface DomainConstraint {
  /** Elements that MUST appear in scenes involving the problem/repair */
  requiredElements: string[];
  /** Elements that must NEVER appear — prevents cross-universe drift */
  forbiddenElements: string[];
  /** Tools/equipment the technician should use */
  tools: string[];
  /** Short domain lock instruction injected into every prompt */
  domainLock: string;
  /** Specific visual actions per narrative function */
  actionsByFunction: Partial<Record<NarrativeFunction, string>>;
}

const DOMAIN_CONSTRAINTS: Record<ProblemUniverse, DomainConstraint> = {
  plomberie: {
    requiredElements: [
      'pipes', 'faucet', 'sink', 'water', 'drain', 'water heater',
      'water drops', 'puddle', 'wet floor', 'plumbing fixtures',
    ],
    forbiddenElements: [
      'electrical panel', 'circuit breaker', 'wires', 'electrical cables',
      'window glass pane', 'glass cutting', 'door lock', 'key',
      'paint roller', 'paint bucket', 'wallpaper',
    ],
    tools: [
      'wrench', 'pipe wrench', 'pliers', 'Teflon tape', 'sealant',
      'pipe cutter', 'bucket', 'flashlight',
    ],
    domainLock: 'STRICT DOMAIN: plumbing repair ONLY. Scene MUST show water/pipes/faucets. NEVER show electrical panels, window glass, locks, or paint.',
    actionsByFunction: {
      problem_appears: 'water dripping from a pipe or faucet, visible water drops',
      problem_worsens: 'water spreading on floor, puddle growing, cabinet getting wet',
      inspection_diagnosis: 'technician examining pipes under sink with flashlight, checking joints',
      repair_action: 'technician tightening pipe joint with wrench, replacing washer or seal',
      result_visible: 'dry clean area, repaired pipe, no more water dripping',
    },
  },
  electricite: {
    requiredElements: [
      'electrical panel', 'circuit breaker', 'light switch', 'power outlet',
      'light fixture', 'electrical cables', 'fuse box',
    ],
    forbiddenElements: [
      'water pipes', 'faucet', 'plumbing', 'puddle',
      'window glass', 'glass pane', 'door lock', 'key',
      'paint roller', 'paint brush', 'wallpaper',
    ],
    tools: [
      'multimeter', 'voltage tester', 'screwdriver', 'wire strippers',
      'insulated gloves', 'headlamp', 'electrical tape',
    ],
    domainLock: 'STRICT DOMAIN: electrical repair ONLY. Scene MUST show switches/outlets/circuit breakers. NEVER show water pipes, glass windows, locks, or paint.',
    actionsByFunction: {
      problem_appears: 'light flickering or power outlet sparking slightly',
      problem_worsens: 'lights going out, circuit breaker tripping, darkness in room',
      inspection_diagnosis: 'technician testing outlets with multimeter, examining circuit breaker panel',
      repair_action: 'technician replacing circuit breaker or rewiring an outlet with insulated tools',
      result_visible: 'lights back on, electrical panel properly closed, power restored',
    },
  },
  serrurerie: {
    requiredElements: [
      'door', 'door lock', 'key', 'door handle', 'cylinder lock',
      'deadbolt', 'door frame', 'lock mechanism',
    ],
    forbiddenElements: [
      'water pipes', 'faucet', 'plumbing',
      'electrical panel', 'circuit breaker', 'wires',
      'window glass pane', 'glass cutting',
      'paint roller', 'paint brush',
    ],
    tools: [
      'lock pick set', 'drill', 'new cylinder', 'screwdriver set',
      'key blank', 'lubricant spray',
    ],
    domainLock: 'STRICT DOMAIN: locksmith / door lock repair ONLY. Scene MUST show doors/locks/keys. NEVER show water pipes, electrical panels, windows, or paint.',
    actionsByFunction: {
      problem_appears: 'key stuck in lock or door not closing properly',
      problem_worsens: 'key broken in lock, person locked out, door jammed',
      inspection_diagnosis: 'technician examining door lock mechanism closely',
      repair_action: 'technician replacing door cylinder lock, installing new lock mechanism',
      result_visible: 'door opening smoothly with new key, lock working perfectly',
    },
  },
  vitrerie: {
    requiredElements: [
      'window', 'glass pane', 'window frame', 'glass',
      'cracked glass', 'window sill', 'double glazing',
    ],
    forbiddenElements: [
      'electrical panel', 'circuit breaker', 'wires', 'electrical cables',
      'water pipes', 'faucet', 'plumbing', 'puddle',
      'door lock', 'key', 'deadbolt',
      'paint roller', 'paint brush', 'wallpaper',
    ],
    tools: [
      'suction cup lifter', 'glass cutter', 'protective gloves',
      'sealant gun', 'glazing points', 'putty knife', 'measuring tape',
    ],
    domainLock: 'STRICT DOMAIN: glass/window repair ONLY. Scene MUST show windows, glass panes, or window frames. NEVER show electrical panels, plumbing pipes, door locks, or paint equipment.',
    actionsByFunction: {
      problem_appears: 'visible crack spreading across a window glass pane',
      problem_worsens: 'crack widening on glass, cold air coming through broken window',
      inspection_diagnosis: 'technician inspecting cracked window glass, measuring the glass pane dimensions',
      repair_action: 'technician removing broken glass pane with suction cups, installing new glass into window frame',
      result_visible: 'brand new clear glass pane in window frame, clean transparent window',
    },
  },
  menuiserie: {
    requiredElements: [
      'wooden shutter', 'wooden door', 'wood', 'hinge',
      'shutter rail', 'window shutter', 'wood panel', 'door frame',
    ],
    forbiddenElements: [
      'electrical panel', 'circuit breaker', 'wires',
      'water pipes', 'faucet', 'plumbing',
      'glass cutting', 'glass cutter',
      'paint roller in use', 'large paint bucket',
    ],
    tools: [
      'chisel', 'wood plane', 'screwdriver', 'drill',
      'wood glue', 'clamps', 'sandpaper', 'measuring tape',
    ],
    domainLock: 'STRICT DOMAIN: woodwork / shutter / door carpentry ONLY. Scene MUST show wooden elements (shutters, doors, frames). NEVER show electrical work, plumbing, or glass cutting.',
    actionsByFunction: {
      problem_appears: 'wooden shutter stuck or door not closing properly, visible wood damage',
      problem_worsens: 'shutter hanging at angle, wood swollen, mechanism jammed',
      inspection_diagnosis: 'technician examining wooden shutter rail or door hinge, checking wood condition',
      repair_action: 'technician planing wood, adjusting shutter mechanism, replacing hinge',
      result_visible: 'shutter opening and closing smoothly, door properly aligned',
    },
  },
  peinture_renovation: {
    requiredElements: [
      'wall', 'painted surface', 'ceiling', 'plaster',
      'wall crack', 'peeling paint', 'fresh paint',
    ],
    forbiddenElements: [
      'electrical panel', 'circuit breaker', 'wires',
      'water pipes', 'faucet', 'heavy plumbing',
      'door lock mechanism', 'key cutting',
      'glass cutting', 'glass cutter',
    ],
    tools: [
      'paint roller', 'paint brush', 'masking tape', 'drop cloth',
      'putty knife', 'sanding block', 'paint tray', 'filler compound',
    ],
    domainLock: 'STRICT DOMAIN: painting / wall renovation ONLY. Scene MUST show walls, ceilings, or painted surfaces. NEVER show electrical panels, heavy plumbing, lock mechanisms, or glass cutting.',
    actionsByFunction: {
      problem_appears: 'paint peeling off wall or water stain on ceiling visible',
      problem_worsens: 'larger area of damaged paint, plaster crumbling, stain growing',
      inspection_diagnosis: 'technician examining wall damage, testing plaster solidity with putty knife',
      repair_action: 'technician applying filler to wall, rolling fresh paint with roller, using masking tape',
      result_visible: 'freshly painted smooth wall, clean bright surface, renovation complete',
    },
  },
};

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
// COMPOSITION & SAFE ZONES
// ============================================================================

function getCompositionRules(panelNumber: number, narrativeFunction: NarrativeFunction): CompositionRules {
  const row = Math.ceil(panelNumber / 3);
  const col = ((panelNumber - 1) % 3);

  const verticalPos = (row % 2 === 1) ? 'bottom' : 'top';
  const horizontalPos = (['left', 'center', 'right'] as const)[col];

  const bubbleSafeZone: BubbleSafeZone = `${verticalPos}-${horizontalPos}`;

  const subjectSafeZone: 'center' | 'left' | 'right' =
    narrativeFunction === 'repair_action' || narrativeFunction === 'inspection_diagnosis'
      ? 'center'
      : horizontalPos === 'left' ? 'right'
      : horizontalPos === 'right' ? 'left'
      : 'center';

  const needsSpace = narrativeFunction !== 'repair_action' && narrativeFunction !== 'problem_worsens';

  return {
    bubbleSafeZone,
    subjectSafeZone,
    mustLeaveNegativeSpace: needsSpace,
    negativeSpacePosition: verticalPos,
  };
}

// ============================================================================
// CHARACTER DESCRIPTION FOR PROMPTS
// ============================================================================

function buildCharacterDescription(slug: string, isMainCharacter: boolean = false): string {
  const char = BD_STORY_CHARACTERS.find(c => c.slug === slug);
  if (!char) {
    if (slug === 'client') return 'French homeowner, casual everyday clothes, expressive face';
    return slug;
  }

  const vi = char.visualIdentity;
  const parts: string[] = [];

  parts.push(`${char.firstName}`);
  parts.push(`(${char.role})`);
  parts.push(`${vi.hair} hair`);
  parts.push(`${vi.silhouette} build`);

  if (vi.facialTraits.length > 0) {
    parts.push(vi.facialTraits.join(', '));
  }

  parts.push(`wearing ${vi.clothes}`);

  if (vi.accessories.length > 0) {
    parts.push(`accessories: ${vi.accessories.join(', ')}`);
  }

  if (isMainCharacter) {
    parts.push('MUST maintain exact same facial features and body proportions across all panels');
  }

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
// DOMAIN-SPECIFIC PROMPT BUILDER
// ============================================================================

function buildDomainPromptLines(
  universe: ProblemUniverse,
  narrativeFunction: NarrativeFunction,
): { domainLine: string; actionLine: string; toolsLine: string } {
  const dc = DOMAIN_CONSTRAINTS[universe];

  const domainLine = dc.domainLock;

  // Get action-specific description if available
  const specificAction = dc.actionsByFunction[narrativeFunction];
  const actionLine = specificAction
    ? `SCENE ACTION: ${specificAction}.`
    : '';

  // Only show tools for technical panels
  const technicalFunctions: NarrativeFunction[] = [
    'inspection_diagnosis', 'repair_action', 'technician_arrival', 'result_visible',
  ];
  const toolsLine = technicalFunctions.includes(narrativeFunction) && dc.tools.length > 0
    ? `TOOLS IN SCENE: ${dc.tools.slice(0, 3).join(', ')}.`
    : '';

  return { domainLine, actionLine, toolsLine };
}

// ============================================================================
// MAIN: GENERATE PANEL RENDER PLAN
// ============================================================================

export function generatePanelRenderPlan(panel: GeneratedPanel, story: GeneratedStory): PanelRenderPlan {
  const camera = CAMERA_BY_FUNCTION[panel.narrativeFunction] || { angle: 'eye level', shot: 'medium' };
  const characters = getCharacterPlacement(panel.actors, panel.narrativeFunction);
  const environment = buildEnvironment(story, panel.location);
  const expression = EXPRESSION_BY_FUNCTION[panel.narrativeFunction] || 'neutral';
  const composition = getCompositionRules(panel.number, panel.narrativeFunction);

  const techSlug = story.assignedCharacters.technician;
  const mainSlugs = new Set([techSlug, 'amandine']);

  // Domain constraints for this universe
  const dc = DOMAIN_CONSTRAINTS[story.universe];
  const { domainLine, actionLine, toolsLine } = buildDomainPromptLines(
    story.universe,
    panel.narrativeFunction,
  );

  // Build continuity notes
  const continuityNotes: string[] = [
    'CRITICAL: same client appearance (face, hair, clothes) across ALL 12 panels',
    'CRITICAL: same house interior style, wall colors, furniture across ALL panels',
    `This is panel ${panel.number} of 12 — visual consistency is paramount`,
    `DOMAIN: ${story.universe} — every panel must stay within this trade domain`,
  ];

  // Add required element continuity
  const requiredForContinuity = dc.requiredElements.slice(0, 3);
  continuityNotes.push(
    `Same ${requiredForContinuity.join(', ')} must appear consistently across relevant panels`,
  );

  const techChar = BD_STORY_CHARACTERS.find(c => c.slug === techSlug);
  if (techChar && panel.actors.includes(techSlug)) {
    continuityNotes.push(
      `${techChar.firstName}: ${techChar.visualIdentity.hair} hair, ${techChar.visualIdentity.silhouette} build, ${techChar.visualIdentity.facialTraits.join(', ')}`,
      `${techChar.firstName} ALWAYS wears HelpConfort branded professional work clothes`,
      `${techChar.firstName} must look IDENTICAL in every panel they appear in`,
    );
  }
  if (panel.actors.includes('amandine')) {
    const amandine = BD_STORY_CHARACTERS.find(c => c.slug === 'amandine');
    continuityNotes.push(
      'Amandine is ONLY at office desk, NEVER on site',
      amandine ? `Amandine: ${amandine.visualIdentity.hair} hair, ${amandine.visualIdentity.facialTraits.join(', ')}` : '',
    );
  }

  // Forbidden elements: base + domain-specific
  const forbiddenElements: string[] = [
    'text or letters in the image',
    'speech bubbles in the generated image',
    'logos or watermarks',
    'words or captions rendered in the illustration',
    ...dc.forbiddenElements,
  ];
  if (panel.narrativeFunction !== 'cta_moral') {
    forbiddenElements.push('promotional text');
  }

  // Build character descriptions
  const charDescriptions = characters.map(c =>
    `${buildCharacterDescription(c.slug, mainSlugs.has(c.slug))} (${c.placement}, ${c.expression})`,
  ).join('; ');

  const compositionInstruction = composition.mustLeaveNegativeSpace
    ? `COMPOSITION: Leave clear empty space at the ${composition.negativeSpacePosition} of the image for text overlay. Main subject positioned ${composition.subjectSafeZone}.`
    : `COMPOSITION: Main subject positioned ${composition.subjectSafeZone}.`;

  // === FINAL IMAGE PROMPT with domain lock ===
  const imagePrompt = [
    `Comic panel ${panel.number}/12, Franco-Belgian style comic book illustration.`,
    // DOMAIN LOCK — top priority
    domainLine,
    actionLine,
    toolsLine,
    `Camera: ${camera.angle}, ${camera.shot}.`,
    compositionInstruction,
    charDescriptions ? `Characters: ${charDescriptions}.` : '',
    `Setting: ${environment.room}, ${environment.mood} atmosphere, ${environment.lighting}.`,
    `Time: ${environment.timeOfDay}.`,
    `Style: Clean line art, warm professional colors, highly expressive faces, readable composition, consistent character design.`,
    `HelpConfort brand colors (blue, white). Professional home repair service company.`,
    `IMPORTANT: NO text, NO speech bubbles, NO watermarks, NO written words anywhere in the image.`,
    `FORBIDDEN IN THIS IMAGE: ${dc.forbiddenElements.slice(0, 5).join(', ')}.`,
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
    continuityNotes: continuityNotes.filter(Boolean),
    characters,
    environment,
    colorNotes: universeColors[story.universe] || 'warm professional tones',
    forbiddenElements,
    composition,
  };
}

/**
 * Generate all 12 panel render plans for a full story
 */
export function generateFullRenderPlan(story: GeneratedStory): PanelRenderPlan[] {
  return story.panels.map(panel => generatePanelRenderPlan(panel, story));
}
