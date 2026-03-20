/**
 * BD Story — Story Bible
 * Source de vérité métier : règles absolues, cas interdits, enchaînements autorisés
 */

// ============================================================================
// RÈGLES MÉTIER ABSOLUES
// ============================================================================

export const BUSINESS_RULES = {
  /** Amandine = bureau uniquement, jamais terrain, jamais cliente */
  AMANDINE_OFFICE_ONLY: true,
  /** Technicien = JAMAIS avant l'appel reçu par Amandine */
  TECHNICIAN_AFTER_CALL_ONLY: true,
  /** Case 12 = TOUJOURS CTA ou morale */
  CTA_ALWAYS_PANEL_12: true,
  /** Cases 1-2 = TOUJOURS le client chez lui */
  CLIENT_FIRST_TWO_PANELS: true,
  /** Phrase par case : 3 à 8 mots, jamais coupée */
  TEXT_MIN_WORDS: 3,
  TEXT_MAX_WORDS: 8,
  /** 12 cases exactement, pas plus, pas moins */
  PANEL_COUNT: 12,
  /** Grille 3 colonnes × 4 lignes */
  GRID_COLS: 3,
  GRID_ROWS: 4,
} as const;

// ============================================================================
// CAS INTERDITS
// ============================================================================

export const FORBIDDEN_CASES = [
  'Amandine en tant que cliente',
  'Amandine sur le terrain ou en visite',
  'Technicien présent avant l\'appel',
  'Intervention instantanée sans contexte d\'appel',
  'Réparation magique sans diagnostic',
  'CTA absent de la case 12',
  'Texte de case > 8 mots',
  'Texte de case < 3 mots',
  'Client absent des cases 1-2',
  'Technicien incompatible avec le problème',
  'Camion inventé ou non montré avant arrivée',
  'Transformation instantanée absurde',
  'Super-pouvoirs du technicien',
  'Sébastien en intervention technique directe',
  'Jérôme/Clémence comme technicien terrain',
  'Même technicien 3 fois de suite',
  'Même problème 2 fois de suite',
  'Même CTA 3 fois de suite',
] as const;

// ============================================================================
// RÔLES NARRATIFS AUTORISÉS PAR PERSONNAGE
// ============================================================================

export type NarrativeRole = 
  | 'protagonist_client'      // Client au centre
  | 'receptionist'            // Amandine au standard
  | 'field_technician'        // Technicien terrain
  | 'commercial_advisor'      // Sébastien (devis/conseil)
  | 'brand_presence'          // Jérôme/Clémence (image)
  | 'silent_background';      // Figurant sans rôle actif

export const CHARACTER_NARRATIVE_ROLES: Record<string, NarrativeRole[]> = {
  amandine:       ['receptionist'],
  yoann:          ['field_technician'],
  loic:           ['field_technician'],
  pierre_antoine: ['field_technician'],
  benjamin:       ['field_technician'],
  yannick:        ['field_technician'],
  guillaume:      ['field_technician'],
  cris:           ['field_technician'],
  maxime:         ['field_technician'],
  sebastien:      ['commercial_advisor'],
  jerome:         ['brand_presence', 'silent_background'],
  clemence:       ['brand_presence', 'silent_background'],
};

// ============================================================================
// ENCHAÎNEMENTS NARRATIFS AUTORISÉS
// Chaque template doit suivre un des 3 parcours principaux
// ============================================================================

export interface NarrativeJourney {
  key: string;
  label: string;
  description: string;
  flow: string[];
  templateKeys: string[];
  whenToUse: string;
  sebastienAllowed: boolean;
  outcomeTypes: string[];
}

export const NARRATIVE_JOURNEYS: NarrativeJourney[] = [
  {
    key: 'depannage_simple',
    label: 'Dépannage simple',
    description: 'Problème → appel → intervention → réparé → fin',
    flow: [
      'client_setup',
      'problem_appears',
      'problem_worsens (optionnel)',
      'decision_to_call',
      'call_received (Amandine)',
      'scheduling (optionnel)',
      'technician_arrival',
      'inspection_diagnosis',
      'repair_action',
      'result_visible',
      'client_context (retour à la normale)',
      'cta_moral',
    ],
    templateKeys: ['urgence_simple', 'reparation_immediate', 'petit_probleme_evite', 'retour_confort'],
    whenToUse: 'Problème simple ou modéré, réparable en une intervention',
    sebastienAllowed: false,
    outcomeTypes: ['reparation_immediate'],
  },
  {
    key: 'securisation_devis',
    label: 'Mise en sécurité + devis',
    description: 'Problème grave → appel → sécurisation provisoire → diagnostic → devis → client informé',
    flow: [
      'client_setup',
      'problem_appears',
      'problem_worsens',
      'decision_to_call',
      'call_received (Amandine)',
      'technician_arrival',
      'repair_action (sécurisation provisoire)',
      'inspection_diagnosis (diagnostic complet)',
      'inspection_diagnosis (explication + chiffrage)',
      'result_visible (zone sécurisée, devis à suivre)',
      'result_visible (client rassuré et informé)',
      'cta_moral',
    ],
    templateKeys: ['provisoire_devis', 'mise_en_securite', 'probleme_aggrave'],
    whenToUse: 'Problème nécessitant une sécurisation immédiate puis travaux planifiés',
    sebastienAllowed: true,
    outcomeTypes: ['provisoire_plus_devis', 'mise_en_securite'],
  },
  {
    key: 'diagnostic_travaux',
    label: 'Diagnostic + travaux',
    description: 'Constat → appel conseil → visite → diagnostic → proposition travaux → confiance',
    flow: [
      'client_setup',
      'client_context (hésitation)',
      'problem_appears',
      'decision_to_call',
      'call_received (Amandine)',
      'scheduling',
      'technician_arrival',
      'inspection_diagnosis (diagnostic détaillé)',
      'inspection_diagnosis (explication au client)',
      'repair_action (proposition travaux + devis)',
      'result_visible (plan clair)',
      'cta_moral',
    ],
    templateKeys: ['diagnostic_travaux', 'avant_apres', 'suivi_client', 'intervention_preventive', 'resolution_progressive'],
    whenToUse: 'Pas d\'urgence, besoin structuré, travaux à planifier',
    sebastienAllowed: true,
    outcomeTypes: ['diagnostic_plus_travaux'],
  },
];

