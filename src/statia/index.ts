/**
 * STATiA-BY-BIJ - Module central de métriques
 * 
 * Export principal du moteur de statistiques centralisé.
 * 
 * Usage:
 * import { useMetric, useAvailableMetrics } from '@/statia';
 * 
 * const { value, loading, error } = useMetric('ca_mensuel', {
 *   agency_slug: 'lyon',
 *   date_from: new Date('2025-01-01'),
 *   date_to: new Date('2025-01-31'),
 * });
 */

// Types
export * from './types';

// Schema Apogée
export { APOGEE_SOURCES, getSourceDefinition, getFieldDefinition, canJoin, getJoinKeys, getAggregableFields, getGroupableFields } from './schema/apogeeSchema';

// Moteur de calcul
export { computeMetric, evaluateComplexity, determineExecutionTarget } from './engine/computeEngine';

// Hooks
export { useMetric, useAvailableMetrics, useMetricDefinition } from './hooks/useMetric';
export type { UseMetricOptions, UseMetricReturn } from './hooks/useMetric';

// Métriques POC
export { POC_METRICS, getPocMetricById, getValidatedPocMetrics } from './metrics/pocMetrics';
