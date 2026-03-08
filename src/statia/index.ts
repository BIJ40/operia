/**
 * StatIA V2 - Module principal
 * Exports publics du moteur de statistiques centralisé
 * 
 * PHASE 2 CLEANUP: Removed unused V1/POC exports, consolidated barrel
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

// === V1 Engine (legacy — prefer V2 metricEngine for new code) ===
export { computeStat, computeMultipleStats, clearComputeCache as clearEngineCache } from './engine/computeStat';
export type { ApogeeDataServices } from './engine/loaders';

// === Hooks ===
export { useStatiaMetric, useStatiaMetrics, useStatiaForAgency, useStatiaForNetwork } from './hooks/useStatia';
export { useStatiaIndicateurs, useStatiaKpi, type IndicateursData } from './hooks/useStatiaIndicateurs';

// === Hooks Phase 2 (contexte Agence intégré) ===
export { 
  useStatiaAgencyMetric,
  useStatiaAgencyMetrics, 
  useStatiaDashboard,
  useStatiaCA,
  useStatiaCAParUnivers,
  useStatiaTauxSAV,
  useStatiaTauxTransformation,
  useStatiaTauxRecouvrement
} from './hooks/useStatiaAgency';

// === Adapters ===
export { 
  createApogeeDataServicesAdapter, 
  getGlobalApogeeDataServices, 
  resetApogeeDataServicesAdapter 
} from './adapters/dataServiceAdapter';

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

// === V2 Metric Engine (preferred for new metrics) ===
export { runMetric } from './engine/metricEngine';
export type { MetricExecutionParams, MetricDefinitionJSON, MetricExecutionResult } from './engine/metricEngine';

// === Hooks V2 ===
export { useMetricEngine, useMetricExecutor, clearMetricCache, invalidateMetricCache } from './hooks/useMetricEngine';

// === Hooks legacy (thin wrappers) ===
export { useMetric, useAvailableMetrics, useMetricDefinition } from './hooks/useMetric';
export type { UseMetricOptions, UseMetricReturn } from './hooks/useMetric';
