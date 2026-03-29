/**
 * Hook pour gérer les templates de plans
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PlanTier {
  key: string;
  label: string;
  description: string | null;
  display_order: number;
  is_system: boolean;
  created_at: string;
}

export interface PlanTierModule {
  id: string;
  tier_key: string;
  module_key: string;
  enabled: boolean;
  options_override: Record<string, boolean> | null;
  created_at: string;
}

export interface PlanTierWithModules extends PlanTier {
  plan_tier_modules: PlanTierModule[];
}

export function usePlanTiers() {
  return useQuery({
    queryKey: ['plan-tiers'],
    queryFn: async (): Promise<PlanTierWithModules[]> => {
      const { data, error } = await (supabase
        .from('plan_tiers' as any) as any)
        .select('*, plan_tier_modules(*)')
        .order('display_order');
      
      if (error) throw error;
      return (data || []) as PlanTierWithModules[];
    },
  });
}

export function useUpdatePlanTierModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      tierKey, 
      moduleKey, 
      enabled, 
      optionsOverride 
    }: { 
      tierKey: string; 
      moduleKey: string; 
      enabled: boolean;
      optionsOverride?: Record<string, boolean>;
    }) => {
      const { data, error } = await (supabase
        .from('plan_tier_modules' as any) as any)
        .upsert({
          tier_key: tierKey,
          module_key: moduleKey,
          enabled,
          options_override: optionsOverride || null,
        }, {
          onConflict: 'tier_key,module_key',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-tiers'] });
      toast.success('Module du plan mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeletePlanTierModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tierKey, moduleKey }: { tierKey: string; moduleKey: string }) => {
      const { error } = await (supabase
        .from('plan_tier_modules' as any) as any)
        .delete()
        .eq('tier_key', tierKey)
        .eq('module_key', moduleKey);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-tiers'] });
      toast.success('Module retiré du plan');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
