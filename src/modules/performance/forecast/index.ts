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
  // Lot 2
  ForecastWorkSource,
  ForecastWorkCategory,
  ForecastLoadConfidenceLevel,
  ForecastWorkItem,
  CommittedWorkloadInput,
  ForecastConsolidationTrace,
  ForecastCommittedWorkload,
  ForecastCommittedTeamStats,
} from './types';

export { FORECAST_HORIZONS, horizonToDays } from './types';

// Capacity forecast
export { computeFutureCapacity, computeFutureCapacityAllHorizons } from './capacityFuture';

// Committed workload (Lot 2)
export { computeCommittedWorkload } from './committedWorkload';
export type { CommittedWorkloadResult } from './committedWorkload';

// Projection (team aggregation + merge)
export { aggregateForecastTeamStats, mergeCapacityAndCommittedWorkload } from './projection';
