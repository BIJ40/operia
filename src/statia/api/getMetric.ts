/**
 * StatIA V1 - API principale
 * Point d'entrée unique pour toutes les métriques StatIA
 */

import { StatParams, StatResult } from '../definitions/types';
import { computeStat, computeMultipleStats, clearComputeCache } from '../engine/computeStat';
import { ApogeeDataServices } from '../engine/loaders';
import { hasStatDefinition, getStatDefinition, listStatDefinitions } from '../definitions';

export { clearComputeCache };

/**
 * Récupère une métrique StatIA
 * 
 * @param statId - Identifiant de la métrique (ex: "ca_global_ht", "ca_par_univers")
 * @param params - Paramètres de calcul
 * @param services - Services de données Apogée
 * 
 * @example
 * ```typescript
 * const result = await getMetric('ca_global_ht', {
 *   dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
 *   agencySlug: 'dax'
 * }, apogeeServices);
 * 
 * console.log(result.value); // 1234567.89
 * ```
 */
export async function getMetric(
  statId: string,
  params: StatParams,
  services: ApogeeDataServices
): Promise<StatResult> {
  return computeStat(statId, params, services);
}

/**
 * Récupère plusieurs métriques en une seule fois
 * Plus efficace que des appels multiples à getMetric
 * 
 * @example
 * ```typescript
 * const results = await getMetrics(
 *   ['ca_global_ht', 'ca_par_univers', 'taux_sav_global'],
 *   params,
 *   services
 * );
 * ```
 */
export async function getMetrics(
  statIds: string[],
  params: StatParams,
  services: ApogeeDataServices
): Promise<Record<string, StatResult>> {
  return computeMultipleStats(statIds, params, services);
}

/**
 * Vérifie si une métrique existe dans le registre
 */
export function isValidMetric(statId: string): boolean {
  return hasStatDefinition(statId);
}

/**
 * Récupère les informations sur une métrique (sans la calculer)
 */
export function getMetricInfo(statId: string) {
  const definition = getStatDefinition(statId);
  if (!definition) return null;
  
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    category: definition.category,
    source: definition.source,
    dimensions: definition.dimensions,
    aggregation: definition.aggregation,
    unit: definition.unit,
  };
}

/**
 * Liste toutes les métriques disponibles avec leurs informations
 */
export function listAvailableMetrics() {
  return listStatDefinitions().map(def => ({
    id: def.id,
    label: def.label,
    description: def.description,
    category: def.category,
    dimensions: def.dimensions,
    unit: def.unit,
  }));
}
