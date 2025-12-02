/**
 * STATiA-BY-BIJ - Exemples de définitions de métriques
 * 
 * Ces exemples illustrent les deux comportements C:
 * A) Distribution (groupBy) → tableau par dimension
 * B) Filtre → valeur unique pour une dimension spécifique
 */

import type { MetricDefinitionJSON } from '../engine/metricEngine';

// ============================================
// MÉTRIQUE A - DISTRIBUTION PAR APPORTEUR
// ============================================

/**
 * Nombre de RDV par apporteur (distribution)
 * 
 * Objectif: Obtenir un tableau "apporteur → nombre de RDV" sur la période
 * 
 * Output attendu:
 * {
 *   success: true,
 *   value: 383, // somme totale
 *   breakdown: {
 *     "AXA": 142,
 *     "MAIF": 87,
 *     "GROUPAMA": 61,
 *     ...
 *   }
 * }
 */
export const rdvParApporteurDistribution: MetricDefinitionJSON = {
  id: 'rdv_par_apporteur_distribution',
  label: 'Nombre de RDV par apporteur (distribution)',
  input_sources: {
    primary: 'interventions',
    joins: [
      { from: 'interventions', to: 'projects', on: { local: 'projectId', foreign: 'id' } },
    ],
  },
  formula: {
    type: 'count',
    field: 'id',
    groupBy: ['commanditaireId'], // dimension "apporteur"
  },
  filters: [
    // Filtres standards appliqués via params:
    // - date_from / date_to (automatique)
    // - agency_slug (automatique)
  ],
  dimensions: ['commanditaireId'],
  output_format: {
    type: 'series',
    recommendedChart: 'bar',
    labels: { x: 'Apporteur', y: 'Nombre de RDV' },
  },
};

// ============================================
// MÉTRIQUE B - VALEUR FILTRÉE PAR APPORTEUR
// ============================================

/**
 * Nombre de RDV pour un apporteur spécifique
 * 
 * Objectif: Permettre à l'utilisateur de sélectionner un apporteur et obtenir un seul nombre
 * 
 * Note: Cette métrique nécessite un paramètre dynamique `apporteur_id` dans les params
 * 
 * Output attendu:
 * {
 *   success: true,
 *   value: 87, // nombre pour l'apporteur sélectionné
 *   breakdown: null
 * }
 */
export const rdvPourUnApporteur: MetricDefinitionJSON = {
  id: 'rdv_pour_un_apporteur',
  label: 'Nombre de RDV pour un apporteur',
  input_sources: {
    primary: 'interventions',
    joins: [
      { from: 'interventions', to: 'projects', on: { local: 'projectId', foreign: 'id' } },
    ],
  },
  formula: {
    type: 'count',
    field: 'id',
    groupBy: [], // PAS de groupBy - valeur unique
  },
  filters: [
    // Le filtre apporteur sera ajouté dynamiquement via params.apporteur_id
    // Exemple: { field: 'data.commanditaireId', operator: 'eq', value: 'AXA' }
  ],
  dimensions: [],
  output_format: {
    type: 'single',
    recommendedChart: 'number',
  },
};

// ============================================
// AUTRES EXEMPLES DE DISTRIBUTION
// ============================================

/**
 * CA par univers (distribution)
 */
export const caParUniversDistribution: MetricDefinitionJSON = {
  id: 'ca_par_univers_distribution',
  label: 'CA par univers (distribution)',
  input_sources: {
    primary: 'factures',
    joins: [
      { from: 'factures', to: 'projects', on: { local: 'projectId', foreign: 'id' } },
    ],
  },
  formula: {
    type: 'sum',
    field: 'totalHT',
    groupBy: ['universes'],
  },
  dimensions: ['universes'],
  output_format: {
    type: 'series',
    recommendedChart: 'pie',
    labels: { x: 'Univers', y: 'CA HT (€)' },
  },
};

/**
 * CA par apporteur (distribution)
 */
