/**
 * StatIA V1 - Moteur de calcul générique
 */

import { StatParams, StatResult, LoadedData } from '../definitions/types';
import { getStatDefinition, hasStatDefinition } from '../definitions';
import { loadDataForSources, ApogeeDataServices } from './loaders';

/**
 * Cache en mémoire pour éviter les recalculs identiques
 */
const computeCache = new Map<string, { result: StatResult; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Génère une clé de cache unique pour une requête
 */
function generateCacheKey(statId: string, params: StatParams): string {
  return JSON.stringify({
    statId,
    dateRange: {
      start: params.dateRange.start.toISOString(),
      end: params.dateRange.end.toISOString(),
    },
    agencySlug: params.agencySlug,
    groupBy: params.groupBy,
    filters: params.filters,
  });
}

/**
 * Récupère un résultat depuis le cache s'il est valide
 */
function getFromCache(cacheKey: string): StatResult | null {
  const cached = computeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }
  return null;
}

/**
 * Stocke un résultat dans le cache
 */
function setInCache(cacheKey: string, result: StatResult): void {
  computeCache.set(cacheKey, { result, timestamp: Date.now() });
  
  // Nettoyage périodique du cache (garder max 100 entrées)
  if (computeCache.size > 100) {
    const oldestKey = computeCache.keys().next().value;
    if (oldestKey) computeCache.delete(oldestKey);
  }
}

/**
 * Nettoie le cache
 */
export function clearComputeCache(): void {
  computeCache.clear();
}

/**
 * Moteur principal de calcul StatIA
 * 
 * @param statId - Identifiant de la métrique
 * @param params - Paramètres de calcul (période, agence, filtres)
 * @param services - Services de données Apogée
 * @param options - Options de calcul
 */
export async function computeStat(
  statId: string,
  params: StatParams,
  services: ApogeeDataServices,
  options: { useCache?: boolean } = { useCache: true }
): Promise<StatResult> {
  // Validation
  if (!hasStatDefinition(statId)) {
    throw new Error(`StatIA: Unknown metric ID "${statId}"`);
  }
  
  if (!params.agencySlug) {
    throw new Error('StatIA: agencySlug is required');
  }
  
  if (!params.dateRange?.start || !params.dateRange?.end) {
    throw new Error('StatIA: dateRange with start and end is required');
  }
  
  // Récupérer la définition
  const definition = getStatDefinition(statId)!;
  
  // Vérifier le cache
  const cacheKey = generateCacheKey(statId, params);
  if (options.useCache) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Déterminer les sources de données nécessaires
  const sources = Array.isArray(definition.source) 
    ? definition.source 
    : [definition.source];
  
  // Ajouter les sources nécessaires pour les dimensions
  if (definition.dimensions?.includes('technicien')) {
    if (!sources.includes('interventions')) sources.push('interventions');
    if (!sources.includes('users')) sources.push('users');
  }
  if (definition.dimensions?.includes('apporteur') || definition.dimensions?.includes('type_apporteur')) {
    if (!sources.includes('clients')) sources.push('clients');
    if (!sources.includes('projects')) sources.push('projects');
  }
  if (definition.dimensions?.includes('univers')) {
    if (!sources.includes('projects')) sources.push('projects');
  }
  
  // Charger les données
  const loadedData = await loadDataForSources(sources, params, services) as LoadedData;
  
  // Assurer que toutes les propriétés sont présentes (même vides)
  const data: LoadedData = {
    factures: loadedData.factures || [],
    devis: loadedData.devis || [],
    interventions: loadedData.interventions || [],
    projects: loadedData.projects || [],
    users: loadedData.users || [],
    clients: loadedData.clients || [],
  };
  
  // Exécuter le calcul
  const result = definition.compute(data, params);
  
  // Enrichir les métadonnées
  const enrichedResult: StatResult = {
    ...result,
    metadata: {
      ...result.metadata,
      computedAt: new Date(),
    }
  };
  
  // Stocker dans le cache
  if (options.useCache) {
    setInCache(cacheKey, enrichedResult);
  }
  
  return enrichedResult;
}

/**
 * Calcule plusieurs métriques en parallèle
 */
export async function computeMultipleStats(
  statIds: string[],
  params: StatParams,
  services: ApogeeDataServices
): Promise<Record<string, StatResult>> {
  const results: Record<string, StatResult> = {};
  
  // Exécuter tous les calculs en parallèle
  const promises = statIds.map(async (statId) => {
    try {
      results[statId] = await computeStat(statId, params, services);
    } catch (error) {
      console.error(`StatIA: Error computing ${statId}:`, error);
      results[statId] = {
        value: 0,
        metadata: {
          computedAt: new Date(),
          source: 'factures',
          recordCount: 0,
        },
        breakdown: {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      };
    }
  });
  
  await Promise.all(promises);
  
  return results;
}
