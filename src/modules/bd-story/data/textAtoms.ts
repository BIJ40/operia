/**
 * BD Story — Banque de micro-phrases structurée
 * Organisation : universe > narrativeFunction > tone
 * Chaque phrase : 3-8 mots
 */

import { TextAtomEntry, NarrativeFunction, ProblemUniverse } from '../types/bdStory.types';

// ============================================================================
// PHRASES GÉNÉRIQUES (toutes univers)
// ============================================================================

const GENERIC: TextAtomEntry[] = [
  // client_setup
  { text: 'Ce matin, tout semblait normal.', narrativeFunction: 'client_setup', universe: 'general' },
  { text: 'Un début de journée tranquille.', narrativeFunction: 'client_setup', universe: 'general' },
  { text: 'La maison est calme.', narrativeFunction: 'client_setup', universe: 'general' },
  { text: 'Rien ne laissait prévoir ça.', narrativeFunction: 'client_setup', universe: 'general' },
  { text: 'Une soirée comme les autres.', narrativeFunction: 'client_setup', universe: 'general' },

  // client_context
  { text: 'Le quotidien suit son cours.', narrativeFunction: 'client_context', universe: 'general' },
  { text: 'Les enfants jouent à côté.', narrativeFunction: 'client_context', universe: 'general' },
  { text: 'Le repas est presque prêt.', narrativeFunction: 'client_context', universe: 'general' },
  { text: 'Le week-end vient de commencer.', narrativeFunction: 'client_context', universe: 'general' },
  { text: 'Retour après une longue journée.', narrativeFunction: 'client_context', universe: 'general' },

  // decision_to_call
  { text: 'Il faut appeler un pro.', narrativeFunction: 'decision_to_call', universe: 'general' },
  { text: 'Mieux vaut ne pas attendre.', narrativeFunction: 'decision_to_call', universe: 'general' },
  { text: 'On appelle HelpConfort.', narrativeFunction: 'decision_to_call', universe: 'general' },
  { text: 'Pas le choix, on appelle.', narrativeFunction: 'decision_to_call', universe: 'general' },
  { text: 'Vite, un professionnel.', narrativeFunction: 'decision_to_call', universe: 'general' },

  // call_received
  { text: 'HelpConfort, bonjour !', narrativeFunction: 'call_received', universe: 'general' },
  { text: 'Amandine prend l\'appel.', narrativeFunction: 'call_received', universe: 'general' },
  { text: 'Amandine décroche aussitôt.', narrativeFunction: 'call_received', universe: 'general' },
  { text: 'L\'accueil est immédiat.', narrativeFunction: 'call_received', universe: 'general' },

  // scheduling
  { text: 'On envoie quelqu\'un rapidement.', narrativeFunction: 'scheduling', universe: 'general' },
  { text: 'Intervention planifiée aujourd\'hui.', narrativeFunction: 'scheduling', universe: 'general' },
  { text: 'Un technicien est disponible.', narrativeFunction: 'scheduling', universe: 'general' },
  { text: 'C\'est organisé en quelques minutes.', narrativeFunction: 'scheduling', universe: 'general' },

  // technician_arrival
  { text: 'Le technicien est là.', narrativeFunction: 'technician_arrival', universe: 'general' },
  { text: 'Arrivée rapide sur place.', narrativeFunction: 'technician_arrival', universe: 'general' },
  { text: 'Le camion HelpConfort arrive.', narrativeFunction: 'technician_arrival', universe: 'general' },

  // result_visible
  { text: 'Le problème est réglé.', narrativeFunction: 'result_visible', universe: 'general' },
  { text: 'Tout fonctionne à nouveau.', narrativeFunction: 'result_visible', universe: 'general' },
  { text: 'Le client est soulagé.', narrativeFunction: 'result_visible', universe: 'general' },
  { text: 'La maison retrouve son calme.', narrativeFunction: 'result_visible', universe: 'general' },
  { text: 'Ouf, c\'est réparé.', narrativeFunction: 'result_visible', universe: 'general' },
];

