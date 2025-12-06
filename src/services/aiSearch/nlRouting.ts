/**
 * StatIA AI Search - Règles NL → Métrique
 * Registre de règles explicites pour les cas fréquents
 * Évite les fallbacks silencieux et assure un routing précis
 */

import type { DimensionType, IntentType, MetricCandidate, KeywordMatch } from './types';
import { getMetricById, findMetricsByKeyword, METRICS_REGISTRY } from './metricsRegistry';

// ═══════════════════════════════════════════════════════════════
// RÈGLES NL → MÉTRIQUE (cas standards)
// ═══════════════════════════════════════════════════════════════

interface NLRoutingRule {
  dimension: DimensionType | null;
  intent: IntentType | null;
  keywords?: string[];
  metricId: string;
  priority: number; // Plus haut = prioritaire
}

export const NL_ROUTING_RULES: NLRoutingRule[] = [
  // ═══ TOP / CLASSEMENTS ═══
  { dimension: 'apporteur', intent: 'top', metricId: 'top_apporteurs_ca', priority: 10 },
  { dimension: 'technicien', intent: 'top', metricId: 'top_techniciens_ca', priority: 10 },
  { dimension: 'univers', intent: 'top', metricId: 'ca_par_univers', priority: 8 },
  
  // ═══ CA PAR DIMENSION ═══
  { dimension: 'apporteur', intent: 'valeur', metricId: 'ca_par_apporteur', priority: 7 },
  { dimension: 'technicien', intent: 'valeur', metricId: 'ca_par_technicien', priority: 7 },
  { dimension: 'univers', intent: 'valeur', metricId: 'ca_par_univers', priority: 7 },
  
  // ═══ MOYENNES ═══
  { dimension: 'technicien', intent: 'moyenne', metricId: 'ca_moyen_par_tech', priority: 9 },
  { dimension: 'global', intent: 'moyenne', keywords: ['panier', 'moyen'], metricId: 'panier_moyen_facture', priority: 9 },
  { dimension: 'global', intent: 'moyenne', keywords: ['jour', 'journalier'], metricId: 'ca_moyen_par_jour', priority: 8 },
  
  // ═══ VOLUMES ═══
  { dimension: 'global', intent: 'volume', keywords: ['dossier'], metricId: 'nb_dossiers_crees', priority: 9 },
  { dimension: 'univers', intent: 'volume', keywords: ['dossier'], metricId: 'dossiers_par_univers', priority: 8 },
  { dimension: 'apporteur', intent: 'volume', keywords: ['dossier'], metricId: 'dossiers_par_apporteur', priority: 8 },
  
  // ═══ TAUX ═══
  { dimension: 'global', intent: 'taux', keywords: ['recouvrement', 'recouv'], metricId: 'taux_recouvrement', priority: 10 },
  { dimension: 'global', intent: 'taux', keywords: ['sav', 'service'], metricId: 'taux_sav_global', priority: 9 },
  { dimension: 'global', intent: 'taux', keywords: ['transformation', 'devis'], metricId: 'taux_transformation_devis_montant', priority: 9 },
  { dimension: 'univers', intent: 'taux', keywords: ['sav'], metricId: 'taux_sav_par_univers', priority: 8 },
  
  // ═══ DÉLAIS ═══
  { dimension: 'global', intent: 'delay', keywords: ['devis', 'premier'], metricId: 'delai_premier_devis_reel', priority: 9 },
  { dimension: 'global', intent: 'delay', keywords: ['intervention'], metricId: 'delai_premiere_intervention', priority: 8 },
  
  // ═══ RECOUVREMENT ═══
  { dimension: 'global', intent: 'valeur', keywords: ['encours', 'impaye', 'reste'], metricId: 'encours_impayes', priority: 10 },
  { dimension: 'global', intent: 'valeur', keywords: ['recouvrement'], metricId: 'taux_recouvrement', priority: 8 },
  
  // ═══ CA GLOBAL (fallback dimension global) ═══
  { dimension: 'global', intent: 'valeur', keywords: ['ca', 'chiffre'], metricId: 'ca_global_ht', priority: 5 },
  { dimension: 'global', intent: 'valeur', metricId: 'ca_global_ht', priority: 1 }, // Fallback final
];

// ═══════════════════════════════════════════════════════════════
// MAPPING KEYWORDS → MÉTRIQUE DIRECTE
// ═══════════════════════════════════════════════════════════════

