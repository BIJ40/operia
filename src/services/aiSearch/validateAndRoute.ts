/**
 * StatIA AI Search - Validation & Correction
 * Cœur du moteur déterministe - Aucune invention autorisée
 * V3: Correction LLM par keywords pondérés + catégories fortes + ParsedStatQuery enrichi
 */

import type {
  LLMDraftIntent,
  ValidatedIntent,
  ValidationCorrection,
  QueryType,
  DimensionType,
  IntentType,
  ParsedPeriod,
  UserContext,
  AmbiguousResult,
  MetricCandidate,
  KeywordMatch,
  ParsedStatQuery,
  IntentConfidence,
} from './types';
import { getMetricById, isValidMetricId, findMetricForIntent, getAllMetricIds } from './metricsRegistry';
import { extractPeriod, getDefaultPeriod, getCurrentYearPeriod } from './extractPeriod';
import { findAllKeywords, extractDimensionFromMatches, extractUniversFromMatches, computeStatsScore } from './nlKeywords';
import { isStatsQuery, detectQueryType, getStrongStatsCategories, type DetectionResult, type StatsQueryResult } from './detectQueryType';

// ═══════════════════════════════════════════════════════════════
// LISTE BLANCHE DES UNIVERS
// ═══════════════════════════════════════════════════════════════

const VALID_UNIVERS = new Set([
  'PLOMBERIE',
  'ELECTRICITE',
  'VITRERIE',
  'SERRURERIE',
  'PEINTURE',
  'PLAQUISTE',
  'MENUISERIE',
  'COUVERTURE',
  'RECHERCHE FUITE',
  'MULTI-TRAVAUX',
]);

// Univers exclus des calculs StatIA (règle métier)
const EXCLUDED_UNIVERS = new Set(['CHAUFFAGE', 'CLIMATISATION']);

// Catégories indiquant un besoin de forecast
const FORECAST_CATEGORIES = new Set(['forecasting', 'prediction', 'modelisation', 'projection']);

// Catégories indiquant analyse avancée
const ADVANCED_ANALYSIS_CATEGORIES = new Set(['analytics', 'ai_analysis', 'data_science', 'optimisation']);

// Catégories indiquant scope réseau
const NETWORK_SCOPE_CATEGORIES = new Set(['reseau', 'region', 'agence', 'segmentation', 'multi-agence']);

// Catégories fortes pour stats (finance, recouvrement, ratios, etc.)
const STRONG_STATS_CATEGORIES = new Set([
  'finance', 'recouvrement', 'ratios', 'volumes', 'univers', 
  'forecasting', 'analytics', 'prediction', 'pilotage', 'delais', 'tendances'
]);

// ═══════════════════════════════════════════════════════════════
// MAPPING DIMENSION DEPUIS KEYWORDS
// ═══════════════════════════════════════════════════════════════

const KEYWORD_TO_DIMENSION: Record<string, DimensionType> = {
  technicien: 'technicien',
  tech: 'technicien',
  techniciens: 'technicien',
  apporteur: 'apporteur',
  apporteurs: 'apporteur',
  commanditaire: 'apporteur',
  prescripteur: 'apporteur',
  univers: 'univers',
  metier: 'univers',
  domaine: 'univers',
  agence: 'agence',
  agences: 'agence',
  client: 'client_type',
  clients: 'client_type',
  clientele: 'client_type',
};

