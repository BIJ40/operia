/**
 * StatIA AI Search - Module principal
 * Pipeline IA hybride : LLM + Déterministe
 */

// Types
export * from './types';

// Normalisation
export { normalizeQuery, tokenize, extractNumbers, extractTopN } from './nlNormalize';

// Keywords
export { 
  findKeyword, 
  findAllKeywords, 
  computeStatsScore, 
  getDominantCategory,
  extractUniversFromMatches,
  extractDimensionFromMatches,
  getKeywordsByCategory,
  getKeywordStats,
} from './nlKeywords';

// Détection type requête
export { 
  detectQueryType, 
  isStatsQuery, 
  isStatsQuerySimple,
  isActionQuery,
  getStrongStatsCategories,
  type StatsQueryResult,
  type DetectionResult,
} from './detectQueryType';

// Extraction période
export { extractPeriod, getDefaultPeriod, getCurrentYearPeriod } from './extractPeriod';

// Registre métriques
export { 
  getMetricById, 
  isValidMetricId, 
  findMetricsByKeyword,
  findMetricForIntent,
  getMetricsByCategory,
  getAllMetricIds,
  METRICS_REGISTRY,
} from './metricsRegistry';
export type { MetricDefinition, MetricCategory, MetricUnit } from './metricsRegistry';

// Validation & Routing
export { validateAndRoute } from './validateAndRoute';

// Extraction LLM
export { extractIntentWithLLM } from './extractIntentLLM';

// Re-export des types principaux pour faciliter l'import
export type {
  QueryType,
  DimensionType,
  IntentType,
  ParsedPeriod,
  ParsedStatQuery,
  IntentConfidence,
  LLMDraftIntent,
  ValidatedIntent,
  ValidationCorrection,
  AmbiguousResult,
  MetricCandidate,
  StatsResult,
  DocResult,
  ActionResult,
  SearchResult,
  UserContext,
  IntentDebugInfo,
} from './types';