// ============================================================================
// PLOMBERIE
// ============================================================================

const PLOMBERIE: TextAtomEntry[] = [
  { text: 'L\'eau goutte sous l\'évier.', narrativeFunction: 'problem_appears', universe: 'plomberie' },
  { text: 'Une flaque grandit au sol.', narrativeFunction: 'problem_appears', universe: 'plomberie' },
  { text: 'Le meuble commence à gonfler.', narrativeFunction: 'problem_worsens', universe: 'plomberie' },
  { text: 'La fuite s\'aggrave vite.', narrativeFunction: 'problem_worsens', universe: 'plomberie' },
  { text: 'L\'eau ne s\'arrête plus.', narrativeFunction: 'problem_worsens', universe: 'plomberie' },
  { text: 'Il inspecte la canalisation.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie' },
  { text: 'Le tuyau est repéré.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie' },
  { text: 'La fuite est localisée.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie' },
  { text: 'Il colmate la fuite.', narrativeFunction: 'repair_action', universe: 'plomberie' },
  { text: 'Le joint est remplacé.', narrativeFunction: 'repair_action', universe: 'plomberie' },
  { text: 'Plus une goutte.', narrativeFunction: 'result_visible', universe: 'plomberie' },
  { text: 'L\'évier est sauvé.', narrativeFunction: 'result_visible', universe: 'plomberie' },
  { text: 'Le plafond commence à tacher.', narrativeFunction: 'problem_appears', universe: 'plomberie' },
  { text: 'Plus d\'eau chaude ce matin.', narrativeFunction: 'problem_appears', universe: 'plomberie' },
  { text: 'L\'évacuation est bouchée.', narrativeFunction: 'problem_appears', universe: 'plomberie' },
];

// ============================================================================
// ÉLECTRICITÉ
// ============================================================================

const ELECTRICITE: TextAtomEntry[] = [
  { text: 'Tout disjoncte d\'un coup.', narrativeFunction: 'problem_appears', universe: 'electricite' },
  { text: 'La lumière clignote bizarrement.', narrativeFunction: 'problem_appears', universe: 'electricite' },
  { text: 'La prise est chaude au toucher.', narrativeFunction: 'problem_appears', universe: 'electricite' },
  { text: 'Le noir total dans la maison.', narrativeFunction: 'problem_worsens', universe: 'electricite' },
  { text: 'Ça sent le brûlé.', narrativeFunction: 'problem_worsens', universe: 'electricite' },
  { text: 'Il contrôle le tableau.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite' },
  { text: 'La ligne défaillante est repérée.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite' },
  { text: 'Il sécurise le circuit.', narrativeFunction: 'repair_action', universe: 'electricite' },
  { text: 'Mise en sécurité immédiate.', narrativeFunction: 'repair_action', universe: 'electricite' },
  { text: 'La lumière revient enfin.', narrativeFunction: 'result_visible', universe: 'electricite' },
  { text: 'Le courant est stable.', narrativeFunction: 'result_visible', universe: 'electricite' },
];

// ============================================================================
// SERRURERIE
// ============================================================================

const SERRURERIE: TextAtomEntry[] = [
  { text: 'La porte claque derrière lui.', narrativeFunction: 'problem_appears', universe: 'serrurerie' },
  { text: 'La clé se casse net.', narrativeFunction: 'problem_appears', universe: 'serrurerie' },
  { text: 'Impossible d\'entrer chez soi.', narrativeFunction: 'problem_worsens', universe: 'serrurerie' },
  { text: 'Le stress monte rapidement.', narrativeFunction: 'problem_worsens', universe: 'serrurerie' },
  { text: 'Il examine la serrure.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie' },
  { text: 'Le cylindre est extrait.', narrativeFunction: 'repair_action', universe: 'serrurerie' },
  { text: 'Ouverture sans casse.', narrativeFunction: 'repair_action', universe: 'serrurerie' },
  { text: 'L\'accès est rétabli.', narrativeFunction: 'result_visible', universe: 'serrurerie' },
  { text: 'La porte ferme parfaitement.', narrativeFunction: 'result_visible', universe: 'serrurerie' },
];

