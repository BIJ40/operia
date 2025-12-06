/**
 * StatIA AI Search - Registre des métriques officielles
 * Source de vérité pour validation LLM
 */

import type { DimensionType, IntentType } from './types';

// ═══════════════════════════════════════════════════════════════
// DÉFINITION MÉTRIQUE
// ═══════════════════════════════════════════════════════════════

export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  category: MetricCategory;
  dimensions: DimensionType[];
  supportedIntents: IntentType[];
  unit: MetricUnit;
  minRole: number;  // N0=0, N1=1, N2=2, etc.
  isRanking: boolean;
  defaultTopN?: number;
  keywords: string[];  // Pour matching NL
}

export type MetricCategory = 
  | 'ca'           // Chiffre d'affaires
  | 'recouvrement' // Encours, impayés
  | 'sav'          // Service après-vente
  | 'devis'        // Devis, transformation
  | 'dossiers'     // Volume dossiers
  | 'interventions'// Interventions
  | 'delais'       // Délais
  | 'productivite'; // Productivité

export type MetricUnit = 
  | 'currency'     // €
  | 'percent'      // %
  | 'count'        // Nombre
  | 'days'         // Jours
  | 'hours';       // Heures

// ═══════════════════════════════════════════════════════════════
// REGISTRE COMPLET
// ═══════════════════════════════════════════════════════════════

