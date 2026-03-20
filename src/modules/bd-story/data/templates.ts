/**
 * BD Story — 14 templates narratifs avec panelRules 12 cases
 */

import { StoryTemplate, PanelRule } from '../types/bdStory.types';

// ============================================================================
// Panel rules partagés (structure 12 cases standard)
// ============================================================================

const STANDARD_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['client seul chez lui'] },
  { panelNumber: 2, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['contexte de vie quotidien'] },
  { panelNumber: 3, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['symptôme visible ou audible'] },
  { panelNumber: 4, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['aggravation ou prise de conscience'] },
  { panelNumber: 5, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['décision d\'appeler un pro'] },
  { panelNumber: 6, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine au bureau uniquement'] },
  { panelNumber: 7, narrativeFunction: 'scheduling', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['planification / prise en charge'] },
  { panelNumber: 8, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['exterieur', 'maison'], mandatoryConstraints: ['arrivée après appel uniquement'] },
  { panelNumber: 9, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison', 'chantier'], mandatoryConstraints: ['diagnostic ou inspection'] },
  { panelNumber: 10, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison', 'chantier'], mandatoryConstraints: ['action technique'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['résultat visible'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA + morale en 3-8 mots'] },
];

// Variante : provisoire + devis (cases 9-10 modifiées)
function makeProvisoireDevisPanels(): PanelRule[] {
  return STANDARD_PANELS.map(p => {
    if (p.panelNumber === 9) return { ...p, narrativeFunction: 'repair_action' as const, mandatoryConstraints: ['sécurisation provisoire'] };
    if (p.panelNumber === 10) return { ...p, narrativeFunction: 'inspection_diagnosis' as const, mandatoryConstraints: ['diagnostic + devis annoncé'], allowedActors: ['technicien', 'commercial'] as any };
    return p;
  });
}

// Variante : bricolage raté (cases 3-4 = tentative DIY)
function makeBricolagePanels(): PanelRule[] {
  return STANDARD_PANELS.map(p => {
    if (p.panelNumber === 3) return { ...p, mandatoryConstraints: ['client tente de réparer lui-même'] };
    if (p.panelNumber === 4) return { ...p, mandatoryConstraints: ['aggravation suite au bricolage'] };
    return p;
  });
}

// ============================================================================
// 14 TEMPLATES
// ============================================================================

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    key: 'urgence_simple',
    label: 'Urgence simple',
    storyFamily: 'urgence_domestique',
    tensionCurve: 'normal_to_panic_to_resolved',
    outcomeType: 'reparation_immediate',
    brandPromise: 'reactivite',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'panne_progressive',
    label: 'Panne progressive',
    storyFamily: 'panne_progressive',
    tensionCurve: 'slow_build_to_action',
    outcomeType: 'reparation_immediate',
    brandPromise: 'expertise',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'provisoire_devis',
    label: 'Provisoire + devis',
    storyFamily: 'reparation_provisoire',
    tensionCurve: 'normal_to_panic_to_resolved',
    outcomeType: 'provisoire_plus_devis',
    brandPromise: 'rassurance',
    panelRules: makeProvisoireDevisPanels(),
  },
  {
    key: 'diagnostic_travaux',
    label: 'Diagnostic + travaux',
    storyFamily: 'diagnostic_devis',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'diagnostic_plus_travaux',
    brandPromise: 'expertise',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'avant_apres',
    label: 'Avant / Après',
    storyFamily: 'avant_apres',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'reparation_immediate',
    brandPromise: 'expertise',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'probleme_aggrave',
    label: 'Problème aggravé',
    storyFamily: 'probleme_ignore',
    tensionCurve: 'slow_build_to_action',
    outcomeType: 'provisoire_plus_devis',
    brandPromise: 'rassurance',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'reparation_immediate',
    label: 'Réparation immédiate',
    storyFamily: 'intervention_rapide',
    tensionCurve: 'surprise_to_quick_fix',
    outcomeType: 'reparation_immediate',
    brandPromise: 'reactivite',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'mise_en_securite',
    label: 'Mise en sécurité',
    storyFamily: 'mise_en_securite',
    tensionCurve: 'normal_to_panic_to_resolved',
    outcomeType: 'mise_en_securite',
    brandPromise: 'reactivite',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'intervention_preventive',
    label: 'Intervention préventive',
    storyFamily: 'entretien_preventif',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'diagnostic_plus_travaux',
    brandPromise: 'proximite',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'petit_probleme_evite',
    label: 'Petit problème évité',
    storyFamily: 'retour_confort',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'reparation_immediate',
    brandPromise: 'proximite',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'erreur_bricolage',
    label: 'Erreur de bricolage',
    storyFamily: 'mauvais_bricolage',
    tensionCurve: 'slow_build_to_action',
    outcomeType: 'reparation_immediate',
    brandPromise: 'expertise',
    panelRules: makeBricolagePanels(),
  },
  {
    key: 'retour_confort',
    label: 'Retour au confort',
    storyFamily: 'amelioration_confort',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'reparation_immediate',
    brandPromise: 'proximite',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'resolution_progressive',
    label: 'Résolution progressive',
    storyFamily: 'resolution_progressive',
    tensionCurve: 'slow_build_to_action',
    outcomeType: 'reparation_immediate',
    brandPromise: 'expertise',
    panelRules: STANDARD_PANELS,
  },
  {
    key: 'suivi_client',
    label: 'Suivi client',
    storyFamily: 'suivi_client',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'diagnostic_plus_travaux',
    brandPromise: 'proximite',
    panelRules: STANDARD_PANELS,
  },
];

/** Get template by key */
export function getTemplate(key: string): StoryTemplate | undefined {
  return STORY_TEMPLATES.find(t => t.key === key);
}
