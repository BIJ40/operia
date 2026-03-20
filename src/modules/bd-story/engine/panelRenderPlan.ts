/**
 * BD Story — Panel Render Plan Engine v3
 * Directed scene specs — every panel is an operational brief, not a literary prompt.
 * Domain-locked, character-constrained, bubble-aware.
 */

import { GeneratedStory, GeneratedPanel, NarrativeFunction, ProblemUniverse } from '../types/bdStory.types';
import { BD_STORY_CHARACTERS } from '../data/characters';

// ============================================================================
// TYPES
// ============================================================================

export type BubbleSafeZone = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type BubbleStyle = 'speech' | 'caption' | 'thought';
export type PanelType = 'context' | 'action' | 'result';
export type LocationType = 'office' | 'client_home' | 'exterior' | 'work_area';

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
  panelType: PanelType;
  imagePrompt: string;
  speechBubbleText: string;
  bubbleStyle: BubbleStyle;
  bubbleSpeaker: string | null;
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
  // Directed scene fields
  locationType: LocationType;
  primarySubject: string;
  exactAction: string;
  requiredVisibleObjects: string[];
  exactTool: string | null;
  continuityAnchor: string;
}

// ============================================================================
// DOMAIN CONSTRAINTS — VISUAL LOCK PER UNIVERSE
// ============================================================================

interface DomainConstraint {
  requiredElements: string[];
  forbiddenElements: string[];
  tools: string[];
  domainLock: string;
  /** Exact scene descriptions per narrative function */
  scenesByFunction: Partial<Record<NarrativeFunction, {
    exactAction: string;
    requiredObjects: string[];
    tool: string | null;
    cameraPlan: 'wide' | 'medium' | 'close-up' | 'detail';
  }>>;
}

