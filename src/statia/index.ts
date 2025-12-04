/**
 * StatIA V2 - Module principal
 * Exports publics du moteur de statistiques centralisé
 */

// === API principale ===
export { 
  getMetric, 
  getMetrics, 
  isValidMetric, 
  getMetricInfo, 
  listAvailableMetrics,
  clearComputeCache 
} from './api/getMetric';

// === API Agence ===
export { 
  getMetricForAgency, 
  getMetricsForAgency, 
  getAgencyDashboard,
  type AgencyMetricParams 
} from './api/getMetricForAgency';

// === API Réseau/Franchiseur ===
export { 
  getMetricForNetwork, 
  getMetricsForNetwork, 
  getNetworkDashboard,
  type NetworkMetricParams,
  type NetworkStatResult 
} from './api/getMetricForNetwork';

// === Definitions ===
export { 
  STAT_DEFINITIONS, 
  getStatDefinition, 
  hasStatDefinition, 
  listStatDefinitions,
  listStatDefinitionsByCategory,
  listCategories,
  getRegistrySummary
} from './definitions';

// === Merged Definitions (Core + Custom) ===
export {
  getMergedDefinitions,
  listAllDefinitions,
  getDefinition,
  customMetricToStatDefinition
} from './utils/mergedDefinitions';

export type { 
  StatDefinition, 
  StatParams, 
  StatResult, 
  LoadedData, 
  DateRange,
  StatCategory,
  DataSource,
  Dimension,
  AggregationType
} from './definitions/types';

// === Engine ===
export { computeStat, computeMultipleStats, clearComputeCache as clearEngineCache } from './engine/computeStat';
export type { ApogeeDataServices } from './engine/loaders';

// === Hooks ===
export { useStatiaMetric, useStatiaMetrics, useStatiaForAgency, useStatiaForNetwork } from './hooks/useStatia';

// === Components ===
export { StatiaBuilder } from './components/StatiaBuilder';

// === Domain Rules ===
export { STATIA_RULES } from './domain/rules';

// === Rules Engine v1.0 ===
export { 
  STATIA_RULES_JSON,
  resolveInterventionType,
  isProductiveIntervention,
  isSAVIntervention,
  getDateField,
  normalizeSynonym,
  parseNLPGroupBy,
  extractFactureMeta,
  isFactureStateIncluded as isFactureStateIncludedRule,
  getGroupByConfig,
  type FactureMeta
} from './rules/rules';

// === Types ===
export type {
  AggregationType as FormulaAggregationType,
  FilterCondition,
  FormulaDefinition,
  ApogeeSourceName,
  InputSource,
  MetricScope,
  ValidationStatus,
  ComputeHint,
  VisibilityTarget,
  MetricDefinition,
  MetricParams,
  LoadDebugInfo,
  MetricResult,
  MetricError,
  ComputeContext,
  ComputeComplexity
} from './types';
export { isValidAggregationType, isValidScope } from './types';

// === Schema Apogée ===
export { APOGEE_SOURCES, getSourceDefinition, getFieldDefinition, canJoin, getJoinKeys, getAggregableFields, getGroupableFields } from './schema/apogeeSchema';

// === Moteur de calcul ===
export { computeMetric, evaluateComplexity, determineExecutionTarget } from './engine/computeEngine';

// === Moteur V2 ===
export { runMetric } from './engine/metricEngine';
export type { MetricExecutionParams, MetricDefinitionJSON, MetricExecutionResult } from './engine/metricEngine';

// === Hooks legacy ===
export { useMetric, useAvailableMetrics, useMetricDefinition } from './hooks/useMetric';
export type { UseMetricOptions, UseMetricReturn } from './hooks/useMetric';

// === Hooks V2 ===
export { useMetricEngine, useMetricExecutor, clearMetricCache, invalidateMetricCache } from './hooks/useMetricEngine';

// === Métriques POC ===
export { POC_METRICS, getPocMetricById, getValidatedPocMetrics } from './metrics/pocMetrics';
