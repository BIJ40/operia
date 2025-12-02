/**
 * STATiA-BY-BIJ - Métriques POC
 * 
 * Définitions des 2 métriques de preuve de concept:
 * 1. CA mensuel
 * 2. Durée moyenne des interventions travaux
 */

import { MetricDefinition } from '../types';

export const POC_METRICS: MetricDefinition[] = [
  // ============================================
  // MÉTRIQUE 1: CA MENSUEL
  // ============================================
  {
    id: 'ca_mensuel',
    label: 'CA Mensuel',
    description_agence: 'Chiffre d\'affaires facturé sur le mois sélectionné (hors avoirs)',
    description_franchiseur: 'Somme du CA HT facturé par agence ou sur l\'ensemble du réseau',
    scope: 'agency',
    input_sources: [
      {
        source: 'factures',
        filters: [
          { field: 'type', operator: 'neq', value: 'avoir' }
        ]
      }
    ],
    formula: {
      type: 'sum',
      field: 'data.totalHT',
      unit: 'euros',
      transform: 'round'
    },
    compute_hint: 'auto',
    validation_status: 'validated',
    visibility: ['agency', 'franchiseur'],
    cache_ttl_seconds: 300, // 5 minutes
  },

  // ============================================
  // MÉTRIQUE 2: DURÉE MOYENNE INTERVENTIONS TRAVAUX
  // ============================================
  {
    id: 'avg_intervention_duration_travaux',
    label: 'Durée moyenne interventions travaux',
    description_agence: 'Temps moyen passé par intervention de type travaux (en minutes)',
    description_franchiseur: 'Moyenne réseau de la durée des interventions travaux par agence',
    scope: 'agency',
    input_sources: [
      {
        source: 'interventions',
        filters: [
          { field: 'type', operator: 'eq', value: 'technique' },
          { field: 'state', operator: 'in', value: ['completed', 'validated'] }
        ]
      }
    ],
    formula: {
      type: 'avg',
      field: 'calculatedDuration', // Champ calculé dynamiquement
      unit: 'minutes',
      transform: 'round'
    },
    compute_hint: 'frontend',
    validation_status: 'validated',
    visibility: ['agency', 'franchiseur'],
    cache_ttl_seconds: 600, // 10 minutes
  },

  // ============================================
  // MÉTRIQUES ADDITIONNELLES (draft pour démonstration)
  // ============================================
  {
    id: 'ca_par_technicien',
    label: 'CA par Technicien',
    description_agence: 'Répartition du CA facturé par technicien',
    description_franchiseur: 'Analyse comparative du CA par technicien sur le réseau',
    scope: 'tech',
    input_sources: [
      {
        source: 'factures',
        filters: [
          { field: 'type', operator: 'neq', value: 'avoir' }
        ]
      },
      {
        source: 'interventions',
        joinOn: 'projectId'
      }
    ],
    formula: {
      type: 'sum',
      field: 'data.totalHT',
      groupBy: ['userId'],
      unit: 'euros'
    },
    compute_hint: 'auto',
    validation_status: 'draft',
    visibility: ['agency', 'franchiseur'],
    cache_ttl_seconds: 600,
  },

  {
    id: 'nb_interventions_par_apporteur',
    label: 'Interventions par Apporteur',
    description_agence: 'Nombre d\'interventions réalisées par apporteur',
    description_franchiseur: 'Volume d\'activité généré par chaque apporteur sur le réseau',
    scope: 'apporteur',
    input_sources: [
      {
        source: 'interventions',
        filters: [
          { field: 'state', operator: 'in', value: ['completed', 'validated'] }
        ]
      },
      {
        source: 'projects',
        joinOn: 'projectId'
      }
    ],
    formula: {
      type: 'count',
      groupBy: ['data.commanditaireId'],
    },
    compute_hint: 'auto',
    validation_status: 'draft',
    visibility: ['agency', 'franchiseur'],
    cache_ttl_seconds: 600,
  },

  {
    id: 'taux_sav',
    label: 'Taux de SAV',
    description_agence: 'Pourcentage de dossiers en SAV (retour intervention)',
    description_franchiseur: 'Taux de SAV moyen sur le réseau - indicateur qualité',
    scope: 'agency',
    input_sources: [
      {
        source: 'projects'
      }
    ],
    formula: {
      type: 'ratio',
      numerator: {
        type: 'count',
        filters: [
          { field: 'data.isSAV', operator: 'eq', value: true }
        ]
      },
      denominator: {
        type: 'count'
      },
      unit: 'percent',
      transform: 'round'
    },
    compute_hint: 'frontend',
    validation_status: 'draft',
    visibility: ['agency', 'franchiseur'],
    cache_ttl_seconds: 600,
  },
];

/**
 * Récupère une définition de métrique POC par son ID
 */
export function getPocMetricById(id: string): MetricDefinition | undefined {
  return POC_METRICS.find(m => m.id === id);
}

/**
 * Récupère toutes les métriques POC validées
 */
export function getValidatedPocMetrics(): MetricDefinition[] {
  return POC_METRICS.filter(m => m.validation_status === 'validated');
}
