/**
 * BD Story — Visual Prompt Engine
 * Génère les prompts visuels cohérents pour chaque case et le prompt maître de planche
 */

import { GeneratedStory, GeneratedPanel } from '../types/bdStory.types';
import { BD_STORY_CHARACTERS } from '../data/characters';

// ============================================================================
// CHARACTER VISUAL DESCRIPTION
// ============================================================================

function describeCharacter(slug: string): string {
  const char = BD_STORY_CHARACTERS.find(c => c.slug === slug);
  if (!char) {
    if (slug === 'client') return 'a French homeowner, casual clothes, worried expression';
    return slug;
  }

  const vi = char.visualIdentity;
  return [
    char.firstName,
    `(${vi.hair})`,
    vi.silhouette,
    `wearing ${vi.clothes}`,
    vi.accessories.length > 0 ? `with ${vi.accessories.join(', ')}` : '',
    vi.facialTraits.join(', '),
  ].filter(Boolean).join(', ');
}

// ============================================================================
// LOCATION VISUAL DESCRIPTION
// ============================================================================

function describeLocation(story: GeneratedStory, panelLocation: string): string {
  const ctx = story.locationContext;
  
  if (panelLocation === 'bureau') {
    return 'a clean office interior, desk with phone and computer, professional atmosphere, warm lighting';
  }
  if (panelLocation === 'exterieur') {
    return `exterior of a ${ctx.propertyType.replace(/_/g, ' ')}, French suburban setting, ${ctx.weather || 'clear'} weather, ${ctx.season || 'spring'} season`;
  }
  if (panelLocation === 'general') {
    return 'clean branded background, HelpConfort colors';
  }

  // Room-based
  const roomDescriptions: Record<string, string> = {
    cuisine: 'a French kitchen, modern appliances, countertops',
    salle_de_bain: 'a French bathroom, tiles, sink and mirror',
    salon: 'a French living room, comfortable furniture',
    chambre: 'a French bedroom, bed and furniture',
    entree: 'a house entrance, front door area',
    garage: 'a residential garage, tools and storage',
    buanderie: 'a laundry room, washing machine area',
    local_technique: 'a technical room, electrical panel, pipes',
    couloir: 'a hallway, corridor',
    terrasse: 'an outdoor terrace',
    balcon: 'a balcony',
    baie_vitree: 'a large glass bay window area',
    facade: 'house exterior facade',
    vitrine_commerce: 'a shop front window',
  };

  const roomDesc = roomDescriptions[panelLocation] || `a room (${panelLocation})`;
  const moodMap: Record<string, string> = {
    calme: 'calm ambient lighting',
    stressant: 'tense atmosphere, harsh shadows',
    urgence: 'dramatic lighting, sense of urgency',
    cosy: 'warm cozy lighting',
    degrade: 'visible wear and damage',
    lumineux: 'bright natural light',
    sombre: 'dim moody lighting',
  };
  const mood = ctx.visualMood ? moodMap[ctx.visualMood] || '' : 'natural lighting';
  const time = ctx.time === 'nuit' ? 'nighttime' : ctx.time === 'soir' ? 'evening' : 'daytime';

  return `${roomDesc}, ${ctx.propertyType.replace(/_/g, ' ')}, ${mood}, ${time}`;
}

// ============================================================================
// SHOT TYPE DESCRIPTION
// ============================================================================

function describeShotType(shotType: string): string {
  switch (shotType) {
    case 'wide': return 'wide establishing shot';
    case 'medium': return 'medium shot, waist up';
    case 'close': return 'close-up shot';
    case 'detail': return 'extreme close-up detail shot';
    default: return 'medium shot';
  }
}

// ============================================================================
// NARRATIVE FUNCTION → ACTION DESCRIPTION
// ============================================================================

function describeAction(panel: GeneratedPanel, story: GeneratedStory): string {
  switch (panel.narrativeFunction) {
    case 'client_setup': return 'going about their normal routine';
    case 'client_context': return 'in their everyday environment';
    case 'problem_appears': return `discovering a problem: ${story.panels.find(p => p.number === panel.number)?.text || 'issue visible'}`;
    case 'problem_worsens': return 'reacting to worsening situation';
    case 'decision_to_call': return 'picking up the phone to call for help';
    case 'call_received': return 'answering the phone at the office desk, professional';
    case 'scheduling': return 'checking the schedule on screen, organizing';
    case 'technician_arrival': return 'arriving at the house with tools and branded vehicle';
    case 'inspection_diagnosis': return 'carefully inspecting and diagnosing the problem';
    case 'repair_action': return 'performing the repair with professional tools';
    case 'result_visible': return 'showing the completed repair, client relieved';
    case 'cta_moral': return 'branded message panel with HelpConfort logo';
    default: return '';
  }
}

// ============================================================================
// PANEL PROMPT
// ============================================================================

export function generatePanelPrompt(panel: GeneratedPanel, story: GeneratedStory): string {
  const characters = panel.actors.map(describeCharacter).join('; ');
  const location = describeLocation(story, panel.location);
  const shot = describeShotType(panel.shotType);
  const action = describeAction(panel, story);

  return [
    `Panel ${panel.number}/12.`,
    `${shot}.`,
    `Characters: ${characters || 'none'}.`,
    `Setting: ${location}.`,
    `Action: ${action}.`,
    `Text bubble: "${panel.text}"`,
    'Style: Franco-Belgian comic book, clean lines, warm colors, professional.',
  ].join(' ');
}

// ============================================================================
// BOARD MASTER PROMPT
// ============================================================================

export function generateBoardPrompt(story: GeneratedStory): string {
  const tech = BD_STORY_CHARACTERS.find(c => c.slug === story.assignedCharacters.technician);
  const techName = tech?.firstName || story.assignedCharacters.technician;
  const ctx = story.locationContext;

  return [
    `Create a 12-panel comic strip (3 columns × 4 rows) for HelpConfort, a French home repair company.`,
    ``,
    `STORY: ${story.summary}`,
    `UNIVERSE: ${story.universe}`,
    `TONE: ${story.tone}`,
    `SETTING: ${ctx.propertyType.replace(/_/g, ' ')}, ${ctx.room.replace(/_/g, ' ')}, ${ctx.season || 'neutral'} season, ${ctx.weather || 'clear'} weather.`,
    ``,
    `RECURRING CHARACTERS (must be visually consistent across all panels):`,
    `- Client: French homeowner, casual clothes`,
    `- Amandine (office only): ${describeCharacter('amandine')}`,
    `- ${techName}: ${describeCharacter(story.assignedCharacters.technician)}`,
    ``,
    `STYLE: Franco-Belgian comic book (like Tintin/Spirou). Clean lines, warm natural colors, professional atmosphere. Each panel has a short French text bubble (3-8 words).`,
    ``,
    `PANELS:`,
    ...story.panels.map(p => `${p.number}. [${p.narrativeFunction}] "${p.text}" — ${describeShotType(p.shotType)}`),
    ``,
    `IMPORTANT: Characters must look identical across all panels. HelpConfort branding visible on technician clothes and vehicle.`,
  ].join('\n');
}

// ============================================================================
// FILL VISUAL PROMPTS ON PANELS
// ============================================================================

export function fillVisualPrompts(story: GeneratedStory): GeneratedStory {
  const updatedPanels = story.panels.map(panel => ({
    ...panel,
    visualPrompt: generatePanelPrompt(panel, story),
  }));

  return { ...story, panels: updatedPanels };
}
