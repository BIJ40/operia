/**
 * Re-export for backward compatibility
 * All consumers importing from '@/hooks/usePerformanceTerrain' continue to work
 */

export {
  usePerformanceTerrain,
  useTechnicianPerformance,
} from '@/modules/performance/hooks/usePerformanceTerrain';

export type {
  PerformanceTerrainData,
} from '@/modules/performance/hooks/usePerformanceTerrain';

export type {
  TechnicianPerformance,
} from '@/modules/performance/engine/types';