export const METRICS_REGISTRY: MetricDefinition[] = [
  // ─────────────────────────────────────────────────────────────
  // CHIFFRE D'AFFAIRES
  // ─────────────────────────────────────────────────────────────
  {
    id: 'ca_global_ht',
    label: 'CA Global HT',
    description: 'Chiffre d\'affaires total hors taxes',
    category: 'ca',
    dimensions: ['global'],
    supportedIntents: ['valeur', 'compare'],
    unit: 'currency',
    minRole: 2,
    isRanking: false,
    keywords: ['ca', 'chiffre affaires', 'total', 'global', 'ht'],
  },
  {
    id: 'ca_par_technicien',
    label: 'CA par Technicien',
    description: 'Chiffre d\'affaires réparti par technicien',
    category: 'ca',
    dimensions: ['technicien'],
    supportedIntents: ['valeur', 'top', 'moyenne'],
    unit: 'currency',
    minRole: 2,
    isRanking: true,
    defaultTopN: 10,
    keywords: ['ca', 'chiffre affaires', 'technicien', 'tech', 'par technicien'],
  },
  {
    id: 'ca_par_univers',
    label: 'CA par Univers',
    description: 'Chiffre d\'affaires réparti par univers métier',
    category: 'ca',
    dimensions: ['univers'],
    supportedIntents: ['valeur', 'top', 'moyenne'],
    unit: 'currency',
    minRole: 2,
    isRanking: true,
    defaultTopN: 10,
    keywords: ['ca', 'chiffre affaires', 'univers', 'metier', 'par univers'],
  },
  {
    id: 'ca_par_apporteur',
    label: 'CA par Apporteur',
    description: 'Chiffre d\'affaires réparti par apporteur',
    category: 'ca',
    dimensions: ['apporteur'],
    supportedIntents: ['valeur', 'top', 'moyenne'],
    unit: 'currency',
    minRole: 2,
    isRanking: true,
    defaultTopN: 10,
    keywords: ['ca', 'chiffre affaires', 'apporteur', 'commanditaire', 'prescripteur', 'par apporteur'],
  },
  {
    id: 'ca_moyen_par_jour',
    label: 'CA Moyen par Jour',
    description: 'Chiffre d\'affaires moyen quotidien',
    category: 'ca',
    dimensions: ['global'],
    supportedIntents: ['moyenne'],
    unit: 'currency',
    minRole: 2,
    isRanking: false,
    keywords: ['ca', 'moyen', 'jour', 'quotidien', 'moyenne jour'],
  },
  {
    id: 'ca_moyen_par_tech',
    label: 'CA Moyen par Technicien',
    description: 'Chiffre d\'affaires moyen par technicien',
    category: 'ca',
    dimensions: ['technicien'],
    supportedIntents: ['moyenne'],
    unit: 'currency',
    minRole: 2,
    isRanking: false,
    keywords: ['ca', 'moyen', 'technicien', 'moyenne technicien'],
  },
  {
    id: 'top_techniciens_ca',
    label: 'Top Techniciens CA',
    description: 'Classement des techniciens par CA',
    category: 'ca',
    dimensions: ['technicien'],
    supportedIntents: ['top'],
    unit: 'currency',
    minRole: 2,
    isRanking: true,
    defaultTopN: 5,
    keywords: ['top', 'meilleur', 'technicien', 'ca', 'classement technicien'],
  },
  
  // ─────────────────────────────────────────────────────────────
  // RECOUVREMENT
  // ─────────────────────────────────────────────────────────────
  {
    id: 'reste_a_encaisser',
    label: 'Reste à Encaisser',
    description: 'Montant total des encours clients',
    category: 'recouvrement',
    dimensions: ['global'],
    supportedIntents: ['valeur'],
    unit: 'currency',
    minRole: 2,
    isRanking: false,
    keywords: ['recouvrement', 'encours', 'reste', 'encaisser', 'impaye', 'du', 'client'],
  },
  {
    id: 'taux_recouvrement',
    label: 'Taux de Recouvrement',
    description: 'Pourcentage de CA encaissé',
    category: 'recouvrement',
    dimensions: ['global'],
    supportedIntents: ['taux'],
    unit: 'percent',
    minRole: 2,
    isRanking: false,
    keywords: ['taux', 'recouvrement', 'pourcentage', 'encaisse'],
  },
  
  // ─────────────────────────────────────────────────────────────
  // SAV
  // ─────────────────────────────────────────────────────────────
  {
    id: 'taux_sav_global',
    label: 'Taux SAV Global',
    description: 'Pourcentage de SAV sur dossiers',
    category: 'sav',
    dimensions: ['global'],
    supportedIntents: ['taux'],
    unit: 'percent',
    minRole: 2,
    isRanking: false,
    keywords: ['sav', 'taux', 'service apres vente', 'garantie'],
  },
  {
    id: 'nb_sav',
    label: 'Nombre de SAV',
    description: 'Volume de dossiers SAV',
    category: 'sav',
    dimensions: ['global', 'technicien', 'univers'],
    supportedIntents: ['volume'],
    unit: 'count',
    minRole: 2,
    isRanking: false,
    keywords: ['sav', 'nombre', 'volume', 'combien'],
  },
  {
    id: 'sav_par_technicien',
    label: 'SAV par Technicien',
    description: 'Répartition des SAV par technicien',
    category: 'sav',
    dimensions: ['technicien'],
    supportedIntents: ['valeur', 'top'],
    unit: 'count',
    minRole: 2,
    isRanking: true,
    defaultTopN: 10,
    keywords: ['sav', 'technicien', 'par technicien'],
  },
  
  // ─────────────────────────────────────────────────────────────
  // DEVIS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'taux_transformation_devis',
    label: 'Taux Transformation Devis',
    description: 'Pourcentage de devis transformés en factures',
    category: 'devis',
    dimensions: ['global'],
    supportedIntents: ['taux'],
    unit: 'percent',
    minRole: 2,
    isRanking: false,
    keywords: ['taux', 'transformation', 'devis', 'conversion'],
  },
  {
    id: 'nb_devis',
    label: 'Nombre de Devis',
    description: 'Volume de devis émis',
    category: 'devis',
    dimensions: ['global', 'technicien'],
    supportedIntents: ['volume'],
    unit: 'count',
    minRole: 2,
    isRanking: false,
    keywords: ['devis', 'nombre', 'volume', 'combien', 'emis'],
  },
  
  // ─────────────────────────────────────────────────────────────
  // DOSSIERS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'nb_dossiers_crees',
    label: 'Dossiers Créés',
    description: 'Nombre de dossiers créés',
    category: 'dossiers',
    dimensions: ['global'],
    supportedIntents: ['volume'],
    unit: 'count',
    minRole: 2,
    isRanking: false,
    keywords: ['dossier', 'cree', 'ouvert', 'recu', 'nombre', 'volume'],
  },
  {
    id: 'nb_dossiers_par_apporteur',
    label: 'Dossiers par Apporteur',
    description: 'Répartition des dossiers par apporteur',
    category: 'dossiers',
    dimensions: ['apporteur'],
    supportedIntents: ['valeur', 'top'],
    unit: 'count',
    minRole: 2,
    isRanking: true,
    defaultTopN: 10,
    keywords: ['dossier', 'apporteur', 'par apporteur'],
  },
  
  // ─────────────────────────────────────────────────────────────
  // INTERVENTIONS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'nb_interventions',
    label: 'Nombre d\'Interventions',
    description: 'Volume d\'interventions réalisées',
    category: 'interventions',
    dimensions: ['global', 'technicien'],
    supportedIntents: ['volume'],
    unit: 'count',
    minRole: 2,
    isRanking: false,
    keywords: ['intervention', 'nombre', 'volume', 'rdv'],
  },
  
  // ─────────────────────────────────────────────────────────────
  // DÉLAIS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'delai_premier_devis',
    label: 'Délai 1er Devis',
    description: 'Délai moyen entre création dossier et envoi 1er devis',
    category: 'delais',
    dimensions: ['global'],
    supportedIntents: ['delay', 'moyenne'],
    unit: 'days',
    minRole: 2,
    isRanking: false,
    keywords: ['delai', 'premier', 'devis', '1er', 'envoi'],
  },
  {
    id: 'delai_facturation',
    label: 'Délai Facturation',
    description: 'Délai moyen entre fin travaux et facturation',
    category: 'delais',
    dimensions: ['global'],
    supportedIntents: ['delay', 'moyenne'],
    unit: 'days',
    minRole: 2,
    isRanking: false,
    keywords: ['delai', 'facturation', 'facture'],
  },
];