export const caParApporteurDistribution: MetricDefinitionJSON = {
  id: 'ca_par_apporteur_distribution',
  label: 'CA par apporteur (distribution)',
  input_sources: {
    primary: 'factures',
    joins: [
      { from: 'factures', to: 'projects', on: { local: 'projectId', foreign: 'id' } },
    ],
  },
  formula: {
    type: 'sum',
    field: 'totalHT',
    groupBy: ['commanditaireId'],
  },
  dimensions: ['commanditaireId'],
  output_format: {
    type: 'series',
    recommendedChart: 'bar',
    labels: { x: 'Apporteur', y: 'CA HT (€)' },
  },
};

/**
 * Durée moyenne par technicien (distribution)
 */
export const dureeMoyenneParTechnicien: MetricDefinitionJSON = {
  id: 'duree_moyenne_par_technicien',
  label: 'Durée moyenne par technicien (heures)',
  input_sources: {
    primary: 'interventions',
  },
  formula: {
    type: 'avg',
    field: 'duree', // Champ réel API Apogée
    groupBy: ['userId'],
  },
  filters: [
    { field: 'type', operator: 'eq', value: 'technique' },
  ],
  dimensions: ['userId'],
  output_format: {
    type: 'series',
    recommendedChart: 'bar',
    labels: { x: 'Technicien', y: 'Durée moyenne (h)' },
  },
};

// ============================================
// EXEMPLES DE VALEUR FILTRÉE
// ============================================

/**
 * CA pour un univers spécifique
 */
export const caPourUnUnivers: MetricDefinitionJSON = {
  id: 'ca_pour_un_univers',
  label: 'CA pour un univers',
  input_sources: {
    primary: 'factures',
    joins: [
      { from: 'factures', to: 'projects', on: { local: 'projectId', foreign: 'id' } },
    ],
  },
  formula: {
    type: 'sum',
    field: 'totalHT',
    groupBy: [], // Pas de groupBy - valeur unique
  },
  // Le filtre univers sera ajouté dynamiquement via params.univers_code
  filters: [],
  dimensions: [],
  output_format: {
    type: 'single',
    recommendedChart: 'number',
  },
};

// ============================================
// RÈGLES DE COMPRÉHENSION (pour générateur IA)
// ============================================

/**
 * Règles pour distinguer automatiquement les deux comportements:
 * 
 * 1. Si la requête contient "par [dimension]":
 *    → Créer une métrique avec groupBy = [dimension]
 *    → Exemple: "nombre de RDV par apporteur" → Métrique A (distribution)
 * 
 * 2. Si la requête contient "pour [dimension spécifique]" ou un nom d'apporteur:
 *    → Créer une métrique avec filtre sur la dimension
 *    → Exemple: "CA pour AXA" → Métrique B (valeur filtrée)
 * 
 * 3. Mots-clés pour distribution:
 *    - "par apporteur", "par univers", "par technicien", "par période"
 *    - "ventilation", "répartition", "distribution"
 * 
 * 4. Mots-clés pour filtre:
 *    - "pour l'apporteur X", "pour AXA", "pour MAIF"
 *    - "de l'univers X", "du technicien X"
 */
export const INTERPRETATION_RULES = {
  distribution_patterns: [
    /par\s+(apporteur|univers|technicien|période|mois|semaine|client)/i,
    /ventilation|répartition|distribution/i,
    /top\s+\d+/i,
  ],
  filter_patterns: [
    /pour\s+(l'apporteur|l'univers|le technicien|le client)\s+\w+/i,
    /pour\s+(AXA|MAIF|GROUPAMA|MACIF|ALLIANZ)/i, // Noms d'apporteurs courants
    /de\s+(l'apporteur|l'univers)\s+\w+/i,
  ],
};

// Export de tous les exemples
export const EXAMPLE_METRICS: MetricDefinitionJSON[] = [
  rdvParApporteurDistribution,
  rdvPourUnApporteur,
  caParUniversDistribution,
  caParApporteurDistribution,
  dureeMoyenneParTechnicien,
  caPourUnUnivers,
];
