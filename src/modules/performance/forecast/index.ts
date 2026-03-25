/**
 * Forecast module — Phase 6
 * Public API surface
 */

// Types
export type {
  ForecastHorizon,
  ForecastConfidenceLevel,
  ForecastPenalty,
  ForecastPenaltyCode,
  ProjectedCapacity,
  ForecastSnapshot,
  ForecastTeamStats,
  CapacityFutureInput,
  PredictedTensionLevel,
  ForecastRecommendation,
} from './types';

export { FORECAST_HORIZONS, horizonToDays } from './types';

// Capacity forecast
export { computeFutureCapacity, computeFutureCapacityAllHorizons } from './capacityFuture';

// Projection (team aggregation)
export { aggregateForecastTeamStats } from './projection';
