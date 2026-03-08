/**
 * StatIA V1 - API spécifique Réseau/Franchiseur
 * Agrégation multi-agences selon STATIA_RULES
 */

import { StatParams, StatResult, DateRange, AggregationType } from '../definitions/types';
import { getMetric } from './getMetric';
import { getStatDefinition } from '../definitions';
import { ApogeeDataServices } from '../engine/loaders';

/**
 * Paramètres pour les métriques réseau
 */
export interface NetworkMetricParams {
  dateRange: DateRange;
  groupBy?: ('univers' | 'apporteur' | 'technicien' | 'mois' | 'agence')[];
  filters?: Record<string, unknown>;
}

/**
 * Résultat agrégé pour le réseau
 */
export interface NetworkStatResult extends StatResult {
  byAgency?: Record<string, StatResult>;
  aggregationType: AggregationType;
}

/**
 * Agrège les résultats de plusieurs agences selon le type d'agrégation
 */
function aggregateResults(
  results: Record<string, StatResult>,
  aggregationType: AggregationType
): number | Record<string, number> {
  const values = Object.values(results).map(r => r.value);
  
  // Si les valeurs sont des objets (groupBy), agréger par clé
  if (typeof values[0] === 'object' && values[0] !== null) {
    const aggregated: Record<string, number> = {};
    
    for (const value of values) {
      for (const [key, val] of Object.entries(value as Record<string, number>)) {
        switch (aggregationType) {
          case 'sum':
          case 'count':
            aggregated[key] = (aggregated[key] || 0) + (val || 0);
            break;
          case 'avg':
            // Pour avg, on accumule puis on divise
            aggregated[key] = (aggregated[key] || 0) + (val || 0);
            break;
          case 'max':
            aggregated[key] = Math.max(aggregated[key] || -Infinity, val || 0);
            break;
          case 'min':
            aggregated[key] = Math.min(aggregated[key] || Infinity, val || 0);
            break;
        }
      }
    }
    
    // Finaliser avg
    if (aggregationType === 'avg') {
      const agencyCount = values.length;
      for (const key of Object.keys(aggregated)) {
        aggregated[key] = aggregated[key] / agencyCount;
      }
    }
    
    return aggregated;
  }
  
  // Valeurs simples
  const numericValues = values.filter(v => typeof v === 'number') as number[];
  
  switch (aggregationType) {
    case 'sum':
    case 'count':
      return numericValues.reduce((sum, v) => sum + v, 0);
    case 'avg':
      return numericValues.length > 0 
        ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length 
        : 0;
    case 'max':
      return Math.max(...numericValues);
    case 'min':
      return Math.min(...numericValues);
    case 'ratio':
      // Pour les ratios, on recalcule à partir des breakdowns si disponibles
      return numericValues.length > 0 
        ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length 
        : 0;
    default:
      return numericValues.reduce((sum, v) => sum + v, 0);
  }
}

/**
 * Récupère une métrique agrégée pour tout le réseau
 * 
 * @param statId - Identifiant de la métrique
 * @param agencySlugs - Liste des slugs d'agences
 * @param params - Paramètres de calcul
 * @param services - Services de données Apogée
 * 
 * @example
 * ```typescript
 * const networkCA = await getMetricForNetwork(
 *   'ca_global_ht',
 *   ['dax', 'toulouse', 'bordeaux'],
 *   { dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') } },
 *   apogeeServices
 * );
 * ```
 */
export async function getMetricForNetwork(
  statId: string,
  agencySlugs: string[],
  params: NetworkMetricParams,
  services: ApogeeDataServices
): Promise<NetworkStatResult> {
  const definition = getStatDefinition(statId);
  if (!definition) {
    throw new Error(`StatIA: Unknown metric ID "${statId}"`);
  }
  
  const aggregationType = definition.aggregation;
  
  // Calculer pour chaque agence en parallèle
  const agencyResults: Record<string, StatResult> = {};
  
  await Promise.all(
    agencySlugs.map(async (agencySlug) => {
      try {
        const fullParams: StatParams = {
          ...params,
          agencySlug,
        };
        agencyResults[agencySlug] = await getMetric(statId, fullParams, services);
      } catch (error) {
        console.error(`StatIA Network: Error for agency ${agencySlug}:`, error);
        agencyResults[agencySlug] = {
          value: 0,
          metadata: {
            computedAt: new Date(),
            source: Array.isArray(definition.source) ? definition.source[0] : definition.source,
            recordCount: 0,
          },
          breakdown: {
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        };
      }
    })
  );
  
  // Agréger les résultats
  const aggregatedValue = aggregateResults(agencyResults, aggregationType);
  
  // Calculer les métadonnées agrégées
  const totalRecordCount = Object.values(agencyResults).reduce(
    (sum, r) => sum + (r.metadata?.recordCount || 0), 
    0
  );
  
  return {
    value: aggregatedValue,
    metadata: {
      computedAt: new Date(),
      source: Array.isArray(definition.source) ? definition.source[0] : definition.source,
      recordCount: totalRecordCount,
    },
    breakdown: {
      agencyCount: agencySlugs.length,
      successCount: Object.values(agencyResults).filter(r => !r.breakdown?.error).length,
    },
    byAgency: agencyResults,
    aggregationType,
  };
}

/**
 * Récupère plusieurs métriques agrégées pour le réseau
 */
export async function getMetricsForNetwork(
  statIds: string[],
  agencySlugs: string[],
  params: NetworkMetricParams,
  services: ApogeeDataServices
): Promise<Record<string, NetworkStatResult>> {
  const results: Record<string, NetworkStatResult> = {};
  
  await Promise.all(
    statIds.map(async (statId) => {
      results[statId] = await getMetricForNetwork(statId, agencySlugs, params, services);
    })
  );
  
  return results;
}

/**
 * Récupère le dashboard réseau complet
 */
export async function getNetworkDashboard(
  agencySlugs: string[],
  params: NetworkMetricParams,
  services: ApogeeDataServices
): Promise<{
  ca: { global: NetworkStatResult; parUnivers: NetworkStatResult };
  devis: { tauxTransformation: NetworkStatResult };
  sav: { taux: NetworkStatResult };
  topAgencies: { byCA: Array<{ slug: string; ca: number }> };
}> {
  const [caGlobal, caParUnivers, tauxTransformation, tauxSav] = await Promise.all([
    getMetricForNetwork('ca_global_ht', agencySlugs, params, services),
    getMetricForNetwork('ca_par_univers', agencySlugs, params, services),
    getMetricForNetwork('taux_transformation_devis_nombre', agencySlugs, params, services),
    getMetricForNetwork('taux_sav_global', agencySlugs, params, services),
  ]);
  
  // Extraire le classement des agences par CA
  const topAgencies = Object.entries(caGlobal.byAgency || {})
    .map(([slug, result]) => ({
      slug,
      ca: typeof result.value === 'number' ? result.value : 0,
    }))
    .sort((a, b) => b.ca - a.ca);
  
  return {
    ca: {
      global: caGlobal,
      parUnivers: caParUnivers,
    },
    devis: {
      tauxTransformation,
    },
    sav: {
      taux: tauxSav,
    },
    topAgencies: {
      byCA: topAgencies,
    },
  };
}