const KEYWORD_DIRECT_MAPPING: Record<string, string> = {
  'ca apporteur': 'ca_par_apporteur',
  'ca technicien': 'ca_par_technicien',
  'ca univers': 'ca_par_univers',
  'ca par apporteur': 'ca_par_apporteur',
  'ca par technicien': 'ca_par_technicien',
  'ca par univers': 'ca_par_univers',
  'top apporteur': 'top_apporteurs_ca',
  'top apporteurs': 'top_apporteurs_ca',
  'meilleur apporteur': 'top_apporteurs_ca',
  'meilleurs apporteurs': 'top_apporteurs_ca',
  'top technicien': 'top_techniciens_ca',
  'top techniciens': 'top_techniciens_ca',
  'meilleur technicien': 'top_techniciens_ca',
  'meilleurs techniciens': 'top_techniciens_ca',
  'taux recouvrement': 'taux_recouvrement',
  'taux de recouvrement': 'taux_recouvrement',
  'recouvrement': 'taux_recouvrement',
  'impaye': 'encours_impayes',
  'impayes': 'encours_impayes',
  'encours': 'encours_impayes',
  'reste a encaisser': 'encours_impayes',
  'du client': 'encours_impayes',
  'creance': 'encours_impayes',
  'dossiers': 'nb_dossiers_crees',
  'nb dossiers': 'nb_dossiers_crees',
  'nombre dossiers': 'nb_dossiers_crees',
  'sav': 'taux_sav_global',
  'taux sav': 'taux_sav_global',
  'taux de sav': 'taux_sav_global',
  'sav univers': 'taux_sav_par_univers',
  'sav par univers': 'taux_sav_par_univers',
  'delai devis': 'delai_premier_devis_reel',
  'delai premier devis': 'delai_premier_devis_reel',
  'temps devis': 'delai_premier_devis_reel',
  'delai intervention': 'delai_premiere_intervention',
  'panier moyen': 'panier_moyen_facture',
  'transformation devis': 'taux_transformation_devis_montant',
  'taux transformation': 'taux_transformation_devis_montant',
  'ca moyen technicien': 'ca_moyen_par_tech',
  'ca moyen par technicien': 'ca_moyen_par_tech',
  'moyenne technicien': 'ca_moyen_par_tech',
  'ca moyen jour': 'ca_moyen_par_jour',
  'ca par jour': 'ca_moyen_par_jour',
  'ca mensuel': 'ca_mensuel',
  'evolution ca': 'ca_mensuel',
};

// ═══════════════════════════════════════════════════════════════
// FONCTIONS PUBLIQUES
// ═══════════════════════════════════════════════════════════════

/**
 * Trouve une métrique via les règles NL explicites
 * Retourne null si aucune règle ne correspond
 */
export function findMetricFromNLRules(
  dimension: DimensionType | string | null,
  intent: IntentType | string | null,
  normalizedQuery: string
): string | null {
  // 1. D'abord essayer le mapping direct par keywords
  const sortedMappings = Object.entries(KEYWORD_DIRECT_MAPPING)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [pattern, metricId] of sortedMappings) {
    if (normalizedQuery.includes(pattern)) {
      return metricId;
    }
  }
  
  // 2. Appliquer les règles NL triées par priorité
  const sortedRules = [...NL_ROUTING_RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    // Vérifier dimension
    if (rule.dimension && rule.dimension !== dimension) continue;
    
    // Vérifier intent
    if (rule.intent && rule.intent !== intent) continue;
    
    // Vérifier keywords si spécifiés
    if (rule.keywords && rule.keywords.length > 0) {
      const hasKeyword = rule.keywords.some(kw => normalizedQuery.includes(kw));
      if (!hasKeyword) continue;
    }
    
    return rule.metricId;
  }
  
  return null;
}

/**
 * Trouve des métriques candidates pour une requête ambiguë
 * Utilisé quand aucune métrique unique n'est trouvée
 */
export function findCandidateMetrics(
  normalizedQuery: string,
  keywordMatches: KeywordMatch[],
  dimension: DimensionType | string | null,
  intent: IntentType | string | null
): MetricCandidate[] {
  const candidates: MetricCandidate[] = [];
  const seenMetrics = new Set<string>();
  
  // Chercher via keywords
  for (const match of keywordMatches) {
    const metrics = findMetricsByKeyword(match.keyword.word);
    for (const metric of metrics) {
      if (seenMetrics.has(metric.id)) continue;
      seenMetrics.add(metric.id);
      
      candidates.push({
        metricId: metric.id,
        label: metric.label,
        score: match.keyword.weight,
        reason: `Mot-clé "${match.keyword.word}" détecté`,
      });
    }
  }
  
  // Chercher via règles NL qui matchent partiellement
  const matchingRules = NL_ROUTING_RULES.filter(rule => {
    const dimMatch = !rule.dimension || rule.dimension === dimension;
    const intentMatch = !rule.intent || rule.intent === intent;
    return dimMatch || intentMatch;
  });
  
  for (const rule of matchingRules) {
    if (seenMetrics.has(rule.metricId)) continue;
    seenMetrics.add(rule.metricId);
    
    const metric = getMetricById(rule.metricId);
    if (!metric) continue;
    
    candidates.push({
      metricId: rule.metricId,
      label: metric.label,
      score: rule.priority / 10,
      reason: `Règle NL: ${rule.dimension || '*'}/${rule.intent || '*'}`,
    });
  }
  
  // Trier par score décroissant et limiter
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Vérifie si une métrique est dans le registre officiel
 */
export function isOfficialMetric(metricId: string): boolean {
  return METRICS_REGISTRY.some(m => m.id === metricId);
}
