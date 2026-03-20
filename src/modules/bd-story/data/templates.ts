/**
 * BD Story — 14 templates narratifs avec panelRules VRAIMENT distincts
 * Chaque template a sa propre mécanique narrative (pas de copier-coller)
 */

import { StoryTemplate, PanelRule } from '../types/bdStory.types';

// ============================================================================
// 1. URGENCE SIMPLE — tension forte, résolution rapide
// Client → problème soudain → panique → appel → intervention express → réparé
// ============================================================================

const URGENCE_SIMPLE_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['client seul, moment calme'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['problème soudain, brutal'] },
  { panelNumber: 3, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['aggravation rapide'] },
  { panelNumber: 4, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['urgence ressentie'] },
  { panelNumber: 5, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine rassure'] },
  { panelNumber: 6, narrativeFunction: 'scheduling', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['envoi immédiat'] },
  { panelNumber: 7, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['exterieur'], mandatoryConstraints: ['arrivée rapide'] },
  { panelNumber: 8, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['diagnostic express'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['réparation directe'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['résultat immédiat'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['soulagement client'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA réactivité'] },
];

// ============================================================================
// 2. PANNE PROGRESSIVE — tension lente, diagnostic approfondi
// Symptôme léger → on ignore → ça empire → appel → diagnostic complet → réparation
// ============================================================================

const PANNE_PROGRESSIVE_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['quotidien normal'] },
  { panelNumber: 2, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['petit signe ignoré'] },
  { panelNumber: 3, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['symptôme discret'] },
  { panelNumber: 4, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le problème empire sur jours/semaines'] },
  { panelNumber: 5, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['impossible d\'ignorer'] },
  { panelNumber: 6, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['prise de conscience tardive'] },
  { panelNumber: 7, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine écoute et qualifie'] },
  { panelNumber: 8, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['arrivée planifiée'] },
  { panelNumber: 9, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['diagnostic approfondi'] },
  { panelNumber: 10, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['réparation complète'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client réalise la différence'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA prévention : ne pas attendre'] },
];

// ============================================================================
// 3. PROVISOIRE + DEVIS — sécurisation d'abord, devis ensuite
// Problème → appel → sécurisation provisoire → diagnostic → devis → client informé
// ============================================================================

const PROVISOIRE_DEVIS_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['situation initiale'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['problème nécessitant travaux'] },
  { panelNumber: 3, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['aggravation ou risque'] },
  { panelNumber: 4, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['appel nécessaire'] },
  { panelNumber: 5, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine rassure et planifie'] },
  { panelNumber: 6, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['arrivée technicien'] },
  { panelNumber: 7, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['sécurisation provisoire'] },
  { panelNumber: 8, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['diagnostic complet'] },
  { panelNumber: 9, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien', 'commercial'], allowedLocations: ['maison'], mandatoryConstraints: ['explication + chiffrage annoncé'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['zone sécurisée, devis à suivre'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['client rassuré et informé'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA devis : chiffrage clair'] },
];

// ============================================================================
// 4. DIAGNOSTIC + TRAVAUX — pas d'urgence, besoin structuré
// Constat → appel conseil → visite → diagnostic → proposition travaux → confiance
// ============================================================================

const DIAGNOSTIC_TRAVAUX_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['constat tranquille'] },
  { panelNumber: 2, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client hésite depuis un moment'] },
  { panelNumber: 3, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['défaut constaté, pas d\'urgence'] },
  { panelNumber: 4, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['décision de faire appel à un pro'] },
  { panelNumber: 5, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine planifie une visite'] },
  { panelNumber: 6, narrativeFunction: 'scheduling', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['RDV programmé'] },
  { panelNumber: 7, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['visite planifiée'] },
  { panelNumber: 8, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['diagnostic détaillé'] },
  { panelNumber: 9, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['explication au client'] },
  { panelNumber: 10, narrativeFunction: 'repair_action', allowedActors: ['technicien', 'commercial'], allowedLocations: ['maison'], mandatoryConstraints: ['proposition de travaux + devis'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['client confiant, plan clair'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA expertise : un pro pour comprendre'] },
];

// ============================================================================
// 5. AVANT / APRÈS — focus visuel sur la transformation
// État dégradé → appel → intervention → transformation visible → fierté
// ============================================================================

const AVANT_APRES_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['vue du défaut visible'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['état dégradé montré clairement'] },
  { panelNumber: 3, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client veut que ça change'] },
  { panelNumber: 4, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['appel pour amélioration'] },
  { panelNumber: 5, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine organise'] },
  { panelNumber: 6, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['arrivée du technicien'] },
  { panelNumber: 7, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['évaluation de l\'état'] },
  { panelNumber: 8, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['travail en cours'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['finitions'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['résultat AVANT/APRÈS saisissant'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['fierté et satisfaction'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA transformation visible'] },
];

// ============================================================================
// 6. PROBLÈME AGGRAVÉ — le client a attendu trop longtemps
// Petit signe → ignoré → ignoré encore → gros dégât → appel tardif → sauvetage
// ============================================================================

const PROBLEME_AGGRAVE_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['il y a quelques semaines...'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['premier signe léger'] },
  { panelNumber: 3, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client minimise, ignore'] },
  { panelNumber: 4, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['dégradation visible'] },
  { panelNumber: 5, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['dégât sérieux maintenant'] },
  { panelNumber: 6, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['appel trop tard, mais nécessaire'] },
  { panelNumber: 7, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine rassure malgré le retard'] },
  { panelNumber: 8, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['arrivée, constat étendu'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['sécurisation + début travaux'] },
  { panelNumber: 10, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien', 'commercial'], allowedLocations: ['maison'], mandatoryConstraints: ['devis travaux complets'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['zone sécurisée, plan en place'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA prévention : n\'attendez pas'] },
];

// ============================================================================
// 7. RÉPARATION IMMÉDIATE — surprise → fix express → reparti
// Problème soudain mais simple → appel → technicien → réparé en 30 min
// ============================================================================

const REPARATION_IMMEDIATE_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['moment du quotidien'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['surprise, problème net'] },
  { panelNumber: 3, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['réaction rapide'] },
  { panelNumber: 4, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine : c\'est pris en charge'] },
  { panelNumber: 5, narrativeFunction: 'scheduling', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['technicien dispo rapidement'] },
  { panelNumber: 6, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['exterieur'], mandatoryConstraints: ['arrivée express'] },
  { panelNumber: 7, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['diagnostic rapide'] },
  { panelNumber: 8, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['réparation courte et propre'] },
  { panelNumber: 9, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['c\'est réglé'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['retour à la normale'] },
  { panelNumber: 11, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['la vie reprend, sourire'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA rapidité : un appel suffit'] },
];

// ============================================================================
// 8. MISE EN SÉCURITÉ — danger → sécurisation → pas de réparation immédiate
// Danger détecté → appel urgent → technicien sécurise → zone protégée → devis
// ============================================================================

const MISE_EN_SECURITE_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['moment anodin'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['danger détecté'] },
  { panelNumber: 3, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['peur, risque immédiat'] },
  { panelNumber: 4, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['appel urgent, ne rien toucher'] },
  { panelNumber: 5, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine : on arrive vite'] },
  { panelNumber: 6, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['exterieur'], mandatoryConstraints: ['arrivée prioritaire'] },
  { panelNumber: 7, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['évaluation du danger'] },
  { panelNumber: 8, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['sécurisation zone'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['protection, condamnation si besoin'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['plus de danger immédiat'] },
  { panelNumber: 11, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['explication + suite à prévoir'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA sécurité : ne prenez pas de risque'] },
];

// ============================================================================
// 9. INTERVENTION PRÉVENTIVE — pas de panne, entretien proactif
// Client prévoyant → appel entretien → visite → vérification → tout va bien
// ============================================================================

const INTERVENTION_PREVENTIVE_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['client prévoyant'] },
  { panelNumber: 2, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['ça fait longtemps qu\'on n\'a pas vérifié'] },
  { panelNumber: 3, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['appel préventif, pas d\'urgence'] },
  { panelNumber: 4, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine programme la visite'] },
  { panelNumber: 5, narrativeFunction: 'scheduling', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['RDV calé à convenance'] },
  { panelNumber: 6, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['visite sereine'] },
  { panelNumber: 7, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['vérification complète'] },
  { panelNumber: 8, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['point faible détecté à temps'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['petit ajustement préventif'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['tout est vérifié et OK'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['tranquillité d\'esprit'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA prévention : mieux vaut prévenir'] },
];

// ============================================================================
// 10. PETIT PROBLÈME ÉVITÉ — détection d'un souci mineur avant dégât
// Signe discret → client attentif → appel → fix rapide → catastrophe évitée
// ============================================================================

const PETIT_PROBLEME_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['routine'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['petit signe discret'] },
  { panelNumber: 3, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client hésite : grave ou pas ?'] },
  { panelNumber: 4, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['appelle par prudence'] },
  { panelNumber: 5, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine : bien fait d\'appeler'] },
  { panelNumber: 6, narrativeFunction: 'scheduling', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['intervention planifiée'] },
  { panelNumber: 7, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['arrivée calme'] },
  { panelNumber: 8, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['il confirme : c\'était bien un vrai souci'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['réparation simple et rapide'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['catastrophe évitée'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client a bien fait d\'appeler'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA vigilance : écoutez les signes'] },
];

// ============================================================================
// 11. ERREUR BRICOLAGE — le client a voulu faire seul, ça a empiré
// Tentative DIY → aggravation → appel gêné → technicien rattrape → leçon
// ============================================================================

const ERREUR_BRICOLAGE_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['client motivé bricolage'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['petit problème initial'] },
  { panelNumber: 3, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client tente de réparer seul'] },
  { panelNumber: 4, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le bricolage aggrave tout'] },
  { panelNumber: 5, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['résultat pire qu\'avant'] },
  { panelNumber: 6, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['appel résigné, besoin d\'un vrai pro'] },
  { panelNumber: 7, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine sans jugement'] },
  { panelNumber: 8, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['arrivée, constat du bricolage'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['il défait le bricolage, puis répare'] },
  { panelNumber: 10, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['réparation propre'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['client soulagé, leçon retenue'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA expertise : laissez faire un pro'] },
];

// ============================================================================
// 12. RETOUR CONFORT — pas d'urgence, amélioration qualité de vie
// Inconfort quotidien → décision d'améliorer → intervention → mieux vivre
// ============================================================================

const RETOUR_CONFORT_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client vit avec un inconfort'] },
  { panelNumber: 2, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['ça dure depuis longtemps'] },
  { panelNumber: 3, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le déclic : ça suffit'] },
  { panelNumber: 4, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['appel pour amélioration'] },
  { panelNumber: 5, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine conseille'] },
  { panelNumber: 6, narrativeFunction: 'scheduling', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['RDV à convenance'] },
  { panelNumber: 7, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['visite sereine'] },
  { panelNumber: 8, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['intervention d\'amélioration'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['finitions soignées'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['le confort est retrouvé'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client profite du résultat'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA confort : votre bien-être compte'] },
];

// ============================================================================
// 13. RÉSOLUTION PROGRESSIVE — problème complexe, plusieurs étapes
// Problème multi-couche → diagnostic → étape 1 → étape 2 → résolu
// ============================================================================

const RESOLUTION_PROGRESSIVE_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['situation installée'] },
  { panelNumber: 2, narrativeFunction: 'problem_appears', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['problème pas évident'] },
  { panelNumber: 3, narrativeFunction: 'problem_worsens', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['complexité découverte'] },
  { panelNumber: 4, narrativeFunction: 'decision_to_call', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['besoin d\'expertise'] },
  { panelNumber: 5, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine écoute et qualifie'] },
  { panelNumber: 6, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['arrivée technicien'] },
  { panelNumber: 7, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['diagnostic en plusieurs étapes'] },
  { panelNumber: 8, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['première action corrective'] },
  { panelNumber: 9, narrativeFunction: 'repair_action', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['seconde action, résolution'] },
  { panelNumber: 10, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['vérification finale'] },
  { panelNumber: 11, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['tout fonctionne'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA expertise : un vrai diagnostic fait la différence'] },
];

// ============================================================================
// 14. SUIVI CLIENT — retour après première intervention
// Rappel → visite de suivi → vérification → tout tient → fidélisation
// ============================================================================

const SUIVI_CLIENT_PANELS: PanelRule[] = [
  { panelNumber: 1, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['quelques semaines après l\'intervention'] },
  { panelNumber: 2, narrativeFunction: 'client_setup', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['le client utilise normalement'] },
  { panelNumber: 3, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['HelpConfort rappelle pour le suivi'] },
  { panelNumber: 4, narrativeFunction: 'call_received', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['Amandine : on passe vérifier'] },
  { panelNumber: 5, narrativeFunction: 'scheduling', allowedActors: ['assistante'], allowedLocations: ['bureau'], mandatoryConstraints: ['visite de suivi programmée'] },
  { panelNumber: 6, narrativeFunction: 'technician_arrival', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['retour du même technicien'] },
  { panelNumber: 7, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['vérification de la réparation'] },
  { panelNumber: 8, narrativeFunction: 'inspection_diagnosis', allowedActors: ['technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['tout tient bien'] },
  { panelNumber: 9, narrativeFunction: 'result_visible', allowedActors: ['client', 'technicien'], allowedLocations: ['maison'], mandatoryConstraints: ['confirmation que tout va bien'] },
  { panelNumber: 10, narrativeFunction: 'result_visible', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['client satisfait et fidélisé'] },
  { panelNumber: 11, narrativeFunction: 'client_context', allowedActors: ['client'], allowedLocations: ['maison'], mandatoryConstraints: ['confiance renforcée'] },
  { panelNumber: 12, narrativeFunction: 'cta_moral', allowedActors: [], allowedLocations: [], mandatoryConstraints: ['CTA proximité : on ne vous oublie pas'] },
];

// ============================================================================
// EXPORT DES 14 TEMPLATES
// ============================================================================

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    key: 'urgence_simple',
    label: 'Urgence simple',
    storyFamily: 'urgence_domestique',
    tensionCurve: 'normal_to_panic_to_resolved',
    outcomeType: 'reparation_immediate',
    brandPromise: 'reactivite',
    panelRules: URGENCE_SIMPLE_PANELS,
  },
  {
    key: 'panne_progressive',
    label: 'Panne progressive',
    storyFamily: 'panne_progressive',
    tensionCurve: 'slow_build_to_action',
    outcomeType: 'reparation_immediate',
    brandPromise: 'expertise',
    panelRules: PANNE_PROGRESSIVE_PANELS,
  },
  {
    key: 'provisoire_devis',
    label: 'Provisoire + devis',
    storyFamily: 'reparation_provisoire',
    tensionCurve: 'normal_to_panic_to_resolved',
    outcomeType: 'provisoire_plus_devis',
    brandPromise: 'rassurance',
    panelRules: PROVISOIRE_DEVIS_PANELS,
  },
  {
    key: 'diagnostic_travaux',
    label: 'Diagnostic + travaux',
    storyFamily: 'diagnostic_devis',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'diagnostic_plus_travaux',
    brandPromise: 'expertise',
    panelRules: DIAGNOSTIC_TRAVAUX_PANELS,
  },
  {
    key: 'avant_apres',
    label: 'Avant / Après',
    storyFamily: 'avant_apres',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'reparation_immediate',
    brandPromise: 'expertise',
    panelRules: AVANT_APRES_PANELS,
  },
  {
    key: 'probleme_aggrave',
    label: 'Problème aggravé',
    storyFamily: 'probleme_ignore',
    tensionCurve: 'slow_build_to_action',
    outcomeType: 'provisoire_plus_devis',
    brandPromise: 'rassurance',
    panelRules: PROBLEME_AGGRAVE_PANELS,
  },
  {
    key: 'reparation_immediate',
    label: 'Réparation immédiate',
    storyFamily: 'intervention_rapide',
    tensionCurve: 'surprise_to_quick_fix',
    outcomeType: 'reparation_immediate',
    brandPromise: 'reactivite',
    panelRules: REPARATION_IMMEDIATE_PANELS,
  },
  {
    key: 'mise_en_securite',
    label: 'Mise en sécurité',
    storyFamily: 'mise_en_securite',
    tensionCurve: 'normal_to_panic_to_resolved',
    outcomeType: 'mise_en_securite',
    brandPromise: 'reactivite',
    panelRules: MISE_EN_SECURITE_PANELS,
  },
  {
    key: 'intervention_preventive',
    label: 'Intervention préventive',
    storyFamily: 'entretien_preventif',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'diagnostic_plus_travaux',
    brandPromise: 'proximite',
    panelRules: INTERVENTION_PREVENTIVE_PANELS,
  },
  {
    key: 'petit_probleme_evite',
    label: 'Petit problème évité',
    storyFamily: 'retour_confort',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'reparation_immediate',
    brandPromise: 'proximite',
    panelRules: PETIT_PROBLEME_PANELS,
  },
  {
    key: 'erreur_bricolage',
    label: 'Erreur de bricolage',
    storyFamily: 'mauvais_bricolage',
    tensionCurve: 'slow_build_to_action',
    outcomeType: 'reparation_immediate',
    brandPromise: 'expertise',
    panelRules: ERREUR_BRICOLAGE_PANELS,
  },
  {
    key: 'retour_confort',
    label: 'Retour au confort',
    storyFamily: 'amelioration_confort',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'reparation_immediate',
    brandPromise: 'proximite',
    panelRules: RETOUR_CONFORT_PANELS,
  },
  {
    key: 'resolution_progressive',
    label: 'Résolution progressive',
    storyFamily: 'resolution_progressive',
    tensionCurve: 'slow_build_to_action',
    outcomeType: 'reparation_immediate',
    brandPromise: 'expertise',
    panelRules: RESOLUTION_PROGRESSIVE_PANELS,
  },
  {
    key: 'suivi_client',
    label: 'Suivi client',
    storyFamily: 'suivi_client',
    tensionCurve: 'calm_to_resolved',
    outcomeType: 'diagnostic_plus_travaux',
    brandPromise: 'proximite',
    panelRules: SUIVI_CLIENT_PANELS,
  },
];

/** Get template by key */
export function getTemplate(key: string): StoryTemplate | undefined {
  return STORY_TEMPLATES.find(t => t.key === key);
}