const DOMAIN_CONSTRAINTS: Record<ProblemUniverse, DomainConstraint> = {
  plomberie: {
    requiredElements: ['pipes', 'faucet', 'sink', 'water', 'drain'],
    forbiddenElements: ['electrical panel', 'circuit breaker', 'wires', 'window glass pane', 'glass cutting', 'door lock', 'key', 'paint roller', 'paint bucket'],
    tools: ['wrench', 'pipe wrench', 'pliers', 'Teflon tape', 'bucket'],
    domainLock: 'STRICT DOMAIN: plumbing ONLY. MUST show water/pipes/faucets. NEVER show electrical panels, glass windows, locks, or paint.',
    scenesByFunction: {
      problem_appears: { exactAction: 'water dripping from pipe joint under sink, visible drops falling', requiredObjects: ['sink', 'pipe', 'water drops'], tool: null, cameraPlan: 'medium' },
      problem_worsens: { exactAction: 'puddle of water spreading on floor under kitchen cabinet', requiredObjects: ['puddle', 'wet floor', 'cabinet'], tool: null, cameraPlan: 'close-up' },
      inspection_diagnosis: { exactAction: 'technician kneeling under sink, examining pipe joints with flashlight', requiredObjects: ['pipe joints', 'flashlight', 'under-sink area'], tool: 'flashlight', cameraPlan: 'medium' },
      repair_action: { exactAction: 'technician tightening pipe joint with wrench, replacing seal', requiredObjects: ['wrench', 'pipe', 'new seal'], tool: 'wrench', cameraPlan: 'close-up' },
      result_visible: { exactAction: 'dry clean area under sink, repaired pipe visible, no water on floor', requiredObjects: ['clean dry floor', 'repaired pipe'], tool: null, cameraPlan: 'medium' },
    },
  },
  electricite: {
    requiredElements: ['electrical panel', 'circuit breaker', 'light switch', 'power outlet'],
    forbiddenElements: ['water pipes', 'faucet', 'plumbing', 'window glass', 'door lock', 'key', 'paint roller'],
    tools: ['multimeter', 'voltage tester', 'screwdriver', 'insulated gloves'],
    domainLock: 'STRICT DOMAIN: electrical ONLY. MUST show switches/outlets/breakers. NEVER show water pipes, glass, locks, or paint.',
    scenesByFunction: {
      problem_appears: { exactAction: 'light flickering in room, power outlet with scorch marks', requiredObjects: ['light fixture', 'outlet'], tool: null, cameraPlan: 'medium' },
      problem_worsens: { exactAction: 'room going dark as circuit breaker trips, person in darkness', requiredObjects: ['dark room', 'circuit breaker panel'], tool: null, cameraPlan: 'wide' },
      inspection_diagnosis: { exactAction: 'technician testing outlet with multimeter, reading voltage', requiredObjects: ['multimeter', 'outlet', 'display readings'], tool: 'multimeter', cameraPlan: 'close-up' },
      repair_action: { exactAction: 'technician replacing circuit breaker with screwdriver, panel open', requiredObjects: ['circuit breaker', 'screwdriver', 'open panel'], tool: 'screwdriver', cameraPlan: 'close-up' },
      result_visible: { exactAction: 'lights back on in room, circuit breaker panel closed, normal lighting', requiredObjects: ['lit room', 'closed panel'], tool: null, cameraPlan: 'medium' },
    },
  },
  serrurerie: {
    requiredElements: ['door', 'door lock', 'key', 'door handle', 'cylinder'],
    forbiddenElements: ['water pipes', 'faucet', 'electrical panel', 'wires', 'window glass', 'paint roller'],
    tools: ['lock pick set', 'drill', 'new cylinder', 'screwdriver'],
    domainLock: 'STRICT DOMAIN: locksmith ONLY. MUST show doors/locks/keys. NEVER show pipes, electrical panels, glass, or paint.',
    scenesByFunction: {
      problem_appears: { exactAction: 'key stuck in door lock, person trying to turn it', requiredObjects: ['door', 'key in lock', 'door handle'], tool: null, cameraPlan: 'close-up' },
      problem_worsens: { exactAction: 'broken key piece visible in lock cylinder, person locked out', requiredObjects: ['broken key', 'lock cylinder', 'closed door'], tool: null, cameraPlan: 'close-up' },
      inspection_diagnosis: { exactAction: 'technician examining door lock mechanism with magnifier', requiredObjects: ['lock mechanism', 'door'], tool: null, cameraPlan: 'close-up' },
      repair_action: { exactAction: 'technician installing new cylinder lock into door with drill', requiredObjects: ['new cylinder', 'drill', 'door'], tool: 'drill', cameraPlan: 'close-up' },
      result_visible: { exactAction: 'door opening smoothly with brand new key, new lock installed', requiredObjects: ['new key', 'new lock', 'open door'], tool: null, cameraPlan: 'medium' },
    },
  },
  vitrerie: {
    requiredElements: ['window', 'glass pane', 'window frame', 'glass'],
    forbiddenElements: ['electrical panel', 'circuit breaker', 'wires', 'water pipes', 'faucet', 'plumbing', 'door lock', 'key', 'paint roller', 'paint brush'],
    tools: ['suction cup lifter', 'glass cutter', 'protective gloves', 'sealant gun', 'putty knife'],
    domainLock: 'STRICT DOMAIN: glass/window repair ONLY. MUST show windows and glass panes. NEVER show electrical, plumbing, locks, or paint.',
    scenesByFunction: {
      problem_appears: { exactAction: 'visible crack line spreading across window glass pane', requiredObjects: ['window', 'cracked glass', 'crack line'], tool: null, cameraPlan: 'close-up' },
      problem_worsens: { exactAction: 'crack widening on window, cold draft visible, curtain moving', requiredObjects: ['wider crack', 'window frame', 'draft'], tool: null, cameraPlan: 'medium' },
      inspection_diagnosis: { exactAction: 'technician measuring cracked window pane dimensions with tape measure', requiredObjects: ['window', 'cracked glass', 'measuring tape'], tool: 'measuring tape', cameraPlan: 'medium' },
      repair_action: { exactAction: 'technician lifting new glass pane with suction cups, placing into window frame', requiredObjects: ['new glass pane', 'suction cups', 'window frame'], tool: 'suction cup lifter', cameraPlan: 'medium' },
      result_visible: { exactAction: 'crystal clear new window pane installed, clean transparent glass, sealed frame', requiredObjects: ['new glass', 'clean window', 'sealed frame'], tool: null, cameraPlan: 'medium' },
    },
  },
  menuiserie: {
    requiredElements: ['wooden shutter', 'wooden door', 'wood', 'hinge', 'shutter rail'],
    forbiddenElements: ['electrical panel', 'wires', 'water pipes', 'faucet', 'glass cutting', 'paint roller'],
    tools: ['chisel', 'wood plane', 'screwdriver', 'drill', 'sandpaper'],
    domainLock: 'STRICT DOMAIN: woodwork/shutters ONLY. MUST show wooden elements. NEVER show electrical, plumbing, or glass cutting.',
    scenesByFunction: {
      problem_appears: { exactAction: 'wooden shutter stuck halfway, not moving on rail', requiredObjects: ['shutter', 'rail', 'stuck mechanism'], tool: null, cameraPlan: 'medium' },
      problem_worsens: { exactAction: 'shutter hanging at wrong angle, wood swollen and jammed', requiredObjects: ['tilted shutter', 'swollen wood'], tool: null, cameraPlan: 'wide' },
      inspection_diagnosis: { exactAction: 'technician examining shutter rail and hinge mechanism closely', requiredObjects: ['shutter rail', 'hinge', 'wood surface'], tool: null, cameraPlan: 'close-up' },
      repair_action: { exactAction: 'technician planing swollen wood edge with hand plane, adjusting hinge', requiredObjects: ['wood plane', 'shutter', 'wood shavings'], tool: 'wood plane', cameraPlan: 'close-up' },
      result_visible: { exactAction: 'shutter sliding smoothly on rail, properly aligned and functional', requiredObjects: ['smooth shutter', 'aligned rail'], tool: null, cameraPlan: 'medium' },
    },
  },
  peinture_renovation: {
    requiredElements: ['wall', 'painted surface', 'ceiling', 'plaster'],
    forbiddenElements: ['electrical panel', 'wires', 'water pipes', 'heavy plumbing', 'door lock mechanism', 'glass cutter'],
    tools: ['paint roller', 'paint brush', 'masking tape', 'putty knife', 'filler compound'],
    domainLock: 'STRICT DOMAIN: painting/wall repair ONLY. MUST show walls/ceilings/surfaces. NEVER show electrical, plumbing, locks, or glass cutting.',
    scenesByFunction: {
      problem_appears: { exactAction: 'paint peeling off wall in visible patches, damaged surface', requiredObjects: ['wall', 'peeling paint', 'bare plaster'], tool: null, cameraPlan: 'close-up' },
      problem_worsens: { exactAction: 'larger area of damaged wall, plaster crumbling, water stain spreading', requiredObjects: ['damaged wall', 'stain', 'crumbling plaster'], tool: null, cameraPlan: 'medium' },
      inspection_diagnosis: { exactAction: 'technician tapping wall surface with putty knife, testing plaster', requiredObjects: ['wall surface', 'putty knife'], tool: 'putty knife', cameraPlan: 'close-up' },
      repair_action: { exactAction: 'technician applying fresh paint to wall with roller, masking tape on edges', requiredObjects: ['paint roller', 'wet paint', 'masking tape', 'wall'], tool: 'paint roller', cameraPlan: 'medium' },
      result_visible: { exactAction: 'freshly painted smooth wall, bright clean surface, renovation complete', requiredObjects: ['clean painted wall', 'smooth surface'], tool: null, cameraPlan: 'wide' },
    },
  },
};

