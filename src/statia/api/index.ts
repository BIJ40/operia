/**
 * StatIA V1 - API Index
 * Exports publics de l'API StatIA
 */

// API principale
export { 
  getMetric, 
  getMetrics, 
  isValidMetric, 
  getMetricInfo, 
  listAvailableMetrics,
  clearComputeCache 
} from './getMetric';

// API Agence
export { 
  getMetricForAgency, 
  getMetricsForAgency, 
  getAgencyDashboard,
  type AgencyMetricParams 
} from './getMetricForAgency';

// API Réseau/Franchiseur
export { 
  getMetricForNetwork, 
  getMetricsForNetwork, 
  getNetworkDashboard,
  type NetworkMetricParams,
  type NetworkStatResult 
} from './getMetricForNetwork';