// ═══════════════════════════════════════════════════════════════
// INDEX PRÉCOMPILÉ
// ═══════════════════════════════════════════════════════════════

const METRICS_BY_ID = new Map<string, MetricDefinition>();
const METRICS_BY_KEYWORD = new Map<string, MetricDefinition[]>();

(function buildIndex() {
  for (const metric of METRICS_REGISTRY) {
    METRICS_BY_ID.set(metric.id, metric);
    
    for (const kw of metric.keywords) {
      const existing = METRICS_BY_KEYWORD.get(kw) || [];
      existing.push(metric);
      METRICS_BY_KEYWORD.set(kw, existing);
    }
  }
})();

// ═══════════════════════════════════════════════════════════════
// API PUBLIQUE
// ═══════════════════════════════════════════════════════════════

/**
 * Récupère une métrique par son ID (O(1))
 */
export function getMetricById(id: string): MetricDefinition | undefined {
  return METRICS_BY_ID.get(id);
}

/**
 * Vérifie si un ID de métrique est valide
 */
export function isValidMetricId(id: string): boolean {
  return METRICS_BY_ID.has(id);
}

/**
 * Trouve les métriques correspondant à un mot-clé
 */
export function findMetricsByKeyword(keyword: string): MetricDefinition[] {
  return METRICS_BY_KEYWORD.get(keyword.toLowerCase()) || [];
}

/**
 * Trouve la meilleure métrique pour une combinaison dimension + intent
 */
export function findMetricForIntent(
  dimension: DimensionType,
  intent: IntentType,
  keywords: string[]
): MetricDefinition | null {
  // Scoring des métriques candidates
  const candidates: { metric: MetricDefinition; score: number }[] = [];
  
  for (const metric of METRICS_REGISTRY) {
    let score = 0;
    
    // Dimension match
    if (metric.dimensions.includes(dimension)) {
      score += 0.3;
    }
    
    // Intent match
    if (metric.supportedIntents.includes(intent)) {
      score += 0.3;
    }
    
    // Keyword matches
    for (const kw of keywords) {
      if (metric.keywords.includes(kw.toLowerCase())) {
        score += 0.2;
      }
    }
    
    if (score > 0) {
      candidates.push({ metric, score });
    }
  }
  
  // Trier par score décroissant
  candidates.sort((a, b) => b.score - a.score);
  
  return candidates[0]?.metric || null;
}

/**
 * Liste toutes les métriques d'une catégorie
 */
export function getMetricsByCategory(category: MetricCategory): MetricDefinition[] {
  return METRICS_REGISTRY.filter(m => m.category === category);
}

/**
 * Liste les IDs de métriques valides (pour validation LLM)
 */
export function getAllMetricIds(): string[] {
  return Array.from(METRICS_BY_ID.keys());
}
