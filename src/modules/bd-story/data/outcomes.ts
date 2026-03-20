/**
 * BD Story — 40 outcomes d'intervention
 */

import { OutcomeStep } from '../types/bdStory.types';

export const OUTCOMES: OutcomeStep[] = [
  // Réparations
  { slug: 'fuite_stoppee', label: 'Fuite stoppée', actionType: 'reparation', visibleResult: 'Plus de goutte, sol sec' },
  { slug: 'fuite_limitee', label: 'Fuite limitée', actionType: 'provisoire', visibleResult: 'Écoulement réduit, en attente réparation' },
  { slug: 'eau_coupee', label: 'Eau coupée', actionType: 'securisation', visibleResult: 'Arrivée d\'eau fermée' },
  { slug: 'installation_securisee', label: 'Installation sécurisée', actionType: 'securisation', visibleResult: 'Plus de risque immédiat' },
  { slug: 'courant_retabli', label: 'Courant rétabli', actionType: 'reparation', visibleResult: 'Lumière et prises fonctionnelles' },
  { slug: 'zone_isolee', label: 'Zone isolée', actionType: 'securisation', visibleResult: 'Circuit dangereux coupé' },
  { slug: 'prise_reparee', label: 'Prise réparée', actionType: 'reparation', visibleResult: 'Prise fonctionnelle et sûre' },
  { slug: 'tableau_securise', label: 'Tableau sécurisé', actionType: 'securisation', visibleResult: 'Tableau aux normes' },
  { slug: 'porte_ouverte', label: 'Porte ouverte', actionType: 'reparation', visibleResult: 'Accès rétabli' },
  { slug: 'acces_retabli', label: 'Accès rétabli', actionType: 'reparation', visibleResult: 'Entrée fonctionnelle' },
  { slug: 'serrure_remise_en_etat', label: 'Serrure remise en état', actionType: 'reparation', visibleResult: 'Fermeture fiable' },
  { slug: 'vitrage_securise', label: 'Vitrage sécurisé', actionType: 'securisation', visibleResult: 'Plus de risque de chute ou coupure' },
  { slug: 'vitre_remplacee', label: 'Vitre remplacée', actionType: 'reparation', visibleResult: 'Vitrage neuf en place' },
  { slug: 'risque_supprime', label: 'Risque supprimé', actionType: 'securisation', visibleResult: 'Danger éliminé' },
  { slug: 'volet_redebloque', label: 'Volet redébloqué', actionType: 'reparation', visibleResult: 'Volet fonctionnel' },
  { slug: 'fermeture_retablie', label: 'Fermeture rétablie', actionType: 'reparation', visibleResult: 'Porte/fenêtre se ferme correctement' },
  { slug: 'menuiserie_reglee', label: 'Menuiserie réglée', actionType: 'reparation', visibleResult: 'Ouvrant fluide' },
  { slug: 'mecanisme_repare', label: 'Mécanisme réparé', actionType: 'reparation', visibleResult: 'Fonctionnement normal' },
  { slug: 'peinture_reprise', label: 'Peinture reprise', actionType: 'reparation', visibleResult: 'Surface propre et uniforme' },
  { slug: 'mur_remis_propre', label: 'Mur remis propre', actionType: 'reparation', visibleResult: 'Aspect neuf' },
  { slug: 'plafond_restaure', label: 'Plafond restauré', actionType: 'reparation', visibleResult: 'Plus de trace' },
  { slug: 'support_prepare', label: 'Support préparé', actionType: 'reparation', visibleResult: 'Surface prête à peindre' },

  // Sécurisation
  { slug: 'zone_protegee', label: 'Zone protégée', actionType: 'securisation', visibleResult: 'Accès sécurisé' },
  { slug: 'degat_stoppe', label: 'Dégât stoppé', actionType: 'securisation', visibleResult: 'Progression arrêtée' },
  { slug: 'zone_securisee', label: 'Zone sécurisée', actionType: 'securisation', visibleResult: 'Plus de danger' },

  // Diagnostic / Devis
  { slug: 'intervention_terminee', label: 'Intervention terminée', actionType: 'reparation', visibleResult: 'Travail achevé' },
  { slug: 'diagnostic_pose', label: 'Diagnostic posé', actionType: 'inspection', visibleResult: 'Cause identifiée' },
  { slug: 'probleme_identifie', label: 'Problème identifié', actionType: 'inspection', visibleResult: 'Origine claire' },
  { slug: 'devis_prepare', label: 'Devis préparé', actionType: 'chiffrage', visibleResult: 'Chiffrage remis au client' },
  { slug: 'travaux_planifies', label: 'Travaux planifiés', actionType: 'chiffrage', visibleResult: 'Date d\'intervention fixée' },
  { slug: 'solution_proposee', label: 'Solution proposée', actionType: 'inspection', visibleResult: 'Recommandation claire' },

  // Résultat client
  { slug: 'client_rassure', label: 'Client rassuré', actionType: 'reparation', visibleResult: 'Tranquillité retrouvée' },
  { slug: 'usage_retabli', label: 'Usage rétabli', actionType: 'reparation', visibleResult: 'Fonctionnalité normale' },
  { slug: 'confort_retrouve', label: 'Confort retrouvé', actionType: 'reparation', visibleResult: 'Bien-être quotidien' },
  { slug: 'risque_evite', label: 'Risque évité', actionType: 'securisation', visibleResult: 'Danger prévenu' },
  { slug: 'amelioration_visible', label: 'Amélioration visible', actionType: 'reparation', visibleResult: 'Avant/après net' },
  { slug: 'installation_stabilisee', label: 'Installation stabilisée', actionType: 'securisation', visibleResult: 'Équipement fiable' },
  { slug: 'solution_temporaire', label: 'Solution temporaire', actionType: 'provisoire', visibleResult: 'En attente du définitif' },
  { slug: 'solution_definitive', label: 'Solution définitive', actionType: 'reparation', visibleResult: 'Problème réglé durablement' },
  { slug: 'chantier_prepare', label: 'Chantier préparé', actionType: 'mesure', visibleResult: 'Prêt pour intervention complète' },
];
