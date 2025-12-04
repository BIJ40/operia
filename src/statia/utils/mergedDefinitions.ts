/**
 * StatIA - Fusion des définitions core + custom
 * Permet d'obtenir un registre unifié de toutes les métriques disponibles
 */

import { StatDefinition, StatDefinitionRegistry, StatResult, LoadedData, StatParams } from '../definitions/types';
import { STAT_DEFINITIONS } from '../definitions';
import { CustomMetric, CustomMetricDefinition } from '../services/customMetricsService';

/**
 * Convertit une métrique custom en StatDefinition exécutable
 */
export function customMetricToStatDefinition(custom: CustomMetric): StatDefinition {
  const def = custom.definition_json;
  
  return {
    id: custom.id,
    label: custom.label,
    description: custom.description || undefined,
    category: (custom.category || 'custom') as any,
    source: (def.sources?.[0] || 'factures') as any,
    dimensions: (def.dimensions || []) as any[],
    aggregation: def.aggregation || 'sum',
    unit: def.measure?.includes('taux') ? '%' : '€',
    compute: createComputeFunction(def),
  };
}

/**
 * Crée une fonction compute dynamique basée sur la définition JSON
 */
function createComputeFunction(def: CustomMetricDefinition): (data: LoadedData, params: StatParams) => StatResult {
  return (data: LoadedData, params: StatParams) => {
    // Implémentation simplifiée - à étendre selon les besoins
    const source = def.sources?.[0] || 'factures';
    const sourceData = data[source as keyof LoadedData] || [];
    
    let value = 0;
    
    switch (def.aggregation) {
      case 'count':
        value = sourceData.length;
        break;
      case 'sum':
        value = sourceData.reduce((acc: number, item: any) => {
          const amount = item.totalHT || item.montantHT || item.data?.totalHT || 0;
          return acc + (Number(amount) || 0);
        }, 0);
        break;
      case 'avg':
        if (sourceData.length === 0) {
          value = 0;
        } else {
          const sum = sourceData.reduce((acc: number, item: any) => {
            const amount = item.totalHT || item.montantHT || item.data?.totalHT || 0;
            return acc + (Number(amount) || 0);
          }, 0);
          value = sum / sourceData.length;
        }
        break;
      default:
        value = sourceData.length;
    }
    
    return {
      value,
      metadata: {
        computedAt: new Date(),
        source: source as any,
        recordCount: sourceData.length,
      },
    };
  };
}

/**
 * Fusionne les définitions core avec les custom metrics
 */
export function getMergedDefinitions(customMetrics: CustomMetric[]): StatDefinitionRegistry {
  const merged: StatDefinitionRegistry = { ...STAT_DEFINITIONS };
  
  for (const custom of customMetrics) {
    if (custom.is_active) {
      merged[custom.id] = customMetricToStatDefinition(custom);
    }
  }
  
  return merged;
}

/**
 * Liste toutes les métriques disponibles (core + custom)
 */
export function listAllDefinitions(customMetrics: CustomMetric[]): StatDefinition[] {
  const merged = getMergedDefinitions(customMetrics);
  return Object.values(merged);
}

/**
 * Récupère une définition (core ou custom)
 */
export function getDefinition(
  id: string, 
  customMetrics: CustomMetric[]
): StatDefinition | undefined {
  // Chercher d'abord dans core
  if (STAT_DEFINITIONS[id]) {
    return STAT_DEFINITIONS[id];
  }
  
  // Sinon chercher dans custom
  const custom = customMetrics.find(m => m.id === id && m.is_active);
  if (custom) {
    return customMetricToStatDefinition(custom);
  }
  
  return undefined;
}
