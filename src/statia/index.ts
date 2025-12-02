/**
 * STATiA-BY-BIJ - Module central de métriques
 * 
 * Export principal du moteur de statistiques centralisé.
 * Intègre le moteur de règles métier v1.0
 * 
 * Usage:
 * import { useMetric, useAvailableMetrics, STATIA_RULES_JSON } from '@/statia';
 * 
 * const { value, loading, error } = useMetric('ca_mensuel', {
 *   agency_slug: 'lyon',
 *   date_from: new Date('2025-01-01'),
 *   date_to: new Date('2025-01-31'),
 * });
 */

// Types
export * from './types';

// Rules Engine v1.0
export * from './rules';

// Schema Apogée
export { APOGEE_SOURCES, getSourceDefinition, getFieldDefinition, canJoin, getJoinKeys, getAggregableFields, getGroupableFields } from './schema/apogeeSchema';

// Moteur de calcul
export { computeMetric, evaluateComplexity, determineExecutionTarget } from './engine/computeEngine';

// Moteur V2
export { runMetric } from './engine/metricEngine';
export type { MetricExecutionParams, MetricDefinitionJSON, MetricExecutionResult } from './engine/metricEngine';

// Hooks
export { useMetric, useAvailableMetrics, useMetricDefinition } from './hooks/useMetric';
export type { UseMetricOptions, UseMetricReturn } from './hooks/useMetric';

// Hooks V2
export { useMetricEngine, useMetricExecutor, clearMetricCache, invalidateMetricCache } from './hooks/useMetricEngine';

// Métriques POC
export { POC_METRICS, getPocMetricById, getValidatedPocMetrics } from './metrics/pocMetrics';