// ============================================================================
// VITRERIE
// ============================================================================

const VITRERIE: TextAtomEntry[] = [
  { text: 'Un bruit sec surprend.', narrativeFunction: 'problem_appears', universe: 'vitrerie' },
  { text: 'La vitre est fissurée.', narrativeFunction: 'problem_appears', universe: 'vitrerie' },
  { text: 'La fissure s\'étend lentement.', narrativeFunction: 'problem_worsens', universe: 'vitrerie' },
  { text: 'Le séjour devient moins sûr.', narrativeFunction: 'problem_worsens', universe: 'vitrerie' },
  { text: 'Il inspecte le vitrage.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie' },
  { text: 'La zone est sécurisée.', narrativeFunction: 'repair_action', universe: 'vitrerie' },
  { text: 'Le vitrage est remplacé.', narrativeFunction: 'repair_action', universe: 'vitrerie' },
  { text: 'Fenêtre comme neuve.', narrativeFunction: 'result_visible', universe: 'vitrerie' },
];

// ============================================================================
// MENUISERIE
// ============================================================================

const MENUISERIE_ATOMS: TextAtomEntry[] = [
  { text: 'Le volet ne monte plus.', narrativeFunction: 'problem_appears', universe: 'menuiserie' },
  { text: 'La fenêtre ne ferme plus.', narrativeFunction: 'problem_appears', universe: 'menuiserie' },
  { text: 'Ça force de plus en plus.', narrativeFunction: 'problem_worsens', universe: 'menuiserie' },
  { text: 'Le blocage est total.', narrativeFunction: 'problem_worsens', universe: 'menuiserie' },
  { text: 'Il vérifie le mécanisme.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie' },
  { text: 'Le réglage est effectué.', narrativeFunction: 'repair_action', universe: 'menuiserie' },
  { text: 'Le volet coulisse à nouveau.', narrativeFunction: 'result_visible', universe: 'menuiserie' },
  { text: 'L\'ouvrant fonctionne parfaitement.', narrativeFunction: 'result_visible', universe: 'menuiserie' },
];

// ============================================================================
// PEINTURE / RÉNOVATION
// ============================================================================

const PEINTURE_ATOMS: TextAtomEntry[] = [
  { text: 'Le mur est abîmé.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation' },
  { text: 'La peinture s\'écaille.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation' },
  { text: 'La tache s\'étend sur le plafond.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation' },
  { text: 'L\'aspect se dégrade.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation' },
  { text: 'Il prépare le support.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation' },
  { text: 'L\'enduit est appliqué.', narrativeFunction: 'repair_action', universe: 'peinture_renovation' },
  { text: 'La peinture est reprise.', narrativeFunction: 'repair_action', universe: 'peinture_renovation' },
  { text: 'Le mur est comme neuf.', narrativeFunction: 'result_visible', universe: 'peinture_renovation' },
];

// ============================================================================
// EXPORT UNIFIÉ
// ============================================================================

export const ALL_TEXT_ATOMS: TextAtomEntry[] = [
  ...GENERIC,
  ...PLOMBERIE,
  ...ELECTRICITE,
  ...SERRURERIE,
  ...VITRERIE,
  ...MENUISERIE_ATOMS,
  ...PEINTURE_ATOMS,
];

/** Get text atoms for a specific function + universe */
export function getTextAtoms(
  narrativeFunction: NarrativeFunction,
  universe?: ProblemUniverse | 'general',
): TextAtomEntry[] {
  return ALL_TEXT_ATOMS.filter(a => {
    if (a.narrativeFunction !== narrativeFunction) return false;
    if (!universe) return true;
    return a.universe === universe || a.universe === 'general';
  });
}
