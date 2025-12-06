/**
 * StatIA AI Search - Core Module
 * Module central unifié pour la recherche IA
 * Expose les interfaces et fonctions principales du pipeline
 */

import type {
  QueryType,
  DimensionType,
  IntentType,
  ParsedPeriod,
  ParsedStatQuery,
  ValidatedIntent,
  ValidationCorrection,
  AmbiguousResult,
  MetricCandidate,
  StatsResult,
  DocResult,
  ActionResult,
  ErrorResult,
  KeywordMatch,
  UserContext,
} from './types';

import { normalizeQuery, extractTopN } from './nlNormalize';
import { findAllKeywords, computeStatsScore, extractDimensionFromMatches, extractUniversFromMatches } from './nlKeywords';
import { detectQueryType, isStatsQuery, getStrongStatsCategories, type DetectionResult, type StatsQueryResult } from './detectQueryType';
import { extractPeriod, getDefaultPeriod, getCurrentYearPeriod } from './extractPeriod';
import { getMetricById, isValidMetricId, findMetricForIntent, getAllMetricIds, METRICS_REGISTRY } from './metricsRegistry';
import { NL_ROUTING_RULES, findMetricFromNLRules, findCandidateMetrics } from './nlRouting';
import { resolveEntities, type ResolvedEntities, type TechnicienCandidate, type ApporteurCandidate } from './entityResolver';

// ═══════════════════════════════════════════════════════════════
// TYPES D'ENTRÉE/SORTIE DU CORE
// ═══════════════════════════════════════════════════════════════

export interface AiSearchContext {
  userId: string;
  role: string;           // global_role string
  roleLevel: number;      // N0..N6
  agencyId?: string | null;
  agencySlug?: string | null;
  allowedAgencyIds?: string[];
}

export interface AiSearchInput {
  query: string;
  normalizedQuery?: string;
  now?: Date;
  context: AiSearchContext;
}

export interface AiSearchRoutedRequest {
  type: 'stats' | 'doc' | 'action' | 'ambiguous' | 'entity_ambiguous' | 'error';
  parsed: ParsedStatQuery | null;
  ambiguous?: AmbiguousResult;
  entityAmbiguous?: EntityAmbiguousResult;
  error?: { code: string; message: string };
  debug?: AiSearchDebugInfo;
}

export interface EntityAmbiguousResult {
  type: 'entity_ambiguous';
  entityType: 'technicien' | 'apporteur';
  candidates: TechnicienCandidate[] | ApporteurCandidate[];
  message: string;
  originalQuery: string;
}

export interface AiSearchDebugInfo {
  normalizedQuery: string;
  keywordMatches: KeywordMatch[];
  statsQueryResult: StatsQueryResult;
  detection: DetectionResult;
  llmDraft: unknown;
  corrections: ValidationCorrection[];
  routingSource: 'nl_rules' | 'llm' | 'keywords' | 'heuristic';
  resolvedEntities?: ResolvedEntities;
}

export type AiSearchResultType = 'stats' | 'doc' | 'action' | 'ambiguous' | 'error';

