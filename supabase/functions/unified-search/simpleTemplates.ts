/**
 * Simple Templates Router
 * 20-30 templates légers pour les questions critiques et fréquentes
 */

import type { PostProcessingType } from './statiaPostProcessing.ts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SimpleTemplate {
  id: string;
  patterns: string[];
  metricId: string;
  postProcessing: PostProcessingType;
  entityType?: string;
  requiresSources?: string[];
}

export interface TemplateMatchResult {
  template: SimpleTemplate;
  matchedPattern: string;
  confidence: 'high' | 'medium';
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════

export const SIMPLE_TEMPLATES: SimpleTemplate[] = [
  // ════════════════════════════════════════════════════════════
  // TECHNICIEN TEMPLATES
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_meilleur_technicien',
    patterns: ['meilleur technicien', 'top technicien', 'qui a fait le plus de ca', 'meilleur tech', 'premier technicien'],
    metricId: 'ca_par_technicien',
    postProcessing: 'top_1',
    entityType: 'technicien',
    requiresSources: ['factures', 'projects', 'interventions', 'users']
  },
  {
    id: 'q_top_3_techniciens',
    patterns: ['top 3 technicien', 'trois meilleurs technicien', '3 meilleurs tech'],
    metricId: 'ca_par_technicien',
    postProcessing: 'top_3',
    entityType: 'technicien',
    requiresSources: ['factures', 'projects', 'interventions', 'users']
  },
  {
    id: 'q_ca_par_technicien',
    patterns: ['ca par technicien', 'repartition du ca par technicien', 'chiffre d\'affaires par technicien', 'ca des technicien'],
    metricId: 'ca_par_technicien',
    postProcessing: 'tableau',
    entityType: 'technicien',
    requiresSources: ['factures', 'projects', 'interventions', 'users']
  },
  {
    id: 'q_ca_moyen_technicien',
    patterns: ['ca moyen par technicien', 'moyenne par technicien', 'ca moyen tech'],
    metricId: 'ca_moyen_par_tech',
    postProcessing: 'raw_value',
    requiresSources: ['factures', 'projects', 'interventions', 'users']
  },
  