// Mapping keywords → métrique suggérée
const KEYWORD_TO_METRIC: Record<string, string> = {
  'ca apporteur': 'ca_par_apporteur',
  'ca technicien': 'ca_par_technicien',
  'ca univers': 'ca_par_univers',
  'top apporteur': 'top_apporteurs_ca',
  'top technicien': 'top_techniciens_ca',
  'meilleur apporteur': 'top_apporteurs_ca',
  'meilleur technicien': 'top_techniciens_ca',
  'taux recouvrement': 'taux_recouvrement_global',
  'recouvrement': 'taux_recouvrement_global',
  'impaye': 'encours_impayes',
  'impayes': 'encours_impayes',
  'encours': 'encours_impayes',
  'dossiers': 'nb_dossiers_crees',
  'nb dossiers': 'nb_dossiers_crees',
  'sav': 'taux_sav_global',
  'taux sav': 'taux_sav_global',
  'delai devis': 'delai_premier_devis_reel',
  'delai intervention': 'delai_premiere_intervention',
  'panier moyen': 'panier_moyen_facture',
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION PRINCIPALE
// ═══════════════════════════════════════════════════════════════

type ValidationResult = {
  success: true;
  intent: ValidatedIntent;
} | {
  success: false;
  ambiguous: AmbiguousResult;
};

/**
 * Valide et corrige un intent draft du LLM
 * V3: Combine LLM + keywords pondérés + catégories pour enrichir ParsedStatQuery
 */
export function validateAndRoute(
  llmDraft: LLMDraftIntent | null,
  normalizedQuery: string,
  originalQuery: string,
  user: UserContext,
  now = new Date()
): ValidationResult {
  const corrections: ValidationCorrection[] = [];
  
  // ─────────────────────────────────────────────────────────────
  // 0. ANALYSE KEYWORDS ET CATÉGORIES (une seule fois)
  // ─────────────────────────────────────────────────────────────
  
  const keywordMatches = findAllKeywords(normalizedQuery);
  const statsQueryResult = isStatsQuery(normalizedQuery, originalQuery);
  const detection = detectQueryType(normalizedQuery, originalQuery);
  
  const totalKeywordScore = statsQueryResult.rawScore;
  const strongCategories = statsQueryResult.strongCategories;
  const allCategories = statsQueryResult.detectedCategories;
  
  // ─────────────────────────────────────────────────────────────
  // 1. DÉTERMINER LE TYPE DE REQUÊTE (LLM vs Keywords)
  // ─────────────────────────────────────────────────────────────
  
  let queryType: QueryType = llmDraft?.intent || 'unknown';
  
  // Keywords forts surclassent LLM
  if (statsQueryResult.isStats && queryType !== 'stats_query') {
    corrections.push({
      field: 'type',
      original: queryType,
      corrected: 'stats_query',
      reason: `Keywords indiquent stats (score=${totalKeywordScore.toFixed(1)}, catFortes=${strongCategories.length}: ${strongCategories.join(', ')})`,
    });
    queryType = 'stats_query';
  } else if (!queryType || queryType === 'unknown' || (llmDraft?.confidence ?? 0) < 0.5) {
    queryType = detection.type;
    if (llmDraft?.intent && llmDraft.intent !== queryType) {
      corrections.push({
        field: 'type',
        original: llmDraft.intent,
        corrected: queryType,
        reason: 'LLM confidence trop faible, heuristique appliquée',
      });
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 2. DÉTECTER INTENT TYPE, FORECAST, ANALYTICS, NETWORK
  // ─────────────────────────────────────────────────────────────
  
  let intentType: IntentType = detection.suggestedIntent || 'valeur';
  let needsForecast = false;
  let needsAdvancedAnalysis = detection.needsAdvancedAnalysis;
  let networkScope = detection.isNetworkScope;
  
  // Analyser les catégories pour enrichissement
  for (const cat of allCategories) {
    if (FORECAST_CATEGORIES.has(cat)) {
      needsForecast = true;
    }
    if (ADVANCED_ANALYSIS_CATEGORIES.has(cat)) {
      needsAdvancedAnalysis = true;
    }
    if (NETWORK_SCOPE_CATEGORIES.has(cat)) {
      networkScope = true;
    }
  }
  
  // LLM peut suggérer un intent si confiance haute
  if (llmDraft?.intentType && llmDraft.intentType !== intentType) {
    if ((llmDraft.confidence ?? 0) >= 0.7) {
      intentType = llmDraft.intentType;
    } else if (detection.suggestedIntent) {
      corrections.push({
        field: 'intentType',
        original: llmDraft.intentType,
        corrected: intentType,
        reason: 'Keywords plus précis que LLM pour intent',
      });
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 3. VALIDER LA MÉTRIQUE (combinaison LLM + keywords)
  // ─────────────────────────────────────────────────────────────
  
  let metricId: string | undefined;
  let metricLabel: string | undefined;
  
  if (queryType === 'stats_query') {
    // D'abord vérifier si LLM propose une métrique valide
    if (llmDraft?.metric && isValidMetricId(llmDraft.metric)) {
      metricId = llmDraft.metric;
    } else {
      // Chercher via keywords directement
      const inferredMetric = inferMetricFromKeywords(keywordMatches, normalizedQuery);
      
      if (inferredMetric && isValidMetricId(inferredMetric)) {
        metricId = inferredMetric;
        if (llmDraft?.metric) {
          corrections.push({
            field: 'metricId',
            original: llmDraft.metric,
            corrected: metricId,
            reason: `Métrique '${llmDraft.metric}' invalide, corrigée via keywords en '${metricId}'`,
          });
        }
      } else {
        // Utiliser findMetricForIntent
        const keywords = keywordMatches.map(m => m.keyword.word);
        const dimension = detection.suggestedDimension || extractDimensionFromMatches(keywordMatches) as DimensionType || 'global';
        
        const foundMetric = findMetricForIntent(dimension, intentType, keywords);
        
        if (foundMetric) {
          metricId = foundMetric.id;
          if (llmDraft?.metric) {
            corrections.push({
              field: 'metricId',
              original: llmDraft.metric,
              corrected: metricId,
              reason: `Métrique '${llmDraft.metric}' invalide, résolue en '${metricId}'`,
            });
          }
        } else {
          // Chercher les candidats pour ambiguïté
          const candidates = findAmbiguousCandidates(normalizedQuery, keywordMatches);
          if (candidates.length > 1) {
            return {
              success: false,
              ambiguous: {
                type: 'ambiguous',
                candidates,
                message: 'Plusieurs métriques correspondent à votre requête. Précisez votre demande.',
                originalQuery,
              },
            };
          } else if (candidates.length === 1) {
            metricId = candidates[0].metricId;
          }
        }
      }
    }
    
    // Récupérer le label
    if (metricId) {
      const metricDef = getMetricById(metricId);
      metricLabel = metricDef?.label;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 4. VALIDER LA DIMENSION (LLM vs Keywords)
  // ─────────────────────────────────────────────────────────────
  
  let dimension: DimensionType = 'global';
  
  // Inférer dimension depuis keywords
  const keywordDimension = inferDimensionFromKeywords(keywordMatches);
  
  if (detection.suggestedDimension) {
    dimension = detection.suggestedDimension;
  } else if (keywordDimension) {
    dimension = keywordDimension;
  }
  
  // LLM haute confiance peut surclasser
  if (llmDraft?.dimension && llmDraft.dimension !== dimension) {
    if ((llmDraft.confidence ?? 0) >= 0.75 && isValidDimension(llmDraft.dimension)) {
      dimension = llmDraft.dimension;
    } else if (dimension !== 'global') {
      corrections.push({
        field: 'dimension',
        original: llmDraft.dimension,
        corrected: dimension,
        reason: 'Keywords plus précis pour la dimension',
      });
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 5. VALIDER LA PÉRIODE (Keywords > LLM si explicite)
  // ─────────────────────────────────────────────────────────────
  
  let period: ParsedPeriod;
  
  // Parser depuis la requête d'abord (prioritaire)
  const parsedFromQuery = extractPeriod(normalizedQuery, now);
  
  if (parsedFromQuery) {
    period = parsedFromQuery;
    
    // Si LLM propose différent et confiance haute, comparer
    if (llmDraft?.period?.from && llmDraft.period.to && (llmDraft.confidence ?? 0) >= 0.8) {
      const llmFrom = new Date(llmDraft.period.from);
      const queryFrom = new Date(parsedFromQuery.from);
      const diffDays = Math.abs(llmFrom.getTime() - queryFrom.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays > 30) {
        corrections.push({
          field: 'period',
          original: llmDraft.period.label || 'LLM period',
          corrected: parsedFromQuery.label,
          reason: 'Période extraite de la requête prioritaire (écart >30j avec LLM)',
        });
      }
    }
  } else if (llmDraft?.period?.from && llmDraft?.period?.to) {
    period = {
      from: llmDraft.period.from,
      to: llmDraft.period.to,
      label: llmDraft.period.label || 'Période personnalisée',
      isDefault: false,
    };
  } else {
    // Fallback: année courante pour rankings, 12 mois sinon
    const metricDef = metricId ? getMetricById(metricId) : null;
    period = metricDef?.isRanking ? getCurrentYearPeriod(now) : getDefaultPeriod(now);
    corrections.push({
      field: 'period',
      original: null,
      corrected: period.label,
      reason: 'Aucune période détectée, fallback appliqué',
    });
  }
  
  // ─────────────────────────────────────────────────────────────
  // 6. VALIDER LES FILTRES
  // ─────────────────────────────────────────────────────────────
  
  const filters: Record<string, unknown> = {};
  
  // Univers depuis keywords
  const detectedUnivers = extractUniversFromMatches(keywordMatches);
  
  for (const uni of detectedUnivers) {
    const uniUpper = uni.toUpperCase();
    if (VALID_UNIVERS.has(uniUpper) && !EXCLUDED_UNIVERS.has(uniUpper)) {
      filters.univers = uniUpper;
      break;
    }
  }
  
  // Filtres du LLM (avec validation)
  if (llmDraft?.filters) {
    for (const [key, value] of Object.entries(llmDraft.filters)) {
      // Liste blanche des clés de filtres autorisées
      if (['univers', 'technicien', 'apporteur', 'client', 'agence'].includes(key)) {
        if (key === 'univers') {
          const uni = String(value).toUpperCase();
          if (VALID_UNIVERS.has(uni) && !EXCLUDED_UNIVERS.has(uni)) {
            filters.univers = uni;
          } else {
            corrections.push({
              field: `filters.${key}`,
              original: value,
              corrected: null,
              reason: `Univers '${value}' invalide ou exclu (règle métier)`,
            });
          }
        } else {
          filters[key] = value;
        }
      } else {
        corrections.push({
          field: `filters.${key}`,
          original: value,
          corrected: null,
          reason: `Clé de filtre '${key}' non autorisée`,
        });
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 7. VALIDER LE LIMIT (TOP N)
  // ─────────────────────────────────────────────────────────────
  
  let limit: number | undefined;
  
  if (llmDraft?.limit) {
    if (llmDraft.limit > 0 && llmDraft.limit <= 100) {
      limit = llmDraft.limit;
    } else {
      corrections.push({
        field: 'limit',
        original: llmDraft.limit,
        corrected: 10,
        reason: 'Limit hors bornes (1-100)',
      });
      limit = 10;
    }
  } else if (metricId) {
    const metricDef = getMetricById(metricId);
    limit = metricDef?.defaultTopN;
  }
  
  // ─────────────────────────────────────────────────────────────
  // 8. APPLIQUER LES PERMISSIONS
  // ─────────────────────────────────────────────────────────────
  
  let agencyScope: 'single' | 'network' = 'single';
  let allowedAgencyIds: string[] | undefined;
  
  // N0/N1 → pas de stats, fallback doc/pedago
  if (user.roleLevel < 2 && queryType === 'stats_query') {
    queryType = 'documentary_query';
    corrections.push({
      field: 'type',
      original: 'stats_query',
      corrected: 'documentary_query',
      reason: 'Rôle insuffisant pour les statistiques (N2+ requis)',
    });
  }
  
  // N2 → agence unique obligatoire
  if (user.roleLevel === 2) {
    agencyScope = 'single';
    networkScope = false;
    
    if (detection.isNetworkScope) {
      corrections.push({
        field: 'agencyScope',
        original: 'network',
        corrected: 'single',
        reason: 'N2 limité à son agence uniquement',
      });
    }
  }
  
  // N3+ → réseau si autorisé, sinon limité aux agences assignées
  if (user.roleLevel >= 3) {
    if (user.allowedAgencyIds?.length) {
      agencyScope = 'network';
      allowedAgencyIds = user.allowedAgencyIds;
    } else {
      // N3+ sans agences assignées = toutes les agences
      agencyScope = 'network';
    }
  }
  
  // Vérifier minRole de la métrique
  if (metricId) {
    const metricDef = getMetricById(metricId);
    if (metricDef && user.roleLevel < metricDef.minRole) {
      return {
        success: false,
        ambiguous: {
          type: 'ambiguous',
          candidates: [],
          message: `Vous n'avez pas accès à cette métrique (rôle minimum: N${metricDef.minRole}).`,
          originalQuery,
        },
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 9. CONSTRUIRE LE PARSED STAT QUERY
  // ─────────────────────────────────────────────────────────────
  
  const confidence: IntentConfidence = 
    (llmDraft?.confidence ?? 0) >= 0.7 ? 'high' :
    (llmDraft?.confidence ?? 0) >= 0.4 ? 'medium' : 'low';
  
  const parsedQuery: ParsedStatQuery = {
    metricId,
    univers: filters.univers as string | undefined,
    apporteur: filters.apporteur as string | undefined,
    technicien: filters.technicien as string | undefined,
    agence: user.agencySlug || undefined,
    intentType,
    limit,
    period,
    isForecast: needsForecast,
    advancedAnalytics: needsAdvancedAnalysis,
    networkScope,
    confidence,
    keywordScore: totalKeywordScore,
    categories: allCategories,
    rawLLM: llmDraft,
  };
  
  // ─────────────────────────────────────────────────────────────
  // 10. CONSTRUIRE L'INTENT FINAL
  // ─────────────────────────────────────────────────────────────
  
  const validatedIntent: ValidatedIntent = {
    type: queryType,
    metricId,
    metricLabel,
    dimension,
    intentType,
    limit,
    period,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    agencyScope,
    allowedAgencyIds,
    userRoleLevel: user.roleLevel,
    
    // Enrichissements V3
    needsForecast,
    needsAdvancedAnalysis,
    detectedCategories: allCategories,
    keywordScore: totalKeywordScore,
    networkScope,
    advancedAnalytics: needsAdvancedAnalysis,
    isForecast: needsForecast,
    
    // Parsed query pour exécution
    parsedQuery,
    
    validation: {
      corrections,
      llmConfidence: llmDraft?.confidence ?? 0,
      finalConfidence: computeFinalConfidence(llmDraft, corrections, totalKeywordScore),
      source: llmDraft ? (corrections.length > 0 ? 'hybrid' : 'llm') : 'heuristic',
    },
  };
  
  return { success: true, intent: validatedIntent };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function isValidDimension(dim: string): dim is DimensionType {
  return ['global', 'technicien', 'apporteur', 'univers', 'agence', 'site', 'client_type'].includes(dim);
}

function computeFinalConfidence(
  llmDraft: LLMDraftIntent | null, 
  corrections: ValidationCorrection[], 
  keywordScore: number
): number {
  if (!llmDraft) {
    // Heuristique seule - confiance basée sur score keywords
    return Math.min(0.9, 0.5 + keywordScore * 0.05);
  }
  
  let confidence = llmDraft.confidence;
  
  // Réduire la confiance pour chaque correction appliquée
  confidence -= corrections.length * 0.08;
  
  // Bonus si keywords confirment (score élevé = plus de confiance)
  if (keywordScore >= 10) {
    confidence += 0.15;
  } else if (keywordScore >= 5) {
    confidence += 0.1;
  }
  
  return Math.max(0.3, Math.min(1, confidence));
}

/**
 * Infère la dimension depuis les keywords matchés
 */
function inferDimensionFromKeywords(matches: KeywordMatch[]): DimensionType | null {
  for (const match of matches) {
    const word = match.keyword.word.toLowerCase();
    
    // Chercher dans le mapping explicite
    for (const [keyword, dim] of Object.entries(KEYWORD_TO_DIMENSION)) {
      if (word.includes(keyword) || keyword.includes(word)) {
        return dim;
      }
    }
    
    // Catégorie dimension directe
    if (match.keyword.category === 'dimension') {
      if (word.includes('tech')) return 'technicien';
      if (word.includes('apport') || word.includes('commandit') || word.includes('prescr')) return 'apporteur';
      if (word.includes('univers') || word.includes('metier') || word.includes('domaine')) return 'univers';
      if (word.includes('agence')) return 'agence';
      if (word.includes('client')) return 'client_type';
    }
  }
  
  return null;
}

/**
 * Infère une métrique depuis les keywords matchés + patterns dans la query
 */
function inferMetricFromKeywords(matches: KeywordMatch[], query: string): string | null {
  const q = query.toLowerCase();
  
  // Chercher des combinaisons explicites
  for (const [pattern, metric] of Object.entries(KEYWORD_TO_METRIC)) {
    if (q.includes(pattern)) {
      return metric;
    }
  }
  
  // Chercher des patterns composés depuis les keywords
  const words = matches.map(m => m.keyword.word.toLowerCase());
  
  // CA + dimension
  if (words.some(w => w.includes('ca') || w.includes('chiffre') || w.includes('revenue'))) {
    if (words.some(w => w.includes('tech'))) return 'ca_par_technicien';
    if (words.some(w => w.includes('apport') || w.includes('commandit'))) return 'ca_par_apporteur';
    if (words.some(w => w.includes('univers'))) return 'ca_par_univers';
    // CA global par défaut
    return 'ca_global_ht';
  }
  
  // Recouvrement
  if (words.some(w => w.includes('recouvr') || w.includes('impaye') || w.includes('encours'))) {
    return 'taux_recouvrement_global';
  }
  
  // Dossiers
  if (words.some(w => w.includes('dossier'))) {
    if (words.some(w => w.includes('univers'))) return 'nb_dossiers_par_univers';
    return 'nb_dossiers_crees';
  }
  
  // SAV
  if (words.some(w => w.includes('sav'))) {
    return 'taux_sav_global';
  }
  
  // Délais
  if (words.some(w => w.includes('delai'))) {
    if (words.some(w => w.includes('devis'))) return 'delai_premier_devis_reel';
    if (words.some(w => w.includes('interv'))) return 'delai_premiere_intervention';
  }
  
  // Top / classement
  if (words.some(w => w.includes('top') || w.includes('meilleur') || w.includes('class'))) {
    if (words.some(w => w.includes('tech'))) return 'top_techniciens_ca';
    if (words.some(w => w.includes('apport'))) return 'top_apporteurs_ca';
  }
  
  return null;
}

function findAmbiguousCandidates(normalizedQuery: string, keywordMatches: KeywordMatch[]): MetricCandidate[] {
  const keywords = keywordMatches.map(m => m.keyword.word);
  
  const candidates: MetricCandidate[] = [];
  const allMetrics = getAllMetricIds();
  
  for (const metricIdCandidate of allMetrics) {
    const metric = getMetricById(metricIdCandidate);
    if (!metric) continue;
    
    let score = 0;
    const matchedKeywords: string[] = [];
    
    for (const kw of keywords) {
      if (metric.keywords.includes(kw)) {
        score += 0.2;
        matchedKeywords.push(kw);
      }
    }
    
    // Bonus si keyword weight élevé
    for (const match of keywordMatches) {
      if (metric.keywords.includes(match.keyword.word)) {
        score += match.keyword.weight * 0.1;
      }
    }
    
    if (score >= 0.2) {
      candidates.push({
        metricId: metric.id,
        label: metric.label,
        score,
        reason: `Match: ${matchedKeywords.join(', ')}`,
      });
    }
  }
  
  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS ADDITIONNELS
// ═══════════════════════════════════════════════════════════════

export { getStrongStatsCategories };