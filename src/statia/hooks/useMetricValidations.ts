/**
 * Hook pour gérer les validations de métriques StatIA
 * Persiste les validations en base de données au lieu de localStorage
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';

export interface MetricValidation {
  metric_id: string;
  validated: boolean;
  hidden: boolean;
  suggestion?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
}

export type MetricStatus = {
  validated: boolean;
  hidden: boolean;
  suggestion?: string;
};

const QUERY_KEY = ['statia-metric-validations'];

/**
 * Charge toutes les validations depuis Supabase
 */
export function useMetricValidations() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Record<string, MetricStatus>> => {
      const { data, error } = await supabase
        .from('statia_metric_validations')
        .select('metric_id, validated, hidden, suggestion');
      
      if (error) {
        console.error('Erreur chargement validations:', error);
        return {};
      }
      
      const result: Record<string, MetricStatus> = {};
      for (const row of data || []) {
        result[row.metric_id] = {
          validated: row.validated,
          hidden: row.hidden,
          suggestion: row.suggestion || undefined,
        };
      }
      return result;
    },
    staleTime: 30 * 1000, // 30 secondes
  });
}

/**
 * Upsert une validation de métrique
 */
async function upsertValidation(
  metricId: string, 
  updates: Partial<MetricValidation>,
  userId?: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    metric_id: metricId,
    ...updates,
  };
  
  // Si on valide, ajouter validated_by et validated_at
  if (updates.validated === true && userId) {
    payload.validated_by = userId;
    payload.validated_at = new Date().toISOString();
  }
  
  // Si on dévalide, retirer validated_by et validated_at
  if (updates.validated === false) {
    payload.validated_by = null;
    payload.validated_at = null;
  }

  // Cast to proper type for upsert
  const { error } = await supabase
    .from('statia_metric_validations')
    .upsert({
      metric_id: metricId,
      validated: payload.validated as boolean | undefined,
      hidden: payload.hidden as boolean | undefined,
      suggestion: payload.suggestion as string | undefined,
      validated_by: payload.validated_by as string | undefined,
      validated_at: payload.validated_at as string | undefined,
    }, { onConflict: 'metric_id' });
  
  if (error) {
    throw new Error(`Erreur sauvegarde validation: ${error.message}`);
  }
}

/**
 * Hook pour valider une métrique
 */
export function useValidateMetric() {
  const queryClient = useQueryClient();
  const { user } = useAuthCore();
  
  return useMutation({
    mutationFn: (metricId: string) => 
      upsertValidation(metricId, { validated: true, hidden: false }, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Hook pour dévalider une métrique
 */
export function useUnvalidateMetric() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (metricId: string) => 
      upsertValidation(metricId, { validated: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Hook pour masquer une métrique
 */
export function useHideMetric() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (metricId: string) => 
      upsertValidation(metricId, { hidden: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Hook pour restaurer une métrique masquée
 */
export function useRestoreMetric() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (metricId: string) => 
      upsertValidation(metricId, { hidden: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Hook pour sauvegarder une suggestion
 */
export function useSaveSuggestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ metricId, suggestion }: { metricId: string; suggestion: string }) => 
      upsertValidation(metricId, { suggestion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Migre les validations depuis localStorage vers la base de données
 * À appeler une seule fois au montage du composant
 */
export async function migrateFromLocalStorage(userId?: string): Promise<boolean> {
  const STORAGE_KEY = 'statia-metrics-status';
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    
    const localData: Record<string, MetricStatus> = JSON.parse(stored);
    const entries = Object.entries(localData);
    
    if (entries.length === 0) return false;
    
    // Insérer chaque validation en base
    for (const [metricId, status] of entries) {
      await supabase
        .from('statia_metric_validations')
        .upsert({
          metric_id: metricId,
          validated: status.validated || false,
          hidden: status.hidden || false,
          suggestion: status.suggestion || null,
          validated_by: status.validated && userId ? userId : null,
          validated_at: status.validated ? new Date().toISOString() : null,
        }, { onConflict: 'metric_id' });
    }
    
    // Supprimer le localStorage après migration réussie
    localStorage.removeItem(STORAGE_KEY);
    console.log(`Migration réussie: ${entries.length} validations migrées`);
    
    return true;
  } catch (error) {
    console.error('Erreur migration localStorage:', error);
    return false;
  }
}