  // ════════════════════════════════════════════════════════════
  // APPORTEUR TEMPLATES
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_meilleur_apporteur',
    patterns: ['meilleur apporteur', 'top apporteur', 'qui m\'a fait le plus de ca', 'premier apporteur', 'apporteur le plus performant'],
    metricId: 'ca_par_apporteur',
    postProcessing: 'top_1',
    entityType: 'apporteur',
    requiresSources: ['factures', 'projects', 'clients']
  },
  {
    id: 'q_top_3_apporteurs',
    patterns: ['top 3 apporteur', 'trois meilleurs apporteur', '3 meilleurs apporteur'],
    metricId: 'ca_par_apporteur',
    postProcessing: 'top_3',
    entityType: 'apporteur',
    requiresSources: ['factures', 'projects', 'clients']
  },
  {
    id: 'q_ca_par_apporteur',
    patterns: ['ca par apporteur', 'repartition du ca par apporteur', 'chiffre d\'affaires par apporteur', 'ca des apporteur'],
    metricId: 'ca_par_apporteur',
    postProcessing: 'tableau',
    entityType: 'apporteur',
    requiresSources: ['factures', 'projects', 'clients']
  },
  
  // ════════════════════════════════════════════════════════════
  // UNIVERS TEMPLATES
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_meilleur_univers',
    patterns: ['meilleur univers', 'top univers', 'univers le plus performant', 'univers qui performe', 'quel univers'],
    metricId: 'ca_par_univers',
    postProcessing: 'top_1',
    entityType: 'univers',
    requiresSources: ['factures', 'projects']
  },
  {
    id: 'q_ca_par_univers',
    patterns: ['ca par univers', 'repartition du ca par univers', 'chiffre d\'affaires par univers', 'ca des univers', 'ventilation par univers'],
    metricId: 'ca_par_univers',
    postProcessing: 'tableau',
    entityType: 'univers',
    requiresSources: ['factures', 'projects']
  },
  
  // ════════════════════════════════════════════════════════════
  // CA GLOBAL TEMPLATES
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_ca_global',
    patterns: ['chiffre d\'affaires', 'ca global', 'ca total', 'quel est le ca', 'combien de ca', 'mon ca'],
    metricId: 'ca_global_ht',
    postProcessing: 'raw_value',
    requiresSources: ['factures']
  },
  {
    id: 'q_ca_mensuel',
    patterns: ['ca mensuel', 'ca du mois', 'chiffre du mois', 'evolution du ca'],
    metricId: 'ca_mensuel',
    postProcessing: 'tableau',
    requiresSources: ['factures']
  },
  {
    id: 'q_ca_moyen_jour',
    patterns: ['ca moyen par jour', 'moyenne par jour', 'ca journalier'],
    metricId: 'ca_moyen_par_jour',
    postProcessing: 'raw_value',
    requiresSources: ['factures']
  },
  
  // ════════════════════════════════════════════════════════════
  // SAV TEMPLATES
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_taux_sav',
    patterns: ['taux de sav', 'taux sav', 'pourcentage de sav', 'combien de sav'],
    metricId: 'taux_sav_global',
    postProcessing: 'pourcentage',
    requiresSources: ['projects']
  },
  {
    id: 'q_sav_par_univers',
    patterns: ['sav par univers', 'taux sav par univers', 'sav des univers'],
    metricId: 'sav_par_univers',
    postProcessing: 'tableau',
    entityType: 'univers',
    requiresSources: ['projects']
  },
  
  // ════════════════════════════════════════════════════════════
  // DOSSIERS TEMPLATES
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_nb_dossiers',
    patterns: ['nombre de dossiers', 'combien de dossiers', 'dossiers crees', 'nb dossiers'],
    metricId: 'nb_dossiers_crees',
    postProcessing: 'raw_value',
    requiresSources: ['projects']
  },
  {
    id: 'q_dossiers_par_univers',
    patterns: ['dossiers par univers', 'nb dossiers par univers', 'repartition des dossiers'],
    metricId: 'nb_dossiers_par_univers',
    postProcessing: 'tableau',
    entityType: 'univers',
    requiresSources: ['projects']
  },
  
  // ════════════════════════════════════════════════════════════
  // DEVIS / FACTURATION TEMPLATES
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_taux_transformation',
    patterns: ['taux de transformation', 'transformation devis', 'taux conversion devis'],
    metricId: 'taux_transformation_devis',
    postProcessing: 'pourcentage',
    requiresSources: ['devis', 'factures']
  },
  {
    id: 'q_delai_devis',
    patterns: ['delai premier devis', 'delai devis', 'temps pour faire un devis'],
    metricId: 'delai_premier_devis',
    postProcessing: 'raw_value',
    requiresSources: ['projects']
  },
  
  // ════════════════════════════════════════════════════════════
  // RECOUVREMENT TEMPLATES
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_taux_recouvrement',
    patterns: ['taux de recouvrement', 'recouvrement', 'taux encaissement'],
    metricId: 'taux_recouvrement',
    postProcessing: 'pourcentage',
    requiresSources: ['factures']
  },
  {
    id: 'q_reste_a_encaisser',
    patterns: ['reste a encaisser', 'impaye', 'en attente de paiement', 'a recouvrer'],
    metricId: 'reste_a_encaisser',
    postProcessing: 'raw_value',
    requiresSources: ['factures']
  },
  
  // ════════════════════════════════════════════════════════════
  // PANIER MOYEN
  // ════════════════════════════════════════════════════════════
  {
    id: 'q_panier_moyen',
    patterns: ['panier moyen', 'facture moyenne', 'montant moyen facture'],
    metricId: 'panier_moyen',
    postProcessing: 'raw_value',
    requiresSources: ['factures']
  },
];

// ═══════════════════════════════════════════════════════════════
// MATCHING FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise une chaîne pour le matching (lowercase, sans accents, sans ponctuation)
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s]/g, ' ')    // Garder que lettres/chiffres/espaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cherche un template correspondant à la question
 * Retourne le template avec le pattern matché et un score de confiance
 */
export function matchSimpleTemplate(question: string): TemplateMatchResult | null {
  const normalized = normalizeForMatch(question);
  
  let bestMatch: TemplateMatchResult | null = null;
  let bestPatternLength = 0;
  
  for (const template of SIMPLE_TEMPLATES) {
    for (const pattern of template.patterns) {
      const normalizedPattern = normalizeForMatch(pattern);
      
      // Match si la question contient le pattern
      if (normalized.includes(normalizedPattern)) {
        // Prioriser les patterns plus longs (plus spécifiques)
        if (normalizedPattern.length > bestPatternLength) {
          bestPatternLength = normalizedPattern.length;
          bestMatch = {
            template,
            matchedPattern: pattern,
            confidence: normalizedPattern.length >= 15 ? 'high' : 'medium'
          };
        }
      }
    }
  }
  
  return bestMatch;
}

/**
 * Retourne les sources requises pour un template
 * Si requiresSources est défini, utilise-le, sinon calcule depuis metricId
 */
export function getTemplateRequiredSources(template: SimpleTemplate): string[] {
  if (template.requiresSources && template.requiresSources.length > 0) {
    return template.requiresSources;
  }
  
  // Fallback: sources complètes pour les métriques de ranking
  const rankingMetrics = new Set([
    'ca_par_technicien', 'ca_par_apporteur', 'ca_par_univers',
    'top_techniciens_ca', 'ca_moyen_par_tech'
  ]);
  
  if (rankingMetrics.has(template.metricId)) {
    return ['factures', 'projects', 'interventions', 'users', 'clients'];
  }
  
  return ['factures', 'projects'];
}