export interface AiSearchResult {
  type: AiSearchResultType;
  data: StatsResult | DocResult | ActionResult | AmbiguousResult | ErrorResult | null;
  interpretation: {
    metricId: string | null;
    metricLabel: string | null;
    dimension: string;
    intentType: string;
    period: { from: string; to: string; label: string };
    filters: Record<string, unknown>;
    confidence: number;
    scope: 'agence' | 'reseau';
  };
  debug?: AiSearchDebugInfo;
  fromCache?: boolean;
  computedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const VALID_UNIVERS = new Set([
  'PLOMBERIE', 'ELECTRICITE', 'VITRERIE', 'SERRURERIE', 'PEINTURE',
  'PLAQUISTE', 'MENUISERIE', 'COUVERTURE', 'RECHERCHE FUITE', 'MULTI-TRAVAUX',
]);

const EXCLUDED_UNIVERS = new Set(['CHAUFFAGE', 'CLIMATISATION']);

const NETWORK_KEYWORDS = new Set([
  'réseau', 'reseau', 'franchiseur', 'toutes les agences', 'multi-agences',
  'multiagences', 'agences', 'comparaison agences', 'toutes agences',
]);

const MAX_PERIOD_MONTHS = 24;

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE : aiSearchRoute
// ═══════════════════════════════════════════════════════════════

/**
 * Route une requête utilisateur vers le bon type d'exécution
 * Combine LLM (si fourni) + keywords pondérés + règles NL
 */
export function aiSearchRoute(
  input: AiSearchInput,
  llmIntent: unknown | null = null
): AiSearchRoutedRequest {
  const now = input.now || new Date();
  const normalized = input.normalizedQuery || normalizeQuery(input.query);
  const corrections: ValidationCorrection[] = [];
  
  // ─────────────────────────────────────────────────────────────
  // 1. ANALYSE KEYWORDS (source centrale de vérité)
  // ─────────────────────────────────────────────────────────────
  
  const keywordMatches = findAllKeywords(normalized);
  const statsQueryResult = isStatsQuery(normalized, input.query);
  const detection = detectQueryType(normalized, input.query);
  
  // ─────────────────────────────────────────────────────────────
  // 2. DÉTERMINER LE TYPE DE REQUÊTE
  // ─────────────────────────────────────────────────────────────
  
  let queryType: 'stats' | 'doc' | 'action' = 'doc';
  let routingSource: AiSearchDebugInfo['routingSource'] = 'heuristic';
  
  // Stats si score élevé ou catégories fortes
  if (statsQueryResult.isStats) {
    queryType = 'stats';
    routingSource = 'keywords';
  } else if (detection.type === 'stats_query') {
    queryType = 'stats';
    routingSource = 'heuristic';
  } else if (detection.type === 'action_query') {
    queryType = 'action';
  }
  
  // LLM peut surclasser si confiance haute
  const llm = llmIntent as { queryType?: string; confidence?: number } | null;
  if (llm?.queryType && (llm.confidence ?? 0) >= 0.7) {
    if (llm.queryType === 'stats' || llm.queryType === 'stats_query') {
      queryType = 'stats';
      routingSource = 'llm';
    } else if (llm.queryType === 'doc' || llm.queryType === 'documentary_query') {
      queryType = 'doc';
      routingSource = 'llm';
    } else if (llm.queryType === 'action' || llm.queryType === 'action_query') {
      queryType = 'action';
      routingSource = 'llm';
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 3. PERMISSION : N0/N1 → pas de stats
  // ─────────────────────────────────────────────────────────────
  
  if (queryType === 'stats' && input.context.roleLevel < 2) {
    corrections.push({
      field: 'type',
      original: 'stats',
      corrected: 'doc',
      reason: 'Rôle insuffisant (N0/N1) pour les statistiques',
    });
    queryType = 'doc';
  }
  
  // ─────────────────────────────────────────────────────────────
  // 4. DÉTECTER SCOPE RÉSEAU
  // ─────────────────────────────────────────────────────────────
  
  let scope: 'agence' | 'reseau' = 'agence';
  
  for (const kw of NETWORK_KEYWORDS) {
    if (normalized.includes(kw)) {
      scope = 'reseau';
      break;
    }
  }
  
  // N2 ne peut pas avoir scope réseau
  if (scope === 'reseau' && input.context.roleLevel < 3) {
    corrections.push({
      field: 'scope',
      original: 'reseau',
      corrected: 'agence',
      reason: 'Scope réseau réservé aux N3+ (franchiseur)',
    });
    scope = 'agence';
  }
  
  // ─────────────────────────────────────────────────────────────
  // 5. ROUTING STATS : trouver la métrique
  // ─────────────────────────────────────────────────────────────
  
  if (queryType !== 'stats') {
    return {
      type: queryType,
      parsed: null,
      debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource),
    };
  }
  
  // Extraire dimension et intent depuis keywords
  const dimension = detection.suggestedDimension || extractDimensionFromKeywords(keywordMatches) || 'global';
  const intentType = detection.suggestedIntent || extractIntentFromKeywords(keywordMatches) || 'valeur';
  
  // Essayer les règles NL en premier (cas standards)
  let metricId = findMetricFromNLRules(dimension, intentType, normalized);
  
  if (metricId) {
    routingSource = 'nl_rules';
  } else {
    // Fallback : LLM si métrique valide
    const llmMetric = (llmIntent as { metric?: string } | null)?.metric;
    if (llmMetric && isValidMetricId(llmMetric)) {
      metricId = llmMetric;
      routingSource = 'llm';
    } else {
      // Fallback : findMetricForIntent avec keywords
      const keywords = keywordMatches.map(m => m.keyword.word);
      const foundMetric = findMetricForIntent(dimension as DimensionType, intentType as IntentType, keywords);
      if (foundMetric) {
        metricId = foundMetric.id;
        routingSource = 'keywords';
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 6. GESTION AMBIGUÏTÉ OU ERREUR
  // ─────────────────────────────────────────────────────────────
  
  if (!metricId) {
    // Chercher des candidats
    const candidates = findCandidateMetrics(normalized, keywordMatches, dimension, intentType);
    
    if (candidates.length > 1) {
      return {
        type: 'ambiguous',
        parsed: null,
        ambiguous: {
          type: 'ambiguous',
          candidates,
          message: 'Plusieurs métriques correspondent à votre requête. Veuillez préciser.',
          originalQuery: input.query,
        },
        debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource),
      };
    }
    
    if (candidates.length === 1) {
      metricId = candidates[0].metricId;
    } else {
      // ERREUR : aucune métrique trouvée (pas de fallback silencieux !)
      return {
        type: 'error',
        parsed: null,
        error: {
          code: 'METRIC_NOT_FOUND',
          message: 'Aucune métrique ne correspond à votre requête. Reformulez ou précisez votre demande.',
        },
        debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource),
      };
    }
  }
  
  // Vérifier que la métrique existe
  const metricDef = getMetricById(metricId);
  if (!metricDef) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'UNKNOWN_METRIC',
        message: `Métrique '${metricId}' inconnue dans le registre.`,
      },
      debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource),
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 7. VÉRIFIER PERMISSIONS MÉTRIQUE
  // ─────────────────────────────────────────────────────────────
  
  const minRole = metricDef.minRole || 0;
  if (input.context.roleLevel < minRole) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'ACCESS_DENIED',
        message: `Cette métrique nécessite un niveau d'accès supérieur (N${minRole}+).`,
      },
      debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource),
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 8. EXTRAIRE PÉRIODE
  // ─────────────────────────────────────────────────────────────
  
  let period = extractPeriod(normalized, now);
  
  if (!period) {
    // Fallback selon type de métrique
    period = metricDef.isRanking ? getCurrentYearPeriod(now) : getDefaultPeriod(now);
    corrections.push({
      field: 'period',
      original: null,
      corrected: period.label,
      reason: 'Période non détectée, fallback appliqué',
    });
  }
  
  // Vérifier limite de période
  const periodMonths = Math.ceil(
    (new Date(period.to).getTime() - new Date(period.from).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  
  if (periodMonths > MAX_PERIOD_MONTHS) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'PERIOD_INVALID',
        message: `Période trop large (${periodMonths} mois). Maximum autorisé : ${MAX_PERIOD_MONTHS} mois.`,
      },
      debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource),
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 9. EXTRAIRE FILTRES
  // ─────────────────────────────────────────────────────────────
  
  const filters: Record<string, unknown> = {};
  
  // Univers
  const detectedUnivers = extractUniversFromMatches(keywordMatches);
  for (const uni of detectedUnivers) {
    const uniUpper = uni.toUpperCase();
    if (VALID_UNIVERS.has(uniUpper) && !EXCLUDED_UNIVERS.has(uniUpper)) {
      filters.univers = uniUpper;
      break;
    }
  }
  
  // Limit / Top N
  const topN = extractTopN(input.query);
  const limit = topN || metricDef.defaultTopN || (metricDef.isRanking ? 5 : undefined);
  
  // ─────────────────────────────────────────────────────────────
  // 10. CONSTRUIRE ParsedStatQuery
  // ─────────────────────────────────────────────────────────────
  
  const parsed: ParsedStatQuery = {
    metricId,
    univers: filters.univers as string | undefined,
    intentType: intentType as IntentType,
    limit,
    period,
    confidence: statsQueryResult.rawScore >= 5 ? 'high' : statsQueryResult.rawScore >= 2 ? 'medium' : 'low',
    keywordScore: statsQueryResult.rawScore,
    categories: statsQueryResult.detectedCategories,
    networkScope: scope === 'reseau',
    rawLLM: llmIntent as any,
  };
  
  return {
    type: 'stats',
    parsed,
    debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function extractDimensionFromKeywords(matches: KeywordMatch[]): DimensionType | null {
  const dimensionMap: Record<string, DimensionType> = {
    technicien: 'technicien',
    tech: 'technicien',
    apporteur: 'apporteur',
    commanditaire: 'apporteur',
    prescripteur: 'apporteur',
    univers: 'univers',
    metier: 'univers',
    agence: 'agence',
    client: 'client_type',
  };
  
  for (const match of matches) {
    const dim = dimensionMap[match.keyword.word.toLowerCase()];
    if (dim) return dim;
  }
  
  return null;
}

function extractIntentFromKeywords(matches: KeywordMatch[]): IntentType | null {
  const intentMap: Record<string, IntentType> = {
    top: 'top',
    meilleur: 'top',
    classement: 'top',
    moyenne: 'moyenne',
    moyen: 'moyenne',
    combien: 'volume',
    nombre: 'volume',
    taux: 'taux',
    pourcentage: 'taux',
    delai: 'delay',
    temps: 'delay',
  };
  
  for (const match of matches) {
    const intent = intentMap[match.keyword.word.toLowerCase()];
    if (intent) return intent;
  }
  
  return null;
}

function buildDebug(
  normalized: string,
  keywordMatches: KeywordMatch[],
  statsQueryResult: StatsQueryResult,
  detection: DetectionResult,
  llmDraft: unknown,
  corrections: ValidationCorrection[],
  routingSource: AiSearchDebugInfo['routingSource'],
  resolvedEntities?: ResolvedEntities
): AiSearchDebugInfo {
  return {
    normalizedQuery: normalized,
    keywordMatches,
    statsQueryResult,
    detection,
    llmDraft,
    corrections,
    routingSource,
    resolvedEntities,
  };
}

// ═══════════════════════════════════════════════════════════════
// VERSION ASYNC AVEC RÉSOLUTION D'ENTITÉS
// ═══════════════════════════════════════════════════════════════

/**
 * Route une requête avec résolution des entités nommées (techniciens, apporteurs)
 * Version asynchrone de aiSearchRoute
 */
export async function aiSearchRouteWithEntities(
  input: AiSearchInput,
  llmIntent: unknown | null = null
): Promise<AiSearchRoutedRequest> {
  const now = input.now || new Date();
  const normalized = input.normalizedQuery || normalizeQuery(input.query);
  const corrections: ValidationCorrection[] = [];
  
  // ─────────────────────────────────────────────────────────────
  // 0. RÉSOLUTION DES ENTITÉS NOMMÉES
  // ─────────────────────────────────────────────────────────────
  
  let resolvedEntities: ResolvedEntities = {};
  
  if (input.context.agencySlug) {
    resolvedEntities = await resolveEntities(input.query, input.context.agencySlug);
    
    // Vérifier les ambiguïtés d'entités
    if (resolvedEntities.ambiguousTechniciens && resolvedEntities.ambiguousTechniciens.length > 1) {
      return {
        type: 'entity_ambiguous',
        parsed: null,
        entityAmbiguous: {
          type: 'entity_ambiguous',
          entityType: 'technicien',
          candidates: resolvedEntities.ambiguousTechniciens,
          message: 'Plusieurs techniciens correspondent à votre recherche.',
          originalQuery: input.query,
        },
        debug: buildDebug(normalized, [], { isStats: false, rawScore: 0, score: 0, detectedCategories: [], strongCategories: [], normalizedScore: 0, reasoning: '' } as any, { type: 'unknown' } as any, llmIntent, corrections, 'heuristic', resolvedEntities),
      };
    }
    
    if (resolvedEntities.ambiguousApporteurs && resolvedEntities.ambiguousApporteurs.length > 1) {
      return {
        type: 'entity_ambiguous',
        parsed: null,
        entityAmbiguous: {
          type: 'entity_ambiguous',
          entityType: 'apporteur',
          candidates: resolvedEntities.ambiguousApporteurs,
          message: 'Plusieurs apporteurs correspondent à votre recherche.',
          originalQuery: input.query,
        },
        debug: buildDebug(normalized, [], { isStats: false, rawScore: 0, score: 0, detectedCategories: [], strongCategories: [], normalizedScore: 0, reasoning: '' } as unknown as StatsQueryResult, { type: 'unknown' } as any, llmIntent, corrections, 'heuristic', resolvedEntities),
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 1. ANALYSE KEYWORDS (source centrale de vérité)
  // ─────────────────────────────────────────────────────────────
  
  const keywordMatches = findAllKeywords(normalized);
  const statsQueryResult = isStatsQuery(normalized, input.query);
  const detection = detectQueryType(normalized, input.query);
  
  // ─────────────────────────────────────────────────────────────
  // 2. DÉTERMINER LE TYPE DE REQUÊTE
  // ─────────────────────────────────────────────────────────────
  
  let queryType: 'stats' | 'doc' | 'action' = 'doc';
  let routingSource: AiSearchDebugInfo['routingSource'] = 'heuristic';
  
  if (statsQueryResult.isStats) {
    queryType = 'stats';
    routingSource = 'keywords';
  } else if (detection.type === 'stats_query') {
    queryType = 'stats';
    routingSource = 'heuristic';
  } else if (detection.type === 'action_query') {
    queryType = 'action';
  }
  
  // LLM peut surclasser si confiance haute
  const llm = llmIntent as { queryType?: string; confidence?: number } | null;
  if (llm?.queryType && (llm.confidence ?? 0) >= 0.7) {
    if (llm.queryType === 'stats' || llm.queryType === 'stats_query') {
      queryType = 'stats';
      routingSource = 'llm';
    } else if (llm.queryType === 'doc' || llm.queryType === 'documentary_query') {
      queryType = 'doc';
      routingSource = 'llm';
    } else if (llm.queryType === 'action' || llm.queryType === 'action_query') {
      queryType = 'action';
      routingSource = 'llm';
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 3. PERMISSION : N0/N1 → pas de stats
  // ─────────────────────────────────────────────────────────────
  
  if (queryType === 'stats' && input.context.roleLevel < 2) {
    corrections.push({
      field: 'type',
      original: 'stats',
      corrected: 'doc',
      reason: 'Rôle insuffisant (N0/N1) pour les statistiques',
    });
    queryType = 'doc';
  }
  
  // ─────────────────────────────────────────────────────────────
  // 4. DÉTECTER SCOPE RÉSEAU
  // ─────────────────────────────────────────────────────────────
  
  let scope: 'agence' | 'reseau' = 'agence';
  
  for (const kw of NETWORK_KEYWORDS) {
    if (normalized.includes(kw)) {
      scope = 'reseau';
      break;
    }
  }
  
  if (scope === 'reseau' && input.context.roleLevel < 3) {
    corrections.push({
      field: 'scope',
      original: 'reseau',
      corrected: 'agence',
      reason: 'Scope réseau réservé aux N3+ (franchiseur)',
    });
    scope = 'agence';
  }
  
  // ─────────────────────────────────────────────────────────────
  // 5. ROUTING STATS : trouver la métrique
  // ─────────────────────────────────────────────────────────────
  
  if (queryType !== 'stats') {
    return {
      type: queryType,
      parsed: null,
      debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource, resolvedEntities),
    };
  }
  
  // Détecter dimension automatiquement selon entités résolues
  let dimension = detection.suggestedDimension || extractDimensionFromKeywords(keywordMatches) || 'global';
  const intentType = detection.suggestedIntent || extractIntentFromKeywords(keywordMatches) || 'valeur';
  
  // Si technicien résolu, forcer dimension technicien
  if (resolvedEntities.technicienId) {
    dimension = 'technicien';
  }
  // Si apporteur résolu, forcer dimension apporteur
  if (resolvedEntities.apporteurId) {
    dimension = 'apporteur';
  }
  
  // Essayer les règles NL en premier
  let metricId = findMetricFromNLRules(dimension, intentType, normalized);
  
  if (metricId) {
    routingSource = 'nl_rules';
  } else {
    const llmMetric = (llmIntent as { metric?: string } | null)?.metric;
    if (llmMetric && isValidMetricId(llmMetric)) {
      metricId = llmMetric;
      routingSource = 'llm';
    } else {
      const keywords = keywordMatches.map(m => m.keyword.word);
      const foundMetric = findMetricForIntent(dimension as DimensionType, intentType as IntentType, keywords);
      if (foundMetric) {
        metricId = foundMetric.id;
        routingSource = 'keywords';
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 6. GESTION AMBIGUÏTÉ OU ERREUR
  // ─────────────────────────────────────────────────────────────
  
  if (!metricId) {
    const candidates = findCandidateMetrics(normalized, keywordMatches, dimension, intentType);
    
    if (candidates.length > 1) {
      return {
        type: 'ambiguous',
        parsed: null,
        ambiguous: {
          type: 'ambiguous',
          candidates,
          message: 'Plusieurs métriques correspondent à votre requête. Veuillez préciser.',
          originalQuery: input.query,
        },
        debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource, resolvedEntities),
      };
    }
    
    if (candidates.length === 1) {
      metricId = candidates[0].metricId;
    } else {
      return {
        type: 'error',
        parsed: null,
        error: {
          code: 'METRIC_NOT_FOUND',
          message: 'Aucune métrique ne correspond à votre requête. Reformulez ou précisez votre demande.',
        },
        debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource, resolvedEntities),
      };
    }
  }
  
  const metricDef = getMetricById(metricId);
  if (!metricDef) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'UNKNOWN_METRIC',
        message: `Métrique '${metricId}' inconnue dans le registre.`,
      },
      debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource, resolvedEntities),
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 7. VÉRIFIER PERMISSIONS MÉTRIQUE
  // ─────────────────────────────────────────────────────────────
  
  const minRole = metricDef.minRole || 0;
  if (input.context.roleLevel < minRole) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'ACCESS_DENIED',
        message: `Cette métrique nécessite un niveau d'accès supérieur (N${minRole}+).`,
      },
      debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource, resolvedEntities),
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 8. EXTRAIRE PÉRIODE
  // ─────────────────────────────────────────────────────────────
  
  let period = extractPeriod(normalized, now);
  
  if (!period) {
    period = metricDef.isRanking ? getCurrentYearPeriod(now) : getDefaultPeriod(now);
    corrections.push({
      field: 'period',
      original: null,
      corrected: period.label,
      reason: 'Période non détectée, fallback appliqué',
    });
  }
  
  const periodMonths = Math.ceil(
    (new Date(period.to).getTime() - new Date(period.from).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  
  if (periodMonths > MAX_PERIOD_MONTHS) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'PERIOD_INVALID',
        message: `Période trop large (${periodMonths} mois). Maximum autorisé : ${MAX_PERIOD_MONTHS} mois.`,
      },
      debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource, resolvedEntities),
    };
  }
  
  // ─────────────────────────────────────────────────────────────
  // 9. EXTRAIRE FILTRES AVEC ENTITÉS RÉSOLUES
  // ─────────────────────────────────────────────────────────────
  
  const filters: Record<string, unknown> = {};
  
  // Univers
  const detectedUnivers = extractUniversFromMatches(keywordMatches);
  for (const uni of detectedUnivers) {
    const uniUpper = uni.toUpperCase();
    if (VALID_UNIVERS.has(uniUpper) && !EXCLUDED_UNIVERS.has(uniUpper)) {
      filters.univers = uniUpper;
      break;
    }
  }
  
  // Entités résolues → filtres
  if (resolvedEntities.technicienId) {
    filters.technicienId = resolvedEntities.technicienId;
    filters.technicienName = resolvedEntities.technicienName;
  }
  if (resolvedEntities.apporteurId) {
    filters.apporteurId = resolvedEntities.apporteurId;
    filters.apporteurName = resolvedEntities.apporteurName;
  }
  
  // Limit / Top N
  const topN = extractTopN(input.query);
  const limit = topN || metricDef.defaultTopN || (metricDef.isRanking ? 5 : undefined);
  
  // ─────────────────────────────────────────────────────────────
  // 10. CONSTRUIRE ParsedStatQuery
  // ─────────────────────────────────────────────────────────────
  
  const parsed: ParsedStatQuery = {
    metricId,
    univers: filters.univers as string | undefined,
    technicien: resolvedEntities.technicienName || undefined,
    apporteur: resolvedEntities.apporteurName || undefined,
    intentType: intentType as IntentType,
    limit,
    period,
    confidence: statsQueryResult.rawScore >= 5 ? 'high' : statsQueryResult.rawScore >= 2 ? 'medium' : 'low',
    keywordScore: statsQueryResult.rawScore,
    categories: statsQueryResult.detectedCategories,
    networkScope: scope === 'reseau',
    rawLLM: llmIntent as any,
  };
  
  return {
    type: 'stats',
    parsed,
    debug: buildDebug(normalized, keywordMatches, statsQueryResult, detection, llmIntent, corrections, routingSource, resolvedEntities),
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export { normalizeQuery } from './nlNormalize';
export { findAllKeywords, computeStatsScore } from './nlKeywords';
export { detectQueryType, isStatsQuery } from './detectQueryType';
export { extractPeriod, getDefaultPeriod, getCurrentYearPeriod } from './extractPeriod';
export { getMetricById, isValidMetricId, getAllMetricIds, METRICS_REGISTRY } from './metricsRegistry';
export { resolveEntities, invalidateEntityCache } from './entityResolver';
export type { ResolvedEntities, TechnicienCandidate, ApporteurCandidate } from './entityResolver';
export { NL_ROUTING_RULES, findMetricFromNLRules, findCandidateMetrics } from './nlRouting';
