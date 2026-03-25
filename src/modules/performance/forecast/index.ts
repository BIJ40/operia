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
  // Lot 3
  ForecastProbableSource,
  ForecastProbabilityTier,
  ForecastProbableConfidenceLevel,
  ForecastProbableItem,
  ProbableWorkloadInput,
  ForecastProbableWorkload,
  ForecastProbableTeamStats,
  // Lot 4
  ForecastTensionFactor,
  ForecastTensionSnapshot,
  ForecastTeamTensionStats,
} from './types';

export { FORECAST_HORIZONS, horizonToDays } from './types';

// Capacity forecast
export { computeFutureCapacity, computeFutureCapacityAllHorizons } from './capacityFuture';

// Committed workload (Lot 2)
export { computeCommittedWorkload } from './committedWorkload';
export type { CommittedWorkloadResult } from './committedWorkload';

// Probable workload (Lot 3)
export { computeProbableWorkload } from './probableWorkload';
export type { ProbableWorkloadResult } from './probableWorkload';

// Projection (team aggregation + merge)
export {
  aggregateForecastTeamStats,
  mergeCapacityAndCommittedWorkload,
  mergeCommittedAndProbableIntoForecast,
} from './projection';

// Tension prédictive (Lot 4)
export { computeForecastTension, aggregateForecastTeamTension } from './tension';
