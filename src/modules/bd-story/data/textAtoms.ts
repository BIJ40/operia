/**
 * BD Story — Banque de micro-phrases industrielle (500+)
 * Structure : universe × narrativeFunction × tone × urgencyLevel
 * Chaque phrase : 3-8 mots
 */

import { TextAtomEntry, NarrativeFunction, ProblemUniverse } from '../types/bdStory.types';

// ============================================================================
// GENERIC — client_setup (toutes univers)
// ============================================================================

const GENERIC_CLIENT_SETUP: TextAtomEntry[] = [
  // rassurant
  { text: 'Ce matin, tout semblait normal.', narrativeFunction: 'client_setup', universe: 'general', tone: 'rassurant' },
  { text: 'Un début de journée tranquille.', narrativeFunction: 'client_setup', universe: 'general', tone: 'rassurant' },
  { text: 'La maison est calme.', narrativeFunction: 'client_setup', universe: 'general', tone: 'rassurant' },
  { text: 'Le soleil entre dans la pièce.', narrativeFunction: 'client_setup', universe: 'general', tone: 'rassurant' },
  { text: 'Le café du matin, comme d\'habitude.', narrativeFunction: 'client_setup', universe: 'general', tone: 'rassurant' },
  { text: 'La routine suit son cours.', narrativeFunction: 'client_setup', universe: 'general', tone: 'rassurant' },
  // reactif
  { text: 'Rien ne laissait prévoir ça.', narrativeFunction: 'client_setup', universe: 'general', tone: 'reactif' },
  { text: 'Tout allait bien jusque-là.', narrativeFunction: 'client_setup', universe: 'general', tone: 'reactif' },
  { text: 'Personne n\'avait rien remarqué.', narrativeFunction: 'client_setup', universe: 'general', tone: 'reactif' },
  { text: 'En rentrant, rien d\'anormal.', narrativeFunction: 'client_setup', universe: 'general', tone: 'reactif' },
  // proximite
  { text: 'Une soirée comme les autres.', narrativeFunction: 'client_setup', universe: 'general', tone: 'proximite' },
  { text: 'Le quartier dort tranquille.', narrativeFunction: 'client_setup', universe: 'general', tone: 'proximite' },
  { text: 'On profite du week-end.', narrativeFunction: 'client_setup', universe: 'general', tone: 'proximite' },
  { text: 'La famille est réunie.', narrativeFunction: 'client_setup', universe: 'general', tone: 'proximite' },
  { text: 'On ne pense à rien.', narrativeFunction: 'client_setup', universe: 'general', tone: 'proximite' },
  // pedagogique
  { text: 'L\'hiver arrive doucement.', narrativeFunction: 'client_setup', universe: 'general', tone: 'pedagogique' },
  { text: 'La saison change, tout vieillit.', narrativeFunction: 'client_setup', universe: 'general', tone: 'pedagogique' },
  { text: 'Ça faisait des mois sans vérifier.', narrativeFunction: 'client_setup', universe: 'general', tone: 'pedagogique' },
];

// ============================================================================
// GENERIC — client_context
// ============================================================================

const GENERIC_CLIENT_CONTEXT: TextAtomEntry[] = [
  { text: 'Le quotidien suit son cours.', narrativeFunction: 'client_context', universe: 'general', tone: 'rassurant' },
  { text: 'Les enfants jouent à côté.', narrativeFunction: 'client_context', universe: 'general', tone: 'proximite' },
  { text: 'Le repas est presque prêt.', narrativeFunction: 'client_context', universe: 'general', tone: 'proximite' },
  { text: 'Le week-end vient de commencer.', narrativeFunction: 'client_context', universe: 'general', tone: 'rassurant' },
  { text: 'Retour après une longue journée.', narrativeFunction: 'client_context', universe: 'general', tone: 'rassurant' },
  { text: 'Le chat dort sur le canapé.', narrativeFunction: 'client_context', universe: 'general', tone: 'proximite' },
  { text: 'Les invités arrivent ce soir.', narrativeFunction: 'client_context', universe: 'general', tone: 'reactif' },
  { text: 'On s\'apprête à sortir.', narrativeFunction: 'client_context', universe: 'general', tone: 'reactif' },
  { text: 'Un dimanche matin paisible.', narrativeFunction: 'client_context', universe: 'general', tone: 'rassurant' },
  { text: 'Le petit dort encore.', narrativeFunction: 'client_context', universe: 'general', tone: 'proximite' },
  { text: 'On rentre juste de vacances.', narrativeFunction: 'client_context', universe: 'general', tone: 'reactif' },
  { text: 'La maison est prête pour l\'hiver.', narrativeFunction: 'client_context', universe: 'general', tone: 'pedagogique' },
  { text: 'On avait tout vérifié… ou presque.', narrativeFunction: 'client_context', universe: 'general', tone: 'pedagogique' },
  { text: 'La journée s\'annonçait tranquille.', narrativeFunction: 'client_context', universe: 'general', tone: 'rassurant' },
  { text: 'Rien de spécial au programme.', narrativeFunction: 'client_context', universe: 'general', tone: 'rassurant' },
];

// ============================================================================
// GENERIC — decision_to_call
// ============================================================================