// ============================================================================
// PANEL TYPE CLASSIFICATION
// ============================================================================

function getPanelType(fn: NarrativeFunction): PanelType {
  switch (fn) {
    case 'client_setup':
    case 'client_context':
    case 'problem_appears':
    case 'problem_worsens':
    case 'decision_to_call':
    case 'call_received':
    case 'scheduling':
      return 'context';
    case 'technician_arrival':
    case 'inspection_diagnosis':
    case 'repair_action':
      return 'action';
    case 'result_visible':
    case 'cta_moral':
      return 'result';
  }
}

function getLocationType(fn: NarrativeFunction, panelLocation: string): LocationType {
  if (fn === 'call_received' || fn === 'scheduling') return 'office';
  if (fn === 'technician_arrival') return 'exterior';
  if (fn === 'repair_action' || fn === 'inspection_diagnosis') return 'work_area';
  return 'client_home';
}

// ============================================================================
// BUBBLE LOGIC
// ============================================================================

function getBubbleStyle(fn: NarrativeFunction): BubbleStyle {
  // Narration/off → caption | Dialogue → speech
  switch (fn) {
    case 'client_setup':
    case 'client_context':
    case 'problem_appears':
    case 'problem_worsens':
    case 'cta_moral':
      return 'caption';
    case 'decision_to_call':
    case 'call_received':
    case 'scheduling':
      return 'speech';
    default:
      return 'caption';
  }
}