// ============================================================================
// RÈGLES DE PRÉSENCE PAR CASE
// ============================================================================

export const PANEL_PRESENCE_RULES = {
  /** Cases 1-4 : client uniquement, pas de personnel HelpConfort */
  earlyPanels: {
    allowed: ['client'],
    forbidden: ['amandine', 'technicien', 'sebastien', 'jerome', 'clemence'],
    reason: 'Le client est seul chez lui avant d\'appeler',
  },
  /** Case 5-6 : appel — Amandine au bureau, client au téléphone */
  callPanels: {
    required: ['amandine'],
    location: 'bureau',
    forbidden: ['technicien'],
    reason: 'Amandine prend l\'appel au bureau, technicien pas encore parti',
  },
  /** Cases 7-10 : intervention — technicien assigné compatible */
  interventionPanels: {
    required: ['technicien'],
    forbidden: ['amandine'],
    reason: 'Technicien sur le terrain, Amandine reste au bureau',
  },
  /** Case 11 : résultat — client + technicien possible */
  resultPanel: {
    allowed: ['client', 'technicien'],
    reason: 'Le client voit le résultat',
  },
  /** Case 12 : CTA — pas de personnage obligatoire */
  ctaPanel: {
    allowed: [],
    reason: 'Case de conclusion, message HelpConfort',
  },
} as const;

// ============================================================================
// TYPES DE FINS AUTORISÉS
// ============================================================================

export const ENDING_TYPES = [
  { key: 'repare_direct', label: 'Réparé directement', ctaModes: ['appel', 'intervention'] },
  { key: 'securise_devis', label: 'Sécurisé + devis à suivre', ctaModes: ['devis'] },
  { key: 'diagnostic_planifie', label: 'Diagnostic posé, travaux planifiés', ctaModes: ['devis', 'message'] },
  { key: 'provisoire_retour', label: 'Solution provisoire, retour prévu', ctaModes: ['devis', 'intervention'] },
  { key: 'prevention', label: 'Vérification, conseil prévention', ctaModes: ['general', 'message'] },
] as const;

// ============================================================================
// PROXIMITÉ NARRATIVE (pour diversité perçue)
// ============================================================================

export interface NarrativeSignature {
  openingType: 'calm_routine' | 'sudden_event' | 'slow_degradation' | 'external_trigger' | 'failed_diy';
  tensionPeak: 'early' | 'middle' | 'late';
  resolutionSpeed: 'instant' | 'progressive' | 'deferred';
  moralType: 'react_fast' | 'dont_wait' | 'trust_pro' | 'prevention' | 'comfort' | 'expertise';
}

