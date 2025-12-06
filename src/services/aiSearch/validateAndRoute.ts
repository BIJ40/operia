/**
 * StatIA AI Search - Validation & Correction
 * Cœur du moteur déterministe - Aucune invention autorisée
 * V2: Correction LLM par keywords pondérés + catégories fortes
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
} from './types';
import { getMetricById, isValidMetricId, findMetricForIntent, getAllMetricIds } from './metricsRegistry';
import { extractPeriod, getDefaultPeriod, getCurrentYearPeriod } from './extractPeriod';
import { findAllKeywords, extractDimensionFromMatches, extractUniversFromMatches, computeStatsScore } from './nlKeywords';
import { detectQueryType, getStrongStatsCategories, type DetectionResult } from './detectQueryType';

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
  'CHAUFFAGE',      // Note: exclu de StatIA selon règles métier
  'CLIMATISATION',  // Note: exclu de StatIA selon règles métier
]);

// Univers exclus des calculs StatIA
const EXCLUDED_UNIVERS = new Set(['CHAUFFAGE', 'CLIMATISATION']);

// Catégories indiquant un besoin de forecast
const FORECAST_CATEGORIES = new Set(['forecasting', 'prediction', 'modelisation']);

// Catégories indiquant analyse avancée
const ADVANCED_ANALYSIS_CATEGORIES = new Set(['analytics', 'ai_analysis', 'data_science']);

// Catégories indiquant scope réseau
const NETWORK_SCOPE_CATEGORIES = new Set(['reseau', 'region', 'agence', 'segmentation']);

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
 * V2: S'appuie sur LLM ET keywords pondérés pour corriger/surclasser
 */