function getBubbleSpeaker(fn: NarrativeFunction, actors: string[]): string | null {
  switch (fn) {
    case 'decision_to_call':
      return 'client';
    case 'call_received':
      return 'amandine';
    case 'scheduling':
      return actors.includes('amandine') ? 'amandine' : actors[0] || null;
    default:
      return null; // narration off
  }
}

// ============================================================================
// EXPRESSIONS & CAMERA
// ============================================================================

const EXPRESSION_BY_FUNCTION: Record<NarrativeFunction, string> = {
  client_setup: 'neutral, relaxed',
  client_context: 'normal, everyday',
  problem_appears: 'surprised, concerned',
  problem_worsens: 'worried, stressed',
  decision_to_call: 'determined, reaching for phone',
  call_received: 'professional, attentive, warm smile',
  scheduling: 'focused, organized',
  technician_arrival: 'confident, professional',
  inspection_diagnosis: 'concentrated, analytical',
  repair_action: 'focused, skilled hands working',
  result_visible: 'satisfied, proud',
  cta_moral: 'warm, inviting',
};

const CAMERA_BY_PANEL_TYPE: Record<PanelType, { angle: string; shot: string }> = {
  context: { angle: 'eye level', shot: 'medium' },
  action: { angle: 'detail angle', shot: 'close-up' },
  result: { angle: 'eye level', shot: 'medium wide' },
};

// ============================================================================
// COMPOSITION & SAFE ZONES
// ============================================================================

function getCompositionRules(panelNumber: number, panelType: PanelType): CompositionRules {
  const row = Math.ceil(panelNumber / 3);
  const col = ((panelNumber - 1) % 3);

  const verticalPos = (row % 2 === 1) ? 'bottom' : 'top';
  const horizontalPos = (['left', 'center', 'right'] as const)[col];
  const bubbleSafeZone: BubbleSafeZone = `${verticalPos}-${horizontalPos}`;

  const subjectSafeZone: 'center' | 'left' | 'right' =
    panelType === 'action' ? 'center'
    : horizontalPos === 'left' ? 'right'
    : horizontalPos === 'right' ? 'left'
    : 'center';

  return {
    bubbleSafeZone,
    subjectSafeZone,
    mustLeaveNegativeSpace: panelType !== 'action',
    negativeSpacePosition: verticalPos,
  };
}

// ============================================================================
// CHARACTER DESCRIPTION
// ============================================================================

function buildCharacterDescription(slug: string, isMain: boolean = false): string {
  const char = BD_STORY_CHARACTERS.find(c => c.slug === slug);
  if (!char) {
    if (slug === 'client') return 'French homeowner, casual everyday clothes, expressive face';
    return slug;
  }

  const vi = char.visualIdentity;
  const parts: string[] = [
    char.firstName,
    `(${char.role})`,
    `${vi.hair} hair`,
    `${vi.silhouette} build`,
    ...vi.facialTraits,
    `wearing ${vi.clothes}`,
  ];

  if (isMain) {
    parts.push('MUST maintain exact same face across all panels');
  }

  return parts.join(', ');
}

function getCharacterPlacement(actors: string[], fn: NarrativeFunction): CharacterPlacement[] {
  const expression = EXPRESSION_BY_FUNCTION[fn] || 'neutral';
  if (actors.length === 0) return [];
  if (actors.length === 1) {
    return [{ slug: actors[0], placement: 'center', expression }];
  }
  const placements: ('left' | 'right' | 'center')[] = ['left', 'right', 'center'];
  return actors.map((slug, i) => ({
    slug,
    placement: placements[i] || 'background',
    expression: slug === 'client' ? expression
      : fn === 'call_received' ? 'professional, smiling' : expression,
  }));
}

// ============================================================================
// ENVIRONMENT
// ============================================================================

function buildEnvironment(story: GeneratedStory, locType: LocationType): EnvironmentBrief {
  const ctx = story.locationContext;
  const timeMap: Record<string, string> = {
    matin: 'morning', midi: 'midday', apres_midi: 'afternoon',
    soir: 'evening', nuit: 'night',
  };

  if (locType === 'office') {
    return {
      room: 'professional office with desk, phone, computer screen',
      mood: 'clean, organized, professional',
      lighting: 'bright office lighting',
      timeOfDay: timeMap[ctx.time] || 'daytime',
    };
  }
  if (locType === 'exterior') {
    return {
      room: `front of ${ctx.propertyType.replace(/_/g, ' ')}, doorstep`,
      mood: 'professional arrival',
      lighting: ctx.time === 'soir' || ctx.time === 'nuit' ? 'warm porch light' : 'natural daylight',
      weatherHint: ctx.weather,
      timeOfDay: timeMap[ctx.time] || 'daytime',
    };
  }

  return {
    room: `${ctx.room.replace(/_/g, ' ')} in a ${ctx.propertyType.replace(/_/g, ' ')}`,
    mood: ctx.visualMood || 'neutral',
    lighting: ctx.time === 'soir' || ctx.time === 'nuit' ? 'warm indoor' : 'natural daylight',
    weatherHint: ctx.weather,
    timeOfDay: timeMap[ctx.time] || 'daytime',
  };
}

// ============================================================================
// MAIN: GENERATE PANEL RENDER PLAN
// ============================================================================

export function generatePanelRenderPlan(panel: GeneratedPanel, story: GeneratedStory): PanelRenderPlan {
  const panelType = getPanelType(panel.narrativeFunction);
  const locationType = getLocationType(panel.narrativeFunction, panel.location);
  const camera = CAMERA_BY_PANEL_TYPE[panelType];
  const characters = getCharacterPlacement(panel.actors, panel.narrativeFunction);
  const environment = buildEnvironment(story, locationType);
  const expression = EXPRESSION_BY_FUNCTION[panel.narrativeFunction] || 'neutral';
  const composition = getCompositionRules(panel.number, panelType);
  const bubbleStyle = getBubbleStyle(panel.narrativeFunction);
  const bubbleSpeaker = getBubbleSpeaker(panel.narrativeFunction, panel.actors);

  const dc = DOMAIN_CONSTRAINTS[story.universe];
  const techSlug = story.assignedCharacters.technician;
  const mainSlugs = new Set([techSlug, 'amandine']);

  // Get exact scene spec from domain constraints
  const sceneSpec = dc.scenesByFunction[panel.narrativeFunction];
  const exactAction = sceneSpec?.exactAction || `${panel.narrativeFunction.replace(/_/g, ' ')} scene`;
  const requiredVisibleObjects = sceneSpec?.requiredObjects || dc.requiredElements.slice(0, 3);
  const exactTool = sceneSpec?.tool || null;
  const overriddenCamera = sceneSpec?.cameraPlan || camera.shot;

  // Primary subject
  const primarySubject = panel.actors.length > 0
    ? buildCharacterDescription(panel.actors[0], mainSlugs.has(panel.actors[0]))
    : 'empty room scene';

  // Continuity anchor — what ties this panel to the rest
  const continuityAnchor = `same ${story.universe} problem, same ${story.locationContext.room} room, same characters`;

  // Build continuity notes
  const continuityNotes: string[] = [
    'CRITICAL: same client face, hair, clothes across ALL panels',
    'CRITICAL: same room decor, wall color, furniture across ALL panels',
    `Panel ${panel.number}/12 — ${story.universe} domain — visual consistency paramount`,
  ];

  const techChar = BD_STORY_CHARACTERS.find(c => c.slug === techSlug);
  if (techChar && panel.actors.includes(techSlug)) {
    continuityNotes.push(
      `${techChar.firstName}: ${techChar.visualIdentity.hair} hair, ${techChar.visualIdentity.silhouette} build, ${techChar.visualIdentity.facialTraits.join(', ')}`,
      `${techChar.firstName} wears HelpConfort branded work clothes — same in every panel`,
    );
  }
  if (panel.actors.includes('amandine')) {
    const am = BD_STORY_CHARACTERS.find(c => c.slug === 'amandine');
    if (am) {
      continuityNotes.push(
        'Amandine is ONLY at office desk, NEVER on work site',
        `Amandine: ${am.visualIdentity.hair} hair, ${am.visualIdentity.facialTraits.join(', ')}`,
      );
    }
  }

  // Forbidden elements — base + domain
  const forbiddenElements: string[] = [
    'ANY text, letters, words, numbers rendered in the image',
    'ANY speech bubbles or text balloons drawn in the image',
    'ANY logos, brand names, watermarks',
    'ANY written captions or titles in the illustration',
    ...dc.forbiddenElements,
  ];

  // === BUILD FINAL IMAGE PROMPT ===
  const charDescriptions = characters.map(c =>
    `${buildCharacterDescription(c.slug, mainSlugs.has(c.slug))} (${c.placement}, ${c.expression})`,
  ).join('; ');

  const compositionLine = composition.mustLeaveNegativeSpace
    ? `COMPOSITION: Leave clear empty space at ${composition.negativeSpacePosition} for text overlay. Subject positioned ${composition.subjectSafeZone}.`
    : `COMPOSITION: Subject positioned ${composition.subjectSafeZone}.`;

  const imagePrompt = [
    // Identity
    `Comic panel ${panel.number}/12. Franco-Belgian comic illustration, clean line art, warm colors.`,
    // DOMAIN LOCK — highest priority
    dc.domainLock,
    // EXACT ACTION — what happens in this panel
    `EXACT SCENE: ${exactAction}.`,
    // Required objects
    `MUST SHOW: ${requiredVisibleObjects.join(', ')}.`,
    // Tool if relevant
    exactTool ? `TOOL IN USE: ${exactTool}.` : '',
    // Camera
    `Camera: ${camera.angle}, ${overriddenCamera}.`,
    // Composition
    compositionLine,
    // Characters
    charDescriptions ? `Characters: ${charDescriptions}.` : '',
    // Setting
    `Setting: ${environment.room}, ${environment.mood}, ${environment.lighting}.`,
    // Style
    `Style: Professional home repair comic. Expressive faces, readable composition, consistent character design. HelpConfort brand (blue, white).`,
    // ABSOLUTE PROHIBITION
    `ABSOLUTELY NO text, NO letters, NO logos, NO speech bubbles, NO words anywhere in the image.`,
    `FORBIDDEN: ${dc.forbiddenElements.slice(0, 4).join(', ')}.`,
  ].filter(Boolean).join(' ');

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
    panelType,
    imagePrompt,
    speechBubbleText: panel.text,
    bubbleStyle,
    bubbleSpeaker,
    captionText: panel.narrativeFunction === 'cta_moral' ? story.ctaText : null,
    cameraAngle: camera.angle,
    shotSize: overriddenCamera,
    expressionNotes: expression,
    continuityNotes: continuityNotes.filter(Boolean),
    characters,
    environment,
    colorNotes: universeColors[story.universe] || 'warm professional tones',
    forbiddenElements,
    composition,
    locationType,
    primarySubject,
    exactAction,
    requiredVisibleObjects,
    exactTool,
    continuityAnchor,
  };
}