/** Chaque template a une signature narrative unique */
export const TEMPLATE_SIGNATURES: Record<string, NarrativeSignature> = {
  urgence_simple:          { openingType: 'sudden_event',     tensionPeak: 'early',  resolutionSpeed: 'instant',     moralType: 'react_fast' },
  panne_progressive:       { openingType: 'slow_degradation', tensionPeak: 'middle', resolutionSpeed: 'progressive', moralType: 'dont_wait' },
  provisoire_devis:        { openingType: 'sudden_event',     tensionPeak: 'early',  resolutionSpeed: 'deferred',    moralType: 'trust_pro' },
  diagnostic_travaux:      { openingType: 'slow_degradation', tensionPeak: 'late',   resolutionSpeed: 'deferred',    moralType: 'expertise' },
  avant_apres:             { openingType: 'slow_degradation', tensionPeak: 'middle', resolutionSpeed: 'progressive', moralType: 'comfort' },
  probleme_aggrave:        { openingType: 'slow_degradation', tensionPeak: 'late',   resolutionSpeed: 'deferred',    moralType: 'dont_wait' },
  reparation_immediate:    { openingType: 'sudden_event',     tensionPeak: 'early',  resolutionSpeed: 'instant',     moralType: 'react_fast' },
  mise_en_securite:        { openingType: 'sudden_event',     tensionPeak: 'early',  resolutionSpeed: 'deferred',    moralType: 'prevention' },
  intervention_preventive: { openingType: 'calm_routine',     tensionPeak: 'late',   resolutionSpeed: 'progressive', moralType: 'prevention' },
  petit_probleme_evite:    { openingType: 'calm_routine',     tensionPeak: 'middle', resolutionSpeed: 'instant',     moralType: 'react_fast' },
  erreur_bricolage:        { openingType: 'failed_diy',       tensionPeak: 'middle', resolutionSpeed: 'progressive', moralType: 'trust_pro' },
  retour_confort:          { openingType: 'calm_routine',     tensionPeak: 'middle', resolutionSpeed: 'progressive', moralType: 'comfort' },
  resolution_progressive:  { openingType: 'slow_degradation', tensionPeak: 'middle', resolutionSpeed: 'progressive', moralType: 'expertise' },
  suivi_client:            { openingType: 'calm_routine',     tensionPeak: 'late',   resolutionSpeed: 'deferred',    moralType: 'trust_pro' },
};

/**
 * Calcule la distance de proximité narrative entre deux templates.
 * 0 = identiques, 4 = totalement différents.
 */
export function narrativeDistance(templateA: string, templateB: string): number {
  const a = TEMPLATE_SIGNATURES[templateA];
  const b = TEMPLATE_SIGNATURES[templateB];
  if (!a || !b) return 4;

  let dist = 0;
  if (a.openingType !== b.openingType) dist++;
  if (a.tensionPeak !== b.tensionPeak) dist++;
  if (a.resolutionSpeed !== b.resolutionSpeed) dist++;
  if (a.moralType !== b.moralType) dist++;
  return dist;
}

// ============================================================================
// AUDIT HELPER — vérifie qu'une histoire respecte la bible
// ============================================================================

export interface BibleViolation {
  rule: string;
  severity: 'blocking' | 'major' | 'minor';
  detail: string;
}

export function checkStoryBible(story: {
  panels: { number: number; actors: string[]; location: string; narrativeFunction: string; text: string }[];
  assignedCharacters: { technician: string };
}): BibleViolation[] {
  const violations: BibleViolation[] = [];

  // Check client in first 2 panels
  const firstTwo = story.panels.filter(p => p.number <= 2);
  if (!firstTwo.some(p => p.actors.includes('client'))) {
    violations.push({ rule: 'CLIENT_FIRST_TWO_PANELS', severity: 'blocking', detail: 'Client absent des cases 1-2' });
  }

  // Check Amandine location
  for (const p of story.panels) {
    if (p.actors.includes('amandine') && p.location !== 'bureau' && p.location !== 'general') {
      violations.push({ rule: 'AMANDINE_OFFICE_ONLY', severity: 'blocking', detail: `Amandine hors bureau case ${p.number}` });
    }
  }

  // Check technician before call
  const callPanel = story.panels.find(p => p.narrativeFunction === 'call_received');
  if (callPanel) {
    for (const p of story.panels) {
      if (p.number < callPanel.number && p.actors.includes(story.assignedCharacters.technician)) {
        violations.push({ rule: 'TECHNICIAN_AFTER_CALL_ONLY', severity: 'blocking', detail: `Technicien avant appel case ${p.number}` });
      }
    }
  }

  // Check CTA panel 12
  const panel12 = story.panels.find(p => p.number === 12);
  if (!panel12 || panel12.narrativeFunction !== 'cta_moral') {
    violations.push({ rule: 'CTA_ALWAYS_PANEL_12', severity: 'blocking', detail: 'Case 12 n\'est pas cta_moral' });
  }

  // Check text lengths
  for (const p of story.panels) {
    const wc = p.text.trim().split(/\s+/).length;
    if (wc > BUSINESS_RULES.TEXT_MAX_WORDS) {
      violations.push({ rule: 'TEXT_MAX_WORDS', severity: 'major', detail: `Case ${p.number}: ${wc} mots (max ${BUSINESS_RULES.TEXT_MAX_WORDS})` });
    }
    if (wc < BUSINESS_RULES.TEXT_MIN_WORDS && p.text !== '…') {
      violations.push({ rule: 'TEXT_MIN_WORDS', severity: 'major', detail: `Case ${p.number}: ${wc} mots (min ${BUSINESS_RULES.TEXT_MIN_WORDS})` });
    }
  }

  // Check panel count
  if (story.panels.length !== BUSINESS_RULES.PANEL_COUNT) {
    violations.push({ rule: 'PANEL_COUNT', severity: 'blocking', detail: `${story.panels.length} cases au lieu de ${BUSINESS_RULES.PANEL_COUNT}` });
  }

  return violations;
}
