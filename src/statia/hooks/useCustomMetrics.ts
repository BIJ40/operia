/**
 * StatIA - Hooks React Query pour métriques custom
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import {
  listCustomMetrics,
  getCustomMetric,
  createCustomMetric,
  updateCustomMetric,
  softDeleteCustomMetric,
  listAllAvailableMetrics,
  type CustomMetric,
  type CreateCustomMetricPayload,
  type UpdateCustomMetricPayload,
} from '../services/customMetricsService';
import { toast } from 'sonner';
import { GLOBAL_ROLES } from '@/types/globalRoles';

const QUERY_KEY = 'statia-custom-metrics';

/**
 * Hook pour lister les métriques custom
 */
export function useCustomMetrics(scope?: 'global' | 'agency', agencySlug?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', scope, agencySlug],
    queryFn: () => listCustomMetrics(scope, agencySlug),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook pour récupérer une métrique custom
 */
export function useCustomMetric(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getCustomMetric(id!),
    enabled: !!id,
  });
}

/**
 * Hook pour lister toutes les métriques disponibles (core + custom)
 */
export function useAllAvailableMetrics(agencySlug?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'all-available', agencySlug],
    queryFn: () => listAllAvailableMetrics(agencySlug),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour créer une métrique custom
 */
export function useCreateCustomMetric() {
  const queryClient = useQueryClient();
  const { user } = useAuthCore();

  return useMutation({
    mutationFn: (payload: CreateCustomMetricPayload) => {
      if (!user?.id) throw new Error('User not authenticated');
      return createCustomMetric(payload, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Métrique créée avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la création: ${error.message}`);
    },
  });
}

/**
 * Hook pour mettre à jour une métrique custom
 */
export function useUpdateCustomMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomMetricPayload }) =>
      updateCustomMetric(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Métrique mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    },
  });
}

/**
 * Hook pour supprimer une métrique custom
 */
export function useDeleteCustomMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => softDeleteCustomMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Métrique supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });
}

/**
 * Hook pour contexte StatIA Builder (admin vs agence)
 */
export function useStatiaBuilderContext() {
  const { user } = useAuthCore();
  const { agence } = useProfile();
  const { globalRole } = usePermissions();
  
  const globalRoleLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
  const isAdmin = globalRoleLevel >= 5; // N5+
  const canCreateGlobal = globalRoleLevel >= 5;
  const canCreateAgency = globalRoleLevel >= 2;
  
  return {
    isAdmin,
    canCreateGlobal,
    canCreateAgency,
    userAgencySlug: agence,
    userId: user?.id,
    globalRoleLevel,
  };
}
