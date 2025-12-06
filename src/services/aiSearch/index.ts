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
} from './nlKeywords';

// Détection type requête
export { detectQueryType, isStatsQuery, isActionQuery } from './detectQueryType';

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