/**
 * Generate all 12 panel render plans for a full story
 */
export function generateFullRenderPlan(story: GeneratedStory): PanelRenderPlan[] {
  return story.panels.map(panel => generatePanelRenderPlan(panel, story));
}

/**
 * Generate a 4-panel premium render plan (condensed BD)
 * Panels: problem → call → intervention → result
 */
export function generate4PanelPremiumPlan(story: GeneratedStory): PanelRenderPlan[] {
  // Pick the 4 most impactful panels
  const keyFunctions: NarrativeFunction[] = [
    'problem_appears',   // Panel 1: the problem
    'call_received',     // Panel 2: taking charge
    'repair_action',     // Panel 3: the intervention
    'result_visible',    // Panel 4: the result
  ];

  const selectedPanels = keyFunctions.map((fn, idx) => {
    const matchingPanel = story.panels.find(p => p.narrativeFunction === fn);
    if (!matchingPanel) {
      // Fallback: use panel by position
      return story.panels[idx * 3] || story.panels[idx];
    }
    return matchingPanel;
  }).filter(Boolean);

  // Re-number 1-4 and generate plans
  return selectedPanels.map((panel, idx) => {
    const renumberedPanel = { ...panel, number: idx + 1 };
    const plan = generatePanelRenderPlan(renumberedPanel, story);
    // Override prompt to mention 4-panel format
    return {
      ...plan,
      imagePrompt: plan.imagePrompt.replace(
        /Comic panel \d+\/12/,
        `Comic panel ${idx + 1}/4, premium format`,
      ),
    };
  });
}
