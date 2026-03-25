/**
 * Performance Terrain — Zone classification
 * Seuils paramétrables via config agence
 */

import type { ProductivityZone, SavZone, LoadZone, TensionLevel, PerformanceConfig } from './types';
import { DEFAULT_THRESHOLDS } from './rules';

export function getProductivityZone(rate: number, config: PerformanceConfig = DEFAULT_THRESHOLDS): ProductivityZone {
  if (rate >= config.productivityOptimal) return 'optimal';
  if (rate >= config.productivityWarning) return 'warning';
  return 'critical';
}

export function getSavZone(rate: number, config: PerformanceConfig = DEFAULT_THRESHOLDS): SavZone {
  if (rate <= config.savOptimal) return 'optimal';
  if (rate <= config.savWarning) return 'warning';
  return 'critical';
}

export function getLoadZone(ratio: number, config: PerformanceConfig = DEFAULT_THRESHOLDS): LoadZone {
  if (ratio < config.loadMin) return 'underload';
  if (ratio <= config.loadMax) return 'balanced';
  return 'overload';
}

/**
 * Composite tension level based on productivity + load + SAV.
 * Uses same scoring logic as TeamHeatmap but with configurable thresholds.
 */
export function getTensionLevel(
  productivity: number,
  loadRatio: number | null,
  savRate: number,
  config: PerformanceConfig = DEFAULT_THRESHOLDS
): TensionLevel {
  const pScore = productivity >= config.productivityOptimal ? 2 : productivity >= config.productivityWarning ? 1 : 0;
  const lScore = loadRatio == null ? 1 : (loadRatio >= config.loadMin && loadRatio <= config.loadMax ? 2 : loadRatio >= 0.6 && loadRatio <= 1.3 ? 1 : 0);
  const sScore = savRate <= config.savOptimal ? 2 : savRate <= config.savWarning ? 1 : 0;

  const total = pScore + lScore + sScore;
  if (total >= 5) return 'comfort';
  if (total >= 3) return 'optimization';
  return 'tension';
}
