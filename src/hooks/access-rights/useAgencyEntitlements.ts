import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgencyEntitlement {
  id: string;
  agency_id: string;
  module_key: string;
  module_label: string;
  source: 'manual' | 'stripe' | 'included' | 'trial';
  access_level: 'none' | 'read' | 'full';
  is_active: boolean;
  activated_at: string;
  expires_at: string | null;
  trial_ends_at: string | null;
}

export function useAgencyEntitlements(agencyId: string | null) {
  const queryClient = useQueryClient();

  const { data: entitlements = [], isLoading, error } = useQuery({
    queryKey: ['agency-entitlements', agencyId],
    enabled: !!agencyId,
    queryFn: async (): Promise<AgencyEntitlement[]> => {
      if (!agencyId) return [];

      const { data, error } = await supabase
        .from('agency_module_entitlements')
        .select('id,agency_id,module_key,source,access_level,is_active,activated_at,expires_at,trial_ends_at')
        .eq('agency_id', agencyId);

      if (error) throw error;

      // Enrichir avec les labels depuis module_catalog
      const keys = (data ?? []).map(e => e.module_key);
      if (keys.length === 0) return [];

      const { data: catalog } = await supabase
        .from('module_catalog')
        .select('key,label')
        .in('key', keys);

      const labelMap = new Map((catalog ?? []).map(m => [m.key, m.label]));

      return (data ?? []).map(e => ({
        ...e,
        module_label: labelMap.get(e.module_key) ?? e.module_key,
        source: e.source as AgencyEntitlement['source'],
        access_level: e.access_level as 'none' | 'read' | 'full',
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['agency-entitlements', agencyId] });

  const upsertEntitlement = useMutation({
    mutationFn: async (payload: {
      agency_id: string;
      module_key: string;
      is_active: boolean;
      access_level: 'none' | 'read' | 'full';
      source: 'manual' | 'stripe' | 'included' | 'trial';
    }) => {
      const { error } = await supabase
        .from('agency_module_entitlements')
        .upsert(
          {
            agency_id: payload.agency_id,
            module_key: payload.module_key,
            is_active: payload.is_active,
            access_level: payload.access_level,
            source: payload.source,
            activated_at: new Date().toISOString(),
          },
          { onConflict: 'agency_id,module_key' }
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleEntitlement = useMutation({
    mutationFn: async ({
      agency_id,
      module_key,
      is_active,
    }: {
      agency_id: string;
      module_key: string;
      is_active: boolean;
    }) => {
      const { error } = await supabase
        .from('agency_module_entitlements')
        .upsert(
          {
            agency_id,
            module_key,
            is_active,
            source: 'manual',
            access_level: 'full',
            activated_at: new Date().toISOString(),
          },
          { onConflict: 'agency_id,module_key' }
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    entitlements,
    isLoading,
    error,
    upsertEntitlement,
    toggleEntitlement,
  };
}
