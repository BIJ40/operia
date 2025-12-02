/**
 * STATiA-BY-BIJ - Hook universel de consommation de métriques
 * 
 * Usage:
 * const { value, loading, error, breakdown, metadata } = useMetric('ca_mensuel', {
 *   agency_slug: 'lyon',
 *   date_from: new Date('2025-01-01'),
 *   date_to: new Date('2025-01-31'),
 * });
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  MetricDefinition, 
  MetricParams, 
  MetricResult, 
  MetricError 
} from '../types';
import { 
  computeMetric, 
  determineExecutionTarget, 
  evaluateComplexity 
} from '../engine/computeEngine';
import { logError } from '@/lib/logger';

// ============================================
// TYPES DU HOOK
// ============================================

export interface UseMetricOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}

export interface UseMetricReturn<T = number> {
  value: T | null;
  loading: boolean;
  error: MetricError | null;
  breakdown?: Record<string, T>;
  metadata?: MetricResult['metadata'];
  refetch: () => void;
  debug: {
    metricId: string;
    executionTarget: 'frontend' | 'edge' | 'unknown';
    complexity: number;
    params: MetricParams;
  };
}

// ============================================
// CHARGEMENT DE LA DÉFINITION
// ============================================

async function loadMetricDefinition(metricId: string): Promise<MetricDefinition | null> {
  const { data, error } = await supabase
    .from('metrics_definitions')
    .select('*')
    .eq('id', metricId)
    .eq('validation_status', 'validated')
    .maybeSingle();

  if (error) {
    logError(`Erreur chargement métrique ${metricId}:`, error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Transformer les champs JSONB
  return {
    id: data.id,
    label: data.label,
    description_agence: data.description_agence ?? undefined,
    description_franchiseur: data.description_franchiseur ?? undefined,
    scope: data.scope as MetricDefinition['scope'],
    input_sources: data.input_sources as unknown as MetricDefinition['input_sources'],
    formula: data.formula as unknown as MetricDefinition['formula'],
    compute_hint: (data.compute_hint ?? 'auto') as MetricDefinition['compute_hint'],
    validation_status: data.validation_status as MetricDefinition['validation_status'],
    visibility: data.visibility as unknown as MetricDefinition['visibility'],
    cache_ttl_seconds: data.cache_ttl_seconds ?? 300,
    created_at: data.created_at ?? undefined,
    updated_at: data.updated_at ?? undefined,
    created_by: data.created_by ?? undefined,
  };
}

// ============================================
// VÉRIFICATION DU CACHE
// ============================================

async function checkCache(
  metricId: string, 
  params: MetricParams
): Promise<MetricResult | null> {
  const cacheKey = generateCacheKey(metricId, params);
  
  const { data, error } = await supabase
    .from('metrics_cache')
    .select('result, expires_at')
    .eq('metric_id', metricId)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const result = data.result as unknown as MetricResult;
  return {
    ...result,
    metadata: {
      ...result.metadata!,
      cache_hit: true,
    },
  };
}

function generateCacheKey(metricId: string, params: MetricParams): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      if (value instanceof Date) {
        acc[key] = value.toISOString();
      } else if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
  
  return JSON.stringify(sortedParams);
}

// ============================================
// EXÉCUTION DU CALCUL
// ============================================

async function executeMetric(
  metric: MetricDefinition,
  params: MetricParams
): Promise<MetricResult> {
  const executionTarget = determineExecutionTarget(metric, params);
  
  if (executionTarget === 'edge') {
    // Appeler l'edge function pour les calculs lourds
    const { data, error } = await supabase.functions.invoke('compute-metric', {
      body: {
        metric_id: metric.id,
        params: {
          ...params,
          date_from: params.date_from?.toISOString(),
          date_to: params.date_to?.toISOString(),
        },
      },
    });

    if (error) {
      throw new Error(`Erreur edge function: ${error.message}`);
    }

    return data as MetricResult;
  }

  // Exécution frontend
  return computeMetric(metric, params);
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useMetric<T = number>(
  metricId: string,
  params: MetricParams,
  options: UseMetricOptions = {}
): UseMetricReturn<T> {
  const { 
    enabled = true, 
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchInterval = false,
  } = options;

  const queryClient = useQueryClient();

  const queryKey = ['statia-metric', metricId, params];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<MetricResult<T> & { _debug?: { executionTarget: string; complexity: number } }> => {
      // 1. Charger la définition de la métrique
      const metric = await loadMetricDefinition(metricId);
      if (!metric) {
        throw {
          code: 'NOT_FOUND',
          message: `Métrique "${metricId}" non trouvée ou non validée`,
        } as MetricError;
      }

      // 2. Vérifier le cache
      const cached = await checkCache(metricId, params);
      if (cached) {
        return cached as MetricResult<T>;
      }

      // 3. Calculer la complexité et la cible d'exécution
      const complexity = evaluateComplexity(metric, params);
      const executionTarget = determineExecutionTarget(metric, params);

      // 4. Exécuter le calcul
      const result = await executeMetric(metric, params);
      return {
        ...result,
        _debug: {
          executionTarget,
          complexity: complexity.score,
        },
      } as MetricResult<T> & { _debug?: { executionTarget: string; complexity: number } };
    },
    enabled: enabled && !!metricId,
    staleTime,
    refetchInterval,
    retry: 1,
  });

  // Debug info avec valeurs réelles du calcul
  const debugInfo = {
    metricId,
    executionTarget: (query.data as any)?._debug?.executionTarget ?? 'unknown',
    complexity: (query.data as any)?._debug?.complexity ?? 0,
    params,
    _loadDebug: query.data?._loadDebug,
  };

  // Transformer l'erreur en MetricError
  let metricError: MetricError | null = null;
  if (query.error) {
    const err = query.error as any;
    if (err.code && ['NOT_FOUND', 'VALIDATION_ERROR', 'COMPUTE_ERROR', 'PERMISSION_DENIED', 'DATA_UNAVAILABLE'].includes(err.code)) {
      metricError = err as MetricError;
    } else {
      metricError = {
        code: 'COMPUTE_ERROR',
        message: err.message || 'Erreur inconnue',
        details: query.error,
      };
    }
  }

  return {
    value: query.data?.value ?? null,
    loading: query.isLoading,
    error: metricError,
    breakdown: query.data?.breakdown as Record<string, T> | undefined,
    metadata: query.data?.metadata,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    debug: debugInfo,
  };
}

// ============================================
// HOOKS UTILITAIRES
// ============================================

/**
 * Hook pour récupérer toutes les métriques disponibles
 */
export function useAvailableMetrics(scope?: MetricDefinition['scope']) {
  return useQuery({
    queryKey: ['statia-metrics-list', scope],
    queryFn: async () => {
      let query = supabase
        .from('metrics_definitions')
        .select('id, label, description_agence, scope, validation_status')
        .eq('validation_status', 'validated');

      if (scope) {
        query = query.eq('scope', scope);
      }

      const { data, error } = await query.order('label');

      if (error) {
        throw error;
      }

      return data;
    },
  });
}

/**
 * Hook pour récupérer une définition de métrique complète (admin)
 */
export function useMetricDefinition(metricId: string) {
  return useQuery({
    queryKey: ['statia-metric-definition', metricId],
    queryFn: () => loadMetricDefinition(metricId),
    enabled: !!metricId,
  });
}
