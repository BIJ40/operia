/**
 * BD Story — 18 familles narratives
 */

import { StoryFamily } from '../types/bdStory.types';

export const STORY_FAMILIES: StoryFamily[] = [
  { key: 'urgence_domestique', label: 'Urgence domestique', description: 'Problème soudain nécessitant une réaction rapide', tensionLevel: 'high' },
  { key: 'panne_progressive', label: 'Panne progressive', description: 'Problème qui s\'aggrave doucement', tensionLevel: 'medium' },
  { key: 'reparation_provisoire', label: 'Réparation provisoire', description: 'Sécurisation immédiate puis devis pour solution définitive', tensionLevel: 'medium' },
  { key: 'diagnostic_devis', label: 'Diagnostic + devis', description: 'Constat professionnel puis chiffrage', tensionLevel: 'low' },
  { key: 'mauvais_bricolage', label: 'Mauvais bricolage', description: 'Tentative DIY qui aggrave le problème', tensionLevel: 'medium' },
  { key: 'securisation', label: 'Sécurisation', description: 'Mise en sécurité prioritaire', tensionLevel: 'high' },
  { key: 'retour_confort', label: 'Retour au confort', description: 'Restauration du confort quotidien', tensionLevel: 'low' },
  { key: 'entretien_preventif', label: 'Entretien préventif', description: 'Vérification avant que le problème survienne', tensionLevel: 'low' },
  { key: 'probleme_ignore', label: 'Problème ignoré', description: 'Souci négligé qui finit par devenir urgent', tensionLevel: 'medium' },
  { key: 'degat_imprevu', label: 'Dégât imprévu', description: 'Surprise désagréable', tensionLevel: 'high' },
  { key: 'intervention_rapide', label: 'Intervention rapide', description: 'Réaction express', tensionLevel: 'high' },
  { key: 'avant_apres', label: 'Avant / Après', description: 'Transformation visible', tensionLevel: 'low' },
  { key: 'client_rassure', label: 'Client rassuré', description: 'Focus sur la confiance retrouvée', tensionLevel: 'low' },
  { key: 'resolution_progressive', label: 'Résolution progressive', description: 'Étapes logiques vers la solution', tensionLevel: 'medium' },
  { key: 'degradation_visible', label: 'Dégradation visible', description: 'Détérioration constatée qui motive l\'appel', tensionLevel: 'medium' },
  { key: 'mise_en_securite', label: 'Mise en sécurité', description: 'Protection immédiate du foyer', tensionLevel: 'high' },
  { key: 'amelioration_confort', label: 'Amélioration du confort', description: 'Upgrade d\'un élément existant', tensionLevel: 'low' },
  { key: 'suivi_client', label: 'Suivi client', description: 'Retour après intervention, vérification', tensionLevel: 'low' },
];
