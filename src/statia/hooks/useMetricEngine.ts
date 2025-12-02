/**
 * STATiA-BY-BIJ - Hook d'exécution de métriques V2
 * 
 * API simplifiée pour exécuter des métriques générées par l'IA.
 * Intègre les règles métier centralisées depuis /statia/rules/
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { runMetric, MetricExecutionParams, MetricDefinitionJSON, MetricExecutionResult } from '../engine/metricEngine';
import { STATIA_RULES_JSON, parseNLPGroupBy, normalizeSynonym } from '../rules/rules';

// Re-export runMetric for direct usage
export { runMetric };

// Re-export rules for convenience
export { STATIA_RULES_JSON, parseNLPGroupBy, normalizeSynonym };

// ============================================
// TYPES
// ============================================

export interface UseMetricEngineOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

export interface UseMetricEngineReturn {
  result: MetricExecutionResult | null;
  loading: boolean;
  error: Error | null;
  execute: () => void;
  refetch: () => void;
}

// ============================================
// CACHE EN MÉMOIRE
// ============================================

const metricCache = new Map<string, { result: MetricExecutionResult; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateCacheKey(definition: MetricDefinitionJSON, params: MetricExecutionParams): string {
  return JSON.stringify({
    id: definition.id,
    params: {
      agency_slug: params.agency_slug,
      date_from: params.date_from instanceof Date ? params.date_from.toISOString() : params.date_from,
      date_to: params.date_to instanceof Date ? params.date_to.toISOString() : params.date_to,
    },
  });
}

function getCachedResult(key: string): MetricExecutionResult | null {
  const cached = metricCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }
  metricCache.delete(key);
  return null;
}

function setCachedResult(key: string, result: MetricExecutionResult): void {
  metricCache.set(key, { result, timestamp: Date.now() });
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook pour exécuter une métrique à partir de sa définition JSON
 */
export function useMetricEngine(
  definition: MetricDefinitionJSON | null,
  params: MetricExecutionParams,
  options: UseMetricEngineOptions = {}
): UseMetricEngineReturn {
  const { 
    enabled = true, 
    staleTime = 5 * 60 * 1000,
    refetchOnWindowFocus = false,
  } = options;

  const queryClient = useQueryClient();
  const queryKey = ['statia-engine', definition?.id, params];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<MetricExecutionResult> => {
      if (!definition) {
        throw new Error('Définition de métrique manquante');
      }

      // Vérifier le cache
      const cacheKey = generateCacheKey(definition, params);
      const cached = getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      // Exécuter la métrique
      const result = await runMetric(definition, params);
      
      // Mettre en cache si succès
      if (result.success) {
        setCachedResult(cacheKey, result);
      }

      return result;
    },
    enabled: enabled && !!definition && !!params.agency_slug,
    staleTime,
    refetchOnWindowFocus,
    retry: 1,
  });

  return {
    result: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    execute: () => query.refetch(),
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
}

// ============================================
// HOOK D'EXÉCUTION MANUELLE
// ============================================

/**
 * Hook pour exécuter une métrique manuellement (sans auto-fetch)
 */
export function useMetricExecutor() {
  const [result, setResult] = useState<MetricExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (
    definition: MetricDefinitionJSON,
    params: MetricExecutionParams
  ): Promise<MetricExecutionResult> => {
    setLoading(true);
    setError(null);

    try {
      const executionResult = await runMetric(definition, params);
      setResult(executionResult);
      return executionResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur d\'exécution');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    result,
    loading,
    error,
    execute,
    reset,
  };
}

// ============================================
// UTILITAIRES DE CACHE
// ============================================

/**
 * Vide le cache des métriques
 */
export function clearMetricCache(): void {
  metricCache.clear();
}

/**
 * Vide le cache pour une métrique spécifique
 */
export function invalidateMetricCache(metricId: string): void {
  for (const key of metricCache.keys()) {
    if (key.includes(metricId)) {
      metricCache.delete(key);
    }
  }
}
