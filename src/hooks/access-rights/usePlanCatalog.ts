import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlanEntry {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
}

export interface PlanModuleGrant {
  plan_id: string;
  module_key: string;
  access_level: 'none' | 'read' | 'full';
}

export interface PlanWithGrants extends PlanEntry {
  grants: PlanModuleGrant[];
}

export function usePlanCatalog() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['plan_catalog_v2'],
    queryFn: async (): Promise<PlanWithGrants[]> => {
      const { data: plans, error: plansError } = await supabase
        .from('plan_catalog')
        .select('id,key,label,description,color,sort_order,is_active,is_system')
        .order('sort_order');

      if (plansError) throw plansError;

      const { data: grants, error: grantsError } = await supabase
        .from('plan_module_grants')
        .select('plan_id,module_key,access_level');

      if (grantsError) throw grantsError;

      return (plans ?? []).map(plan => ({
        ...plan,
        grants: (grants ?? [])
          .filter(g => g.plan_id === plan.id)
          .map(g => ({
            ...g,
            access_level: g.access_level as 'none' | 'read' | 'full',
          })),
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['plan_catalog_v2'] });

  const updatePlanModuleGrant = useMutation({
    mutationFn: async ({
      plan_id,
      module_key,
      access_level,
    }: {
      plan_id: string;
      module_key: string;
      access_level: 'none' | 'read' | 'full';
    }) => {
      const { error } = await supabase
        .from('plan_module_grants')
        .upsert({ plan_id, module_key, access_level }, { onConflict: 'plan_id,module_key' });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const togglePlanActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('plan_catalog')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    plans: data ?? [],
    isLoading,
    error,
    updatePlanModuleGrant,
    togglePlanActive,
  };
}