const GENERIC_DECISION: TextAtomEntry[] = [
  { text: 'Il faut appeler un pro.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'rassurant' },
  { text: 'Mieux vaut ne pas attendre.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'rassurant' },
  { text: 'On appelle HelpConfort.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'proximite' },
  { text: 'Pas le choix, on appelle.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'reactif' },
  { text: 'Vite, un professionnel.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'On ne va pas bricoler ça.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'pedagogique' },
  { text: 'On ne touche à rien, on appelle.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'rassurant', urgencyLevel: 'forte' },
  { text: 'C\'est pas du bricolage, ça.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'pedagogique' },
  { text: 'Direction le téléphone.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'reactif' },
  { text: 'On sait qui appeler.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'proximite' },
  { text: 'Il faut réagir maintenant.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Un coup de fil suffira.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'rassurant', urgencyLevel: 'faible' },
];

// ============================================================================
// GENERIC — call_received
// ============================================================================

const GENERIC_CALL: TextAtomEntry[] = [
  { text: 'HelpConfort, bonjour !', narrativeFunction: 'call_received', universe: 'general' },
  { text: 'Amandine prend l\'appel.', narrativeFunction: 'call_received', universe: 'general' },
  { text: 'Amandine décroche aussitôt.', narrativeFunction: 'call_received', universe: 'general', tone: 'reactif' },
  { text: 'L\'accueil est immédiat.', narrativeFunction: 'call_received', universe: 'general', tone: 'reactif' },
  { text: 'Amandine rassure le client.', narrativeFunction: 'call_received', universe: 'general', tone: 'rassurant' },
  { text: 'L\'appel est pris en charge.', narrativeFunction: 'call_received', universe: 'general', tone: 'rassurant' },
  { text: 'On vous écoute, pas de panique.', narrativeFunction: 'call_received', universe: 'general', tone: 'rassurant', urgencyLevel: 'forte' },
  { text: 'Amandine note les détails.', narrativeFunction: 'call_received', universe: 'general', tone: 'pedagogique' },
  { text: 'Au standard, réponse rapide.', narrativeFunction: 'call_received', universe: 'general', tone: 'reactif' },
];

// ============================================================================
// GENERIC — scheduling
// ============================================================================

const GENERIC_SCHEDULING: TextAtomEntry[] = [
  { text: 'On envoie quelqu\'un rapidement.', narrativeFunction: 'scheduling', universe: 'general', tone: 'reactif' },
  { text: 'Intervention planifiée aujourd\'hui.', narrativeFunction: 'scheduling', universe: 'general', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Un technicien est disponible.', narrativeFunction: 'scheduling', universe: 'general', tone: 'rassurant' },
  { text: 'C\'est organisé en quelques minutes.', narrativeFunction: 'scheduling', universe: 'general', tone: 'rassurant' },
  { text: 'Le planning est ajusté.', narrativeFunction: 'scheduling', universe: 'general', tone: 'pedagogique' },
  { text: 'Rendez-vous calé dans l\'heure.', narrativeFunction: 'scheduling', universe: 'general', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'On s\'organise tout de suite.', narrativeFunction: 'scheduling', universe: 'general', tone: 'reactif' },
  { text: 'Le technicien est prévenu.', narrativeFunction: 'scheduling', universe: 'general', tone: 'rassurant' },
  { text: 'Passage prévu demain matin.', narrativeFunction: 'scheduling', universe: 'general', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Un créneau se libère vite.', narrativeFunction: 'scheduling', universe: 'general', tone: 'proximite' },
];

// ============================================================================
// GENERIC — technician_arrival
// ============================================================================

const GENERIC_ARRIVAL: TextAtomEntry[] = [
  { text: 'Le technicien est là.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'rassurant' },
  { text: 'Arrivée rapide sur place.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'reactif' },
  { text: 'Le camion HelpConfort arrive.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'proximite' },
  { text: 'Il se présente et s\'équipe.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'pedagogique' },
  { text: 'L\'intervention peut commencer.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'rassurant' },
  { text: 'Il évalue la situation d\'abord.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'pedagogique' },
  { text: 'Le pro est sur place.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'proximite' },
  { text: 'Le véhicule se gare devant.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'proximite' },
];

// ============================================================================
// GENERIC — result_visible
// ============================================================================

const GENERIC_RESULT: TextAtomEntry[] = [
  { text: 'Le problème est réglé.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
  { text: 'Tout fonctionne à nouveau.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
  { text: 'Le client est soulagé.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
  { text: 'La maison retrouve son calme.', narrativeFunction: 'result_visible', universe: 'general', tone: 'proximite' },
  { text: 'Ouf, c\'est réparé.', narrativeFunction: 'result_visible', universe: 'general', tone: 'proximite' },
  { text: 'Un vrai soulagement.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
  { text: 'Le quotidien peut reprendre.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
  { text: 'Le client respire enfin.', narrativeFunction: 'result_visible', universe: 'general', tone: 'proximite' },
  { text: 'Tout est rentré dans l\'ordre.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
  { text: 'Le confort est retrouvé.', narrativeFunction: 'result_visible', universe: 'general', tone: 'proximite' },
  { text: 'Problème résolu, vie normale.', narrativeFunction: 'result_visible', universe: 'general', tone: 'reactif' },
  { text: 'Plus de souci à l\'horizon.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
];

// ============================================================================
// PLOMBERIE
// ============================================================================

const PLOMBERIE: TextAtomEntry[] = [
  // problem_appears
  { text: 'L\'eau goutte sous l\'évier.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Une flaque grandit au sol.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'reactif' },
  { text: 'Le plafond commence à tacher.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Plus d\'eau chaude ce matin.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'reactif' },
  { text: 'L\'évacuation est bouchée.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'rassurant', urgencyLevel: 'moyenne' },
  { text: 'Le robinet ne s\'arrête plus.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'L\'eau suinte le long du mur.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'rassurant' },
  { text: 'La chasse d\'eau ne fonctionne plus.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Le sol est mouillé ce matin.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'reactif' },
  { text: 'De l\'eau coule sans raison.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'reactif' },
  { text: 'Un bruit d\'eau dans le mur.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'Le joint laisse passer l\'eau.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'pedagogique', urgencyLevel: 'faible' },
  { text: 'La pression a chuté d\'un coup.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'reactif' },
  { text: 'Une odeur remonte de l\'évier.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'pedagogique' },

  // problem_worsens
  { text: 'Le meuble commence à gonfler.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif' },
  { text: 'La fuite s\'aggrave vite.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'L\'eau ne s\'arrête plus.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'La tache s\'étend au plafond.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif' },
  { text: 'Le parquet commence à gondoler.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif' },
  { text: 'L\'eau gagne la pièce d\'à côté.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Ça empire d\'heure en heure.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif' },
  { text: 'Le seau ne suffit plus.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'proximite' },
  { text: 'L\'humidité gagne du terrain.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'pedagogique' },

  // inspection_diagnosis
  { text: 'Il inspecte la canalisation.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'Le tuyau défaillant est repéré.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'La fuite est localisée.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Il vérifie l\'ensemble du réseau.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'La cause est identifiée.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Un joint usé, rien de plus.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Le raccord est en cause.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'Il teste la pression.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'Le ballon montre des signes d\'usure.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'pedagogique' },

  // repair_action
  { text: 'Il colmate la fuite.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'reactif' },
  { text: 'Le joint est remplacé.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Le tuyau est changé.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Il coupe l\'arrivée d\'eau.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le raccord est refait proprement.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'L\'évacuation est débouchée.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Soudure nette et précise.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'Il sécurise la zone en attendant.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'rassurant', urgencyLevel: 'forte' },

  // result_visible
  { text: 'Plus une goutte.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'rassurant' },
  { text: 'L\'évier est sauvé.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'proximite' },
  { text: 'L\'eau chaude est de retour.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Le sol est sec et propre.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'rassurant' },
  { text: 'La fuite, c\'est fini.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'proximite' },
  { text: 'Tout coule normalement.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Plus de dégât possible.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'rassurant' },
];

// ============================================================================
// ÉLECTRICITÉ
// ============================================================================

const ELECTRICITE: TextAtomEntry[] = [
  // problem_appears
  { text: 'Tout disjoncte d\'un coup.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'La lumière clignote bizarrement.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'rassurant' },
  { text: 'La prise est chaude au toucher.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Un interrupteur ne répond plus.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Le courant saute régulièrement.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'pedagogique' },
  { text: 'Le tableau fait un bruit bizarre.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'pedagogique' },
  { text: 'Plus rien ne s\'allume.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'La prise sort du mur.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'pedagogique', urgencyLevel: 'moyenne' },
  { text: 'Un appareil fait tout sauter.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'reactif' },
  { text: 'Le luminaire grésille.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'pedagogique' },

  // problem_worsens
  { text: 'Le noir total dans la maison.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Ça sent le brûlé.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le plastique commence à fondre.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Les coupures se multiplient.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'pedagogique' },
  { text: 'La prise noircit sur le mur.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Impossible de remettre le courant.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif' },
  { text: 'Le disjoncteur refuse de tenir.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif' },
  { text: 'L\'odeur devient inquiétante.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },

  // inspection_diagnosis
  { text: 'Il contrôle le tableau.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'pedagogique' },
  { text: 'La ligne défaillante est repérée.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'pedagogique' },
  { text: 'Il teste chaque circuit.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'pedagogique' },
  { text: 'Le défaut est localisé.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'rassurant' },
  { text: 'C\'est un faux contact.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'rassurant', urgencyLevel: 'moyenne' },
  { text: 'La surcharge est identifiée.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'pedagogique' },
  { text: 'L\'installation est vétuste.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'pedagogique' },

  // repair_action
  { text: 'Il sécurise le circuit.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'reactif' },
  { text: 'Mise en sécurité immédiate.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le disjoncteur est remplacé.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'pedagogique' },
  { text: 'La prise est changée.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'rassurant' },
  { text: 'Le câble est refait proprement.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'pedagogique' },
  { text: 'Il isole le circuit dangereux.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le tableau est remis en ordre.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'rassurant' },

  // result_visible
  { text: 'La lumière revient enfin.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'rassurant' },
  { text: 'Le courant est stable.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'rassurant' },
  { text: 'Plus de risque électrique.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'rassurant' },
  { text: 'L\'installation est sûre.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'pedagogique' },
  { text: 'Les appareils fonctionnent normalement.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'rassurant' },
  { text: 'Le tableau est aux normes.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'pedagogique' },
];

// ============================================================================
// SERRURERIE
// ============================================================================

const SERRURERIE: TextAtomEntry[] = [
  // problem_appears
  { text: 'La porte claque derrière lui.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'La clé se casse net.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Impossible de tourner la clé.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'reactif' },
  { text: 'La serrure grince depuis des semaines.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'pedagogique', urgencyLevel: 'faible' },
  { text: 'Le verrou ne tient plus.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'rassurant', urgencyLevel: 'moyenne' },
  { text: 'La porte ne ferme plus bien.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'La clé reste coincée dedans.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'La poignée tombe dans la main.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'proximite' },
  { text: 'On force, mais rien ne bouge.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'reactif' },
  { text: 'La porte résiste, bloquée.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'reactif' },

  // problem_worsens
  { text: 'Impossible d\'entrer chez soi.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le stress monte rapidement.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'reactif' },
  { text: 'Les enfants attendent dehors.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'proximite', urgencyLevel: 'forte' },
  { text: 'Il pleut et on est dehors.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'proximite', urgencyLevel: 'forte' },
  { text: 'La sécurité n\'est plus assurée.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'La nuit tombe, toujours dehors.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'La porte est grande ouverte.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'reactif' },

  // inspection_diagnosis
  { text: 'Il examine la serrure.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'Le cylindre est usé.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'Le mécanisme est grippé.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'Il repère le point de blocage.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'La gâche est décalée.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'pedagogique' },

  // repair_action
  { text: 'Le cylindre est extrait.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'Ouverture sans casse.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'La serrure est remplacée.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'Le pêne est réaligné.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'Il change le barillet.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'Il sécurise la fermeture.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'rassurant' },

  // result_visible
  { text: 'L\'accès est rétabli.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'La porte ferme parfaitement.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'La serrure est fiable.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'On peut rentrer chez soi.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'proximite' },
  { text: 'Fermeture solide et nette.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'Nouvelles clés en main.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'proximite' },
];

// ============================================================================
// VITRERIE
// ============================================================================

const VITRERIE: TextAtomEntry[] = [
  // problem_appears
  { text: 'Un bruit sec surprend.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'reactif' },
  { text: 'La vitre est fissurée.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'Un impact sur la baie vitrée.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'reactif' },
  { text: 'Le carreau est fendu.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'La vitrine est touchée.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le double vitrage est embué.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'pedagogique', urgencyLevel: 'faible' },
  { text: 'Le joint du vitrage lâche.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'Un éclat de verre au sol.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'De l\'air passe par la vitre.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'pedagogique' },

  // problem_worsens
  { text: 'La fissure s\'étend lentement.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'reactif' },
  { text: 'Le séjour devient moins sûr.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'Risque d\'éclats à tout moment.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'La vitre menace de tomber.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'On n\'ose plus ouvrir la fenêtre.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'proximite' },
  { text: 'Le froid entre par la fissure.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'L\'isolation est compromise.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'pedagogique' },

  // inspection_diagnosis
  { text: 'Il inspecte le vitrage.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'Le cadre est vérifié aussi.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'Il mesure pour le remplacement.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'Le type de vitrage est identifié.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'Il évalue l\'étendue du dommage.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'rassurant' },

  // repair_action
  { text: 'La zone est sécurisée.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'reactif' },
  { text: 'Le vitrage est remplacé.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'Il pose une protection temporaire.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le nouveau vitrage est en place.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'Les éclats sont nettoyés.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'Il refait l\'étanchéité.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'pedagogique' },

  // result_visible
  { text: 'Fenêtre comme neuve.', narrativeFunction: 'result_visible', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'Plus de risque d\'éclats.', narrativeFunction: 'result_visible', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'La lumière entre à nouveau.', narrativeFunction: 'result_visible', universe: 'vitrerie', tone: 'proximite' },
  { text: 'Vitrage neuf et étanche.', narrativeFunction: 'result_visible', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'La vitrine est réparée.', narrativeFunction: 'result_visible', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'Le froid ne passe plus.', narrativeFunction: 'result_visible', universe: 'vitrerie', tone: 'proximite' },
];

// ============================================================================
// MENUISERIE
// ============================================================================

const MENUISERIE_ATOMS: TextAtomEntry[] = [
  // problem_appears
  { text: 'Le volet ne monte plus.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'La fenêtre ne ferme plus.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'reactif' },
  { text: 'Le volet est bloqué en haut.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'La porte intérieure coince.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Le bois a gonflé avec l\'humidité.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'La charnière grince fort.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Le rail est tordu.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'La baie coulissante résiste.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'Un volet reste coincé à mi-course.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'reactif' },
  { text: 'La poignée ne tient plus.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'rassurant', urgencyLevel: 'faible' },

  // problem_worsens
  { text: 'Ça force de plus en plus.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'reactif' },
  { text: 'Le blocage est total.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'reactif' },
  { text: 'Le moteur tourne dans le vide.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'La fenêtre bâille, le froid entre.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'proximite' },
  { text: 'On ne peut plus ouvrir du tout.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'reactif' },
  { text: 'Le mécanisme fait un bruit anormal.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Les lames commencent à se décaler.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'pedagogique' },

  // inspection_diagnosis
  { text: 'Il vérifie le mécanisme.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Le guidage est abîmé.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Il démonte le coffre du volet.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'La sangle est usée.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Le problème vient du rail.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'Les paumelles sont décalées.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'pedagogique' },

  // repair_action
  { text: 'Le réglage est effectué.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'Il change la sangle.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Le rail est redressé.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Les charnières sont remplacées.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'Il rabote la porte.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Le mécanisme est remis en place.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'rassurant' },

  // result_visible
  { text: 'Le volet coulisse à nouveau.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'L\'ouvrant fonctionne parfaitement.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'La porte s\'ouvre sans effort.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'proximite' },
  { text: 'Le volet monte et descend.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'La fenêtre se ferme à nouveau.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'Plus de bruit, plus de résistance.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'proximite' },
];

// ============================================================================
// PEINTURE / RÉNOVATION
// ============================================================================

const PEINTURE_ATOMS: TextAtomEntry[] = [
  // problem_appears
  { text: 'Le mur est abîmé.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'La peinture s\'écaille.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'Une tache apparaît au plafond.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'Le papier peint se décolle.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'L\'enduit se fissure par endroits.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Le mur est marqué et rayé.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Des traces d\'humidité apparaissent.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'pedagogique', urgencyLevel: 'moyenne' },
  { text: 'Le plafond a jauni.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Un raccord de peinture se voit.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'La couleur a passé avec le temps.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'pedagogique' },

  // problem_worsens
  { text: 'La tache s\'étend sur le plafond.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'reactif' },
  { text: 'L\'aspect se dégrade.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'La moisissure gagne du terrain.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'pedagogique', urgencyLevel: 'moyenne' },
  { text: 'L\'enduit tombe par morceaux.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'reactif' },
  { text: 'Le mur devient vraiment laid.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'proximite' },
  { text: 'Les invités arrivent bientôt.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'proximite' },
  { text: 'C\'est de pire en pire.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'reactif' },

  // inspection_diagnosis
  { text: 'Il prépare le support.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Il identifie la cause.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Le mur est nettoyé d\'abord.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Il vérifie l\'état du support.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'L\'humidité est traitée en premier.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Il ponce la surface.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'pedagogique' },

  // repair_action
  { text: 'L\'enduit est appliqué.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'La peinture est reprise.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'Il rebouche les fissures.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Le rouleau passe avec précision.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Deux couches pour un résultat net.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Le raccord est invisible.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'rassurant' },

  // result_visible
  { text: 'Le mur est comme neuf.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'Le plafond a retrouvé sa couleur.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'On ne voit plus la reprise.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'La pièce est transformée.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'proximite' },
  { text: 'Aspect propre et uniforme.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'Comme si rien ne s\'était passé.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'proximite' },
];

// ============================================================================
// COMPLÉMENTS PLOMBERIE — variantes supplémentaires
// ============================================================================

const PLOMBERIE_EXTRA: TextAtomEntry[] = [
  { text: 'Le siphon déborde lentement.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'rassurant', urgencyLevel: 'moyenne' },
  { text: 'Une goutte tombe toutes les secondes.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'Le compteur tourne sans raison.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'L\'eau arrive teintée.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'rassurant', urgencyLevel: 'moyenne' },
  { text: 'Le flexible est percé.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'reactif' },
  { text: 'Ça coule même robinet fermé.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le voisin du dessous appelle.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'L\'odeur d\'humidité envahit la pièce.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'Il coupe l\'arrivée générale.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le raccord est étanche maintenant.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Il remplace le flexible.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'Le débit est normal à nouveau.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Le plancher est sec, sauvé.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'proximite' },
  { text: 'La pression est revenue.', narrativeFunction: 'result_visible', universe: 'plomberie', tone: 'rassurant' },
  { text: 'Il vérifie sous la baignoire.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'pedagogique' },
  { text: 'L\'origine est dans le mur.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'pedagogique' },
];

// ============================================================================
// COMPLÉMENTS ÉLECTRICITÉ
// ============================================================================

const ELECTRICITE_EXTRA: TextAtomEntry[] = [
  { text: 'Le micro-ondes fait tout sauter.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'reactif' },
  { text: 'Le radiateur reste froid.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'rassurant', urgencyLevel: 'moyenne' },
  { text: 'Un fil dépasse du mur.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'La veilleuse est morte.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'L\'éclairage extérieur ne marche plus.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'rassurant' },
  { text: 'Le frigo a arrêté de tourner.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif' },
  { text: 'On n\'a plus de chauffage.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Rien ne tient quand on rebranche.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'reactif' },
  { text: 'Il vérifie la terre.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'pedagogique' },
  { text: 'L\'interrupteur est remplacé.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'rassurant' },
  { text: 'Il refait le branchement.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'pedagogique' },
  { text: 'Le différentiel est changé.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'pedagogique' },
  { text: 'Tout est alimenté correctement.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'rassurant' },
  { text: 'Le chauffage repart enfin.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'proximite' },
];

// ============================================================================
// COMPLÉMENTS SERRURERIE
// ============================================================================

const SERRURERIE_EXTRA: TextAtomEntry[] = [
  { text: 'La clé tourne dans le vide.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'La porte grince à chaque ouverture.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'rassurant', urgencyLevel: 'faible' },
  { text: 'Le pêne ne sort plus du tout.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'reactif' },
  { text: 'On a perdu le double aussi.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le bébé est à l\'intérieur.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Le mécanisme est usé jusqu\'au bout.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'Il lubrifie le cylindre.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'La gâche est réalignée.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'pedagogique' },
  { text: 'La porte se verrouille sans effort.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'Le client a ses nouvelles clés.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'proximite' },
  { text: 'La sécurité est renforcée.', narrativeFunction: 'result_visible', universe: 'serrurerie', tone: 'rassurant' },
];

// ============================================================================
// COMPLÉMENTS VITRERIE
// ============================================================================

const VITRERIE_EXTRA: TextAtomEntry[] = [
  { text: 'Le ballon a tapé dans la vitre.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'proximite' },
  { text: 'La grêle a laissé des impacts.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'reactif' },
  { text: 'Le vent a fait voler un carreau.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'On voit à travers la fissure.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'Les morceaux menacent de tomber.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'reactif', urgencyLevel: 'forte' },
  { text: 'Il scotche temporairement.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'reactif' },
  { text: 'Les cotes sont prises pour la commande.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'Le mastic est refait proprement.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'pedagogique' },
  { text: 'Le carreau neuf est posé.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'La baie est à nouveau étanche.', narrativeFunction: 'result_visible', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'On ne voit plus la différence.', narrativeFunction: 'result_visible', universe: 'vitrerie', tone: 'proximite' },
];

// ============================================================================
// COMPLÉMENTS MENUISERIE
// ============================================================================

const MENUISERIE_EXTRA: TextAtomEntry[] = [
  { text: 'Le volet fait un bruit métallique.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'La fenêtre reste entrouverte.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'reactif' },
  { text: 'Le store ne remonte plus.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'L\'air froid passe partout.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'proximite' },
  { text: 'Le cadre se déforme à l\'humidité.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Il graisse les coulisses.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'La lame cassée est remplacée.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'Il ajuste les gonds.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'pedagogique' },
  { text: 'Le volet s\'arrête là où on veut.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'proximite' },
  { text: 'La fenêtre est de nouveau étanche.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'Plus de courant d\'air.', narrativeFunction: 'result_visible', universe: 'menuiserie', tone: 'proximite' },
];

// ============================================================================
// COMPLÉMENTS PEINTURE
// ============================================================================

const PEINTURE_EXTRA: TextAtomEntry[] = [
  { text: 'Le crépi se détache par plaques.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'reactif' },
  { text: 'Les taches ne partent plus.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'L\'ancien locataire a laissé des traces.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'proximite' },
  { text: 'La moisissure noircit l\'angle.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'pedagogique', urgencyLevel: 'moyenne' },
  { text: 'Tout le mur commence à s\'écailler.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'reactif' },
  { text: 'Il gratte les parties qui cloquent.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'Le mur est traité anti-humidité.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'La sous-couche est appliquée.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'pedagogique' },
  { text: 'La finition est impeccable.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'Les murs respirent la propreté.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'proximite' },
  { text: 'La pièce semble plus grande.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'proximite' },
];

// ============================================================================
// COMPLÉMENTS GÉNÉRIQUES — variantes de ton et contexte
// ============================================================================

const GENERIC_EXTRA: TextAtomEntry[] = [
  // client_setup — saisons / contextes
  { text: 'Premier matin de l\'hiver.', narrativeFunction: 'client_setup', universe: 'general', tone: 'pedagogique' },
  { text: 'Le printemps ramène la lumière.', narrativeFunction: 'client_setup', universe: 'general', tone: 'rassurant' },
  { text: 'Les vacances commencent demain.', narrativeFunction: 'client_setup', universe: 'general', tone: 'proximite' },
  { text: 'On rentre d\'un week-end prolongé.', narrativeFunction: 'client_setup', universe: 'general', tone: 'reactif' },
  { text: 'La nuit est tombée depuis longtemps.', narrativeFunction: 'client_setup', universe: 'general', tone: 'reactif' },
  { text: 'Le dimanche s\'écoule tranquillement.', narrativeFunction: 'client_setup', universe: 'general', tone: 'proximite' },
  { text: 'Un matin comme un autre.', narrativeFunction: 'client_setup', universe: 'general', tone: 'rassurant' },
  { text: 'Le réveil sonne, journée chargée.', narrativeFunction: 'client_setup', universe: 'general', tone: 'reactif' },

  // client_context — situations variées
  { text: 'Le bébé vient de s\'endormir.', narrativeFunction: 'client_context', universe: 'general', tone: 'proximite' },
  { text: 'On prépare les valises.', narrativeFunction: 'client_context', universe: 'general', tone: 'reactif' },
  { text: 'Le dîner est au four.', narrativeFunction: 'client_context', universe: 'general', tone: 'proximite' },
  { text: 'Les clients du magasin attendent.', narrativeFunction: 'client_context', universe: 'general', tone: 'reactif' },
  { text: 'Tout le monde dort sauf lui.', narrativeFunction: 'client_context', universe: 'general', tone: 'proximite' },
  { text: 'La machine à laver tourne.', narrativeFunction: 'client_context', universe: 'general', tone: 'rassurant' },

  // decision_to_call — variantes
  { text: 'Assez attendu, on appelle.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'reactif' },
  { text: 'C\'est au-dessus de nos compétences.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'pedagogique' },
  { text: 'On cherche le numéro.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'proximite' },
  { text: 'La voisine recommande HelpConfort.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'proximite' },
  { text: 'On a trouvé le bon numéro.', narrativeFunction: 'decision_to_call', universe: 'general', tone: 'rassurant' },

  // call_received
  { text: 'Amandine comprend tout de suite.', narrativeFunction: 'call_received', universe: 'general', tone: 'rassurant' },
  { text: 'Elle explique la marche à suivre.', narrativeFunction: 'call_received', universe: 'general', tone: 'pedagogique' },
  { text: 'Amandine prend les coordonnées.', narrativeFunction: 'call_received', universe: 'general', tone: 'rassurant' },
  { text: 'Un accueil professionnel et humain.', narrativeFunction: 'call_received', universe: 'general', tone: 'proximite' },

  // scheduling
  { text: 'Amandine cale un créneau.', narrativeFunction: 'scheduling', universe: 'general', tone: 'rassurant' },
  { text: 'Le technicien le plus proche est prévenu.', narrativeFunction: 'scheduling', universe: 'general', tone: 'reactif' },
  { text: 'On s\'adapte à vos horaires.', narrativeFunction: 'scheduling', universe: 'general', tone: 'proximite' },
  { text: 'Confirmation par SMS envoyée.', narrativeFunction: 'scheduling', universe: 'general', tone: 'rassurant' },

  // technician_arrival
  { text: 'Sonnette, c\'est le technicien.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'proximite' },
  { text: 'Il enfile ses protections.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'pedagogique' },
  { text: 'Bonjour, on m\'a prévenu.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'proximite' },
  { text: 'Il sort son matériel du camion.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'pedagogique' },
  { text: 'Poignée de main, on commence.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'proximite' },

  // result_visible — variantes émotionnelles
  { text: 'Un grand merci du client.', narrativeFunction: 'result_visible', universe: 'general', tone: 'proximite' },
  { text: 'La vie normale peut reprendre.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
  { text: 'Le client recommanderait sans hésiter.', narrativeFunction: 'result_visible', universe: 'general', tone: 'proximite' },
  { text: 'On dort tranquille ce soir.', narrativeFunction: 'result_visible', universe: 'general', tone: 'rassurant' },
  { text: 'Terminé, propre, rangé.', narrativeFunction: 'result_visible', universe: 'general', tone: 'reactif' },
  { text: 'Le sourire est revenu.', narrativeFunction: 'result_visible', universe: 'general', tone: 'proximite' },
];

// ============================================================================
// GAP FILL — proximite + rassurant across all universes & functions
// ============================================================================

const GAP_FILL_PLOMBERIE: TextAtomEntry[] = [
  // proximite — problem_appears
  { text: 'Le lavabo goutte sans arrêt.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'proximite' },
  { text: 'L\'eau coule sous l\'évier.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'proximite' },
  { text: 'Le robinet fait des siennes.', narrativeFunction: 'problem_appears', universe: 'plomberie', tone: 'proximite' },
  // proximite — problem_worsens
  { text: 'Toute la cuisine est trempée.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'proximite' },
  { text: 'On met des serpillères partout.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'proximite' },
  // proximite — inspection_diagnosis
  { text: 'Il regarde avec attention.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'proximite' },
  { text: 'Il montre la cause au client.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'proximite' },
  // proximite — repair_action
  { text: 'En quelques gestes, c\'est fait.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'proximite' },
  { text: 'Il répare avec soin.', narrativeFunction: 'repair_action', universe: 'plomberie', tone: 'proximite' },
  // rassurant — problem_worsens
  { text: 'Le dégât reste gérable.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'rassurant' },
  { text: 'On peut encore agir à temps.', narrativeFunction: 'problem_worsens', universe: 'plomberie', tone: 'rassurant' },
  // rassurant — inspection_diagnosis (already some, add more)
  { text: 'Le problème est simple à traiter.', narrativeFunction: 'inspection_diagnosis', universe: 'plomberie', tone: 'rassurant' },
];

const GAP_FILL_ELECTRICITE: TextAtomEntry[] = [
  // proximite — problem_appears
  { text: 'Plus de lumière dans le salon.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'proximite' },
  { text: 'On cherche la lampe torche.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'proximite' },
  { text: 'L\'ampoule grille encore.', narrativeFunction: 'problem_appears', universe: 'electricite', tone: 'proximite' },
  // proximite — problem_worsens
  { text: 'Les enfants ont peur du noir.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'proximite' },
  { text: 'On dîne à la bougie.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'proximite' },
  // proximite — inspection_diagnosis
  { text: 'Il explique ce qu\'il fait.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'proximite' },
  { text: 'Le client regarde, attentif.', narrativeFunction: 'inspection_diagnosis', universe: 'electricite', tone: 'proximite' },
  // proximite — repair_action
  { text: 'Il rebranche avec précaution.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'proximite' },
  { text: 'Chaque connexion est vérifiée.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'proximite' },
  // proximite — result_visible
  { text: 'La maison s\'éclaire à nouveau.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'proximite' },
  { text: 'On retrouve le confort habituel.', narrativeFunction: 'result_visible', universe: 'electricite', tone: 'proximite' },
  // rassurant — problem_worsens
  { text: 'Le problème reste localisé.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'rassurant' },
  { text: 'Pas de dégât visible pour l\'instant.', narrativeFunction: 'problem_worsens', universe: 'electricite', tone: 'rassurant' },
  // rassurant — repair_action
  { text: 'Tout est remis en ordre.', narrativeFunction: 'repair_action', universe: 'electricite', tone: 'rassurant' },
];

const GAP_FILL_SERRURERIE: TextAtomEntry[] = [
  // proximite — problem_appears (already 1, add more)
  { text: 'La porte fait des caprices.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'proximite' },
  { text: 'On galère pour ouvrir.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'proximite' },
  // proximite — inspection_diagnosis
  { text: 'Il repère le souci tout de suite.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'proximite' },
  { text: 'Il explique simplement le blocage.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'proximite' },
  // proximite — repair_action
  { text: 'Il débloque avec douceur.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'proximite' },
  { text: 'La porte cède en douceur.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'proximite' },
  // rassurant — problem_appears (add more)
  { text: 'La serrure résiste un peu.', narrativeFunction: 'problem_appears', universe: 'serrurerie', tone: 'rassurant' },
  // rassurant — problem_worsens
  { text: 'Le souci reste gérable.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'rassurant' },
  { text: 'Pas de panique, on va résoudre.', narrativeFunction: 'problem_worsens', universe: 'serrurerie', tone: 'rassurant' },
  // rassurant — inspection_diagnosis
  { text: 'Le mécanisme est accessible.', narrativeFunction: 'inspection_diagnosis', universe: 'serrurerie', tone: 'rassurant' },
  // rassurant — repair_action
  { text: 'Le remplacement est rapide.', narrativeFunction: 'repair_action', universe: 'serrurerie', tone: 'rassurant' },
];

const GAP_FILL_VITRERIE: TextAtomEntry[] = [
  // proximite — problem_appears
  { text: 'La vitre a pris un coup.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'proximite' },
  { text: 'Le carreau ne tient plus bien.', narrativeFunction: 'problem_appears', universe: 'vitrerie', tone: 'proximite' },
  // proximite — inspection_diagnosis
  { text: 'Il regarde de près la fissure.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'proximite' },
  { text: 'Il rassure le client tout de suite.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'proximite' },
  // proximite — repair_action
  { text: 'Il pose le vitrage avec soin.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'proximite' },
  { text: 'Chaque geste est précis.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'proximite' },
  // rassurant — problem_worsens
  { text: 'Le risque reste contenu.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'rassurant' },
  { text: 'On peut sécuriser rapidement.', narrativeFunction: 'problem_worsens', universe: 'vitrerie', tone: 'rassurant' },
  // rassurant — inspection_diagnosis (add more)
  { text: 'Le dommage est localisé.', narrativeFunction: 'inspection_diagnosis', universe: 'vitrerie', tone: 'rassurant' },
  // rassurant — repair_action
  { text: 'Le remplacement est propre.', narrativeFunction: 'repair_action', universe: 'vitrerie', tone: 'rassurant' },
];

const GAP_FILL_MENUISERIE: TextAtomEntry[] = [
  // proximite — problem_appears
  { text: 'Le volet fait du bruit.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'proximite' },
  { text: 'La fenêtre coince depuis hier.', narrativeFunction: 'problem_appears', universe: 'menuiserie', tone: 'proximite' },
  // proximite — problem_worsens
  { text: 'On ne dort pas bien à cause du bruit.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'proximite' },
  // proximite — inspection_diagnosis
  { text: 'Il montre d\'où vient le problème.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'proximite' },
  { text: 'Il touche le rail, trouvé.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'proximite' },
  // proximite — repair_action
  { text: 'Il règle avec patience.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'proximite' },
  { text: 'Le geste est sûr et calme.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'proximite' },
  // rassurant — problem_worsens
  { text: 'Le souci reste mécanique.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'rassurant' },
  { text: 'Rien de grave, mais il faut agir.', narrativeFunction: 'problem_worsens', universe: 'menuiserie', tone: 'rassurant' },
  // rassurant — inspection_diagnosis
  { text: 'Le problème est vite identifié.', narrativeFunction: 'inspection_diagnosis', universe: 'menuiserie', tone: 'rassurant' },
  // rassurant — repair_action
  { text: 'Le réglage prend quelques minutes.', narrativeFunction: 'repair_action', universe: 'menuiserie', tone: 'rassurant' },
];

const GAP_FILL_PEINTURE: TextAtomEntry[] = [
  // proximite — problem_appears
  { text: 'Le mur fait mauvaise impression.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'proximite' },
  { text: 'La peinture fait triste mine.', narrativeFunction: 'problem_appears', universe: 'peinture_renovation', tone: 'proximite' },
  // proximite — problem_worsens (already 2, add more)
  { text: 'La pièce perd de son charme.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'proximite' },
  // proximite — inspection_diagnosis
  { text: 'Il touche le mur, le son parle.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'proximite' },
  { text: 'Il explique l\'état du support.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'proximite' },
  // proximite — repair_action
  { text: 'Coup de pinceau après coup de pinceau.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'proximite' },
  { text: 'Le mur reprend des couleurs.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'proximite' },
  // rassurant — problem_worsens
  { text: 'C\'est surtout esthétique pour l\'instant.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'rassurant' },
  { text: 'Rien de structurel, on peut agir.', narrativeFunction: 'problem_worsens', universe: 'peinture_renovation', tone: 'rassurant' },
  // rassurant — inspection_diagnosis
  { text: 'Le support est encore sain.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'rassurant' },
  // rassurant — repair_action
  { text: 'L\'application est régulière et nette.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'rassurant' },
  // reactif — inspection_diagnosis
  { text: 'Il repère la zone critique.', narrativeFunction: 'inspection_diagnosis', universe: 'peinture_renovation', tone: 'reactif' },
  // reactif — repair_action
  { text: 'Il intervient sur les zones abîmées.', narrativeFunction: 'repair_action', universe: 'peinture_renovation', tone: 'reactif' },
  // reactif — result_visible
  { text: 'Le dégât est effacé.', narrativeFunction: 'result_visible', universe: 'peinture_renovation', tone: 'reactif' },
];

// Additional generic gaps — proximite for scheduling, call_received, technician_arrival
const GAP_FILL_GENERIC: TextAtomEntry[] = [
  // proximite — call_received
  { text: 'Amandine connaît bien le secteur.', narrativeFunction: 'call_received', universe: 'general', tone: 'proximite' },
  { text: 'Elle met en confiance tout de suite.', narrativeFunction: 'call_received', universe: 'general', tone: 'proximite' },
  // proximite — scheduling
  { text: 'Le rendez-vous est pris simplement.', narrativeFunction: 'scheduling', universe: 'general', tone: 'proximite' },
  { text: 'On se met d\'accord facilement.', narrativeFunction: 'scheduling', universe: 'general', tone: 'proximite' },
  // pedagogique — technician_arrival
  { text: 'Il observe avant de commencer.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'pedagogique' },
  // pedagogique — result_visible
  { text: 'Le résultat parle de lui-même.', narrativeFunction: 'result_visible', universe: 'general', tone: 'pedagogique' },
  { text: 'L\'expertise a fait la différence.', narrativeFunction: 'result_visible', universe: 'general', tone: 'pedagogique' },
  // reactif — result_visible
  { text: 'Situation maîtrisée, fin du stress.', narrativeFunction: 'result_visible', universe: 'general', tone: 'reactif' },
  { text: 'Le pire est derrière eux.', narrativeFunction: 'result_visible', universe: 'general', tone: 'reactif' },
  // rassurant — technician_arrival
  { text: 'Il arrive calmement, prêt à agir.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'rassurant' },
  { text: 'Le client se sent en confiance.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'rassurant' },
  // reactif — scheduling
  { text: 'Pas de temps à perdre.', narrativeFunction: 'scheduling', universe: 'general', tone: 'reactif' },
  // reactif — technician_arrival
  { text: 'Il arrive sans traîner.', narrativeFunction: 'technician_arrival', universe: 'general', tone: 'reactif' },
  // pedagogique — scheduling
  { text: 'Elle explique le déroulement.', narrativeFunction: 'scheduling', universe: 'general', tone: 'pedagogique' },
  // pedagogique — call_received
  { text: 'Elle pose les bonnes questions.', narrativeFunction: 'call_received', universe: 'general', tone: 'pedagogique' },
];

// ============================================================================
// EXPORT UNIFIÉ
// ============================================================================

export const ALL_TEXT_ATOMS: TextAtomEntry[] = [
  ...GENERIC_CLIENT_SETUP,
  ...GENERIC_CLIENT_CONTEXT,
  ...GENERIC_DECISION,
  ...GENERIC_CALL,
  ...GENERIC_SCHEDULING,
  ...GENERIC_ARRIVAL,
  ...GENERIC_RESULT,
  ...PLOMBERIE,
  ...ELECTRICITE,
  ...SERRURERIE,
  ...VITRERIE,
  ...MENUISERIE_ATOMS,
  ...PEINTURE_ATOMS,
  ...PLOMBERIE_EXTRA,
  ...ELECTRICITE_EXTRA,
  ...SERRURERIE_EXTRA,
  ...VITRERIE_EXTRA,
  ...MENUISERIE_EXTRA,
  ...PEINTURE_EXTRA,
  ...GENERIC_EXTRA,
  // Gap fills
  ...GAP_FILL_PLOMBERIE,
  ...GAP_FILL_ELECTRICITE,
  ...GAP_FILL_SERRURERIE,
  ...GAP_FILL_VITRERIE,
  ...GAP_FILL_MENUISERIE,
  ...GAP_FILL_PEINTURE,
  ...GAP_FILL_GENERIC,
];

/** Get text atoms with full filtering */
export function getTextAtoms(
  narrativeFunction: NarrativeFunction,
  universe?: ProblemUniverse | 'general',
  tone?: 'rassurant' | 'pedagogique' | 'reactif' | 'proximite',
  urgencyLevel?: 'faible' | 'moyenne' | 'forte',
): TextAtomEntry[] {
  return ALL_TEXT_ATOMS.filter(a => {
    if (a.narrativeFunction !== narrativeFunction) return false;
    if (universe && a.universe !== universe && a.universe !== 'general') return false;
    if (tone && a.tone && a.tone !== tone) return false;
    if (urgencyLevel && a.urgencyLevel && a.urgencyLevel !== urgencyLevel) return false;
    return true;
  });
}

/** Count total atoms */
export function getTextAtomsCount(): number {
  return ALL_TEXT_ATOMS.length;
}

