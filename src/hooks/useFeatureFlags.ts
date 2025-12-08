/**
 * Hook pour gérer les Feature Flags
 * Permet d'activer/désactiver dynamiquement les modules sans modifier le code
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FeatureFlag {
  id: string;
  module_key: string;
  module_label: string;
  module_group: string;
  is_enabled: boolean;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

const QUERY_KEY = 'feature-flags';

/**
 * Hook pour charger tous les feature flags
 */
export function useFeatureFlags() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('module_group')
        .order('display_order');

      if (error) throw error;
      return (data || []) as FeatureFlag[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook pour vérifier si un module spécifique est activé
 */
export function useFeatureFlag(moduleKey: string) {
  const { data: flags, isLoading } = useFeatureFlags();
  
  const flag = flags?.find(f => f.module_key === moduleKey);
  
  return {
    isEnabled: flag?.is_enabled ?? true, // Par défaut activé si non trouvé
    isLoading,
    flag,
  };
}

/**
 * Hook pour mettre à jour un feature flag
 */
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ 
          is_enabled,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Module "${data.module_label}" ${data.is_enabled ? 'activé' : 'désactivé'}`);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

/**
 * Hook pour créer un nouveau feature flag
 */
export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at' | 'updated_by'>) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .insert({
          ...flag,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Module ajouté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

/**
 * Hook pour supprimer un feature flag
 */
export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Module supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

/**
 * Helper pour grouper les flags par groupe
 */
export function groupFlagsByGroup(flags: FeatureFlag[]): Record<string, FeatureFlag[]> {
  return flags.reduce((acc, flag) => {
    const group = flag.module_group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(flag);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);
}

/**
 * Labels pour les groupes de modules
 */
export const MODULE_GROUP_LABELS: Record<string, string> = {
  rh: 'Ressources Humaines',
  pilotage: 'Pilotage Agence',
  support: 'Support',
  academy: 'Academy',
  reseau: 'Réseau Franchiseur',
  commercial: 'Commercial',
  admin: 'Administration',
};
