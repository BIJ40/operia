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
  ForecastCapacitySnapshot,
  ForecastTechnicianInput,
  FutureAbsenceEntry,
  ForecastInput,
  ForecastOutput,
  PredictedTensionLevel,
  Recommendation,
} from './types';

export { FORECAST_HORIZONS, horizonToDays } from './types';

// Capacity forecast
export { computeForecastCapacity } from './capacityFuture';

// Projection (will grow in Lot 3)
export { computeForecastCapacity as computeProjection } from './projection';