export function validateAndRoute(
  llmDraft: LLMDraftIntent | null,
  normalizedQuery: string,
  originalQuery: string,
  user: UserContext,
  now = new Date()
): ValidationResult {
  const corrections: ValidationCorrection[] = [];
  
  // Analyse keywords une seule fois (réutilisée partout)
  const keywordMatches = findAllKeywords(normalizedQuery);
  const totalKeywordScore = keywordMatches.reduce((sum, m) => sum + m.keyword.weight, 0);
  
  // Détection enrichie avec catégories
  const detection = detectQueryType(normalizedQuery, originalQuery);
  
  // ─────────────────────────────────────────────────────────────
  // 1. DÉTERMINER LE TYPE DE REQUÊTE (LLM vs Keywords)
  // ─────────────────────────────────────────────────────────────
  
  let queryType: QueryType = llmDraft?.intent || 'unknown';
  
  // Score keywords fort → surclasser LLM si nécessaire
  const keywordsIndicateStats = totalKeywordScore >= 5 || detection.strongCategoriesCount >= 2;
  
  if (keywordsIndicateStats && queryType !== 'stats_query') {
    corrections.push({
      field: 'type',
      original: queryType,
      corrected: 'stats_query',
      reason: `Keywords indiquent stats (score=${totalKeywordScore.toFixed(1)}, catFortes=${detection.strongCategoriesCount})`,
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
  // 2. DÉTECTER INTENT TYPE ENRICHI (forecast, analyse avancée)
  // ─────────────────────────────────────────────────────────────
  
  let intentType: IntentType = detection.suggestedIntent || 'valeur';
  let needsForecast = false;
  let needsAdvancedAnalysis = detection.needsAdvancedAnalysis;
  
  // Vérifier catégories pour forecast
  for (const cat of detection.detectedCategories) {
    if (FORECAST_CATEGORIES.has(cat)) {
      needsForecast = true;
    }
    if (ADVANCED_ANALYSIS_CATEGORIES.has(cat)) {
      needsAdvancedAnalysis = true;
    }
  }
  
  // LLM peut suggérer un intent
  if (llmDraft?.intentType && llmDraft.intentType !== intentType) {
    // Garder LLM si confiance haute, sinon keywords gagnent
    if ((llmDraft.confidence ?? 0) >= 0.7) {
      intentType = llmDraft.intentType;
    } else if (detection.suggestedIntent) {
      corrections.push({
        field: 'intentType',
        original: llmDraft.intentType,
        corrected: intentType,
        reason: 'Keywords plus précis que LLM',
      });
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 3. VALIDER LA MÉTRIQUE
  // ─────────────────────────────────────────────────────────────
  
  let metricId: string | undefined;
  let metricLabel: string | undefined;
  
  if (queryType === 'stats_query') {
    // Vérifier que la métrique du LLM est valide
    if (llmDraft?.metric && isValidMetricId(llmDraft.metric)) {
      metricId = llmDraft.metric;
    } else {
      // Trouver la métrique via les keywords
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
            reason: `Métrique '${llmDraft.metric}' invalide, corrigée en '${metricId}'`,
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
  
  // Keywords peuvent surclasser LLM
  if (detection.suggestedDimension) {
    dimension = detection.suggestedDimension;
    
    if (llmDraft?.dimension && llmDraft.dimension !== dimension) {
      // LLM haute confiance gagne, sinon keywords
      if ((llmDraft.confidence ?? 0) >= 0.75 && isValidDimension(llmDraft.dimension)) {
        dimension = llmDraft.dimension;
      } else {
        corrections.push({
          field: 'dimension',
          original: llmDraft.dimension,
          corrected: dimension,
          reason: 'Keywords plus précis pour la dimension',
        });
      }
    }
  } else if (llmDraft?.dimension) {
    if (isValidDimension(llmDraft.dimension)) {
      dimension = llmDraft.dimension;
    } else {
      corrections.push({
        field: 'dimension',
        original: llmDraft.dimension,
        corrected: 'global',
        reason: `Dimension '${llmDraft.dimension}' invalide`,
      });
    }
  } else {
    // Détecter via keywords extraction
    const detected = extractDimensionFromMatches(keywordMatches);
    if (detected && isValidDimension(detected)) {
      dimension = detected as DimensionType;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 5. VALIDER LA PÉRIODE (LLM vs Keywords)
  // ─────────────────────────────────────────────────────────────
  
  let period: ParsedPeriod;
  
  // Parser depuis la requête d'abord
  const parsedFromQuery = extractPeriod(normalizedQuery, now);
  
  if (parsedFromQuery) {
    period = parsedFromQuery;
    
    // Si LLM propose différent et confiance haute, vérifier
    if (llmDraft?.period?.from && llmDraft.period.to && (llmDraft.confidence ?? 0) >= 0.8) {
      // Comparer les périodes - si différentes de plus de 30 jours, logger
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
    if (VALID_UNIVERS.has(uni) && !EXCLUDED_UNIVERS.has(uni)) {
      filters.univers = uni;
      break; // Premier univers valide
    }
  }
  
  // Filtres du LLM (avec validation)
  if (llmDraft?.filters) {
    for (const [key, value] of Object.entries(llmDraft.filters)) {
      // Liste blanche des clés de filtres autorisées
      if (['univers', 'technicien', 'apporteur', 'client'].includes(key)) {
        if (key === 'univers') {
          const uni = String(value).toUpperCase();
          if (VALID_UNIVERS.has(uni) && !EXCLUDED_UNIVERS.has(uni)) {
            filters.univers = uni;
          } else {
            corrections.push({
              field: `filters.${key}`,
              original: value,
              corrected: null,
              reason: `Univers '${value}' invalide ou exclu`,
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
    // Forcer l'agence de l'utilisateur
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
          message: 'Vous n\'avez pas accès à cette métrique.',
          originalQuery,
        },
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 9. CONSTRUIRE L'INTENT FINAL
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
    
    // Enrichissements V2
    needsForecast,
    needsAdvancedAnalysis,
    detectedCategories: Array.from(detection.detectedCategories),
    keywordScore: totalKeywordScore,
    
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

function findAmbiguousCandidates(normalizedQuery: string, keywordMatches: KeywordMatch[]): MetricCandidate[] {
  const keywords = keywordMatches.map(m => m.keyword.word);
  
  const candidates: MetricCandidate[] = [];
  const allMetrics = getAllMetricIds();
  
  for (const metricId of allMetrics) {
    const metric = getMetricById(metricId);
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
