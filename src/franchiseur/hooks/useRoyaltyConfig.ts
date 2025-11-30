import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

export interface RoyaltyTier {
  id: string;
  from_amount: number;
  to_amount: number | null;
  percentage: number;
  tier_order: number;
}

export interface RoyaltyConfig {
  id: string;
  agency_id: string;
  model_name: string;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
  tiers: RoyaltyTier[];
}

export function useRoyaltyConfig(agencyId: string | null) {
  return useQuery({
    queryKey: ['royalty-config', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;

      // Get active config for agency
      const { data: config, error: configError } = await supabase
        .from('agency_royalty_config')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;
      if (!config) return null;

      // Get tiers for this config
      const { data: tiers, error: tiersError } = await supabase
        .from('agency_royalty_tiers')
        .select('*')
        .eq('config_id', config.id)
        .order('tier_order');

      if (tiersError) throw tiersError;

      return {
        ...config,
        tiers: tiers || [],
      } as RoyaltyConfig;
    },
    enabled: !!agencyId,
  });
}

export function useSaveRoyaltyConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      modelName,
      tiers,
    }: {
      agencyId: string;
      modelName: string;
      tiers: Array<{ from_amount: number; to_amount: number | null; percentage: number }>;
    }) => {
      // Deactivate existing configs
      await supabase
        .from('agency_royalty_config')
        .update({ is_active: false })
        .eq('agency_id', agencyId);

      // Create new config
      const { data: config, error: configError } = await supabase
        .from('agency_royalty_config')
        .insert({
          agency_id: agencyId,
          model_name: modelName,
          is_active: true,
          valid_from: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (configError) throw configError;

      // Create tiers
      const tiersToInsert = tiers.map((tier, index) => ({
        config_id: config.id,
        from_amount: tier.from_amount,
        to_amount: tier.to_amount,
        percentage: tier.percentage,
        tier_order: index + 1,
      }));

      const { error: tiersError } = await supabase
        .from('agency_royalty_tiers')
        .insert(tiersToInsert);

      if (tiersError) throw tiersError;

      return config;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['royalty-config', variables.agencyId] });
      toast.success('Configuration des redevances enregistrée');
    },
    onError: (error: any) => {
      logError('ROYALTY_CONFIG', 'Erreur sauvegarde config redevances', { error });
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    },
  });
}

export function useRoyaltyHistory(agencyId: string | null) {
  return useQuery({
    queryKey: ['royalty-history', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];

      const { data, error } = await supabase
        .from('agency_royalty_calculations')
        .select('*')
        .eq('agency_id', agencyId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    enabled: !!agencyId,
  });
}
