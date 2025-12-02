import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';
import { DEFAULT_TIERS } from '../utils/royaltyCalculator';

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

/**
 * Récupère la configuration active d'une agence
 */
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
        .maybeSingle();

      if (configError) throw configError;
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

/**
 * Récupère tous les modèles de configuration disponibles
 */
export function useAllRoyaltyModels() {
  return useQuery({
    queryKey: ['royalty-models-all'],
    queryFn: async () => {
      // Get all distinct configs with their tiers
      const { data: configs, error: configError } = await supabase
        .from('agency_royalty_config')
        .select(`
          id,
          agency_id,
          model_name,
          is_active,
          valid_from,
          agency_royalty_tiers (
            id,
            from_amount,
            to_amount,
            percentage,
            tier_order
          )
        `)
        .order('model_name');

      if (configError) throw configError;

      // Group by model_name and get unique models
      const modelsMap = new Map<string, RoyaltyConfig>();
      
      for (const config of configs || []) {
        const key = config.model_name;
        if (!modelsMap.has(key)) {
          modelsMap.set(key, {
            id: config.id,
            agency_id: config.agency_id,
            model_name: config.model_name,
            is_active: config.is_active,
            valid_from: config.valid_from,
            valid_to: null,
            tiers: (config.agency_royalty_tiers || []).map((t: any) => ({
              id: t.id,
              from_amount: t.from_amount,
              to_amount: t.to_amount,
              percentage: t.percentage,
              tier_order: t.tier_order,
            })),
          });
        }
      }

      // Add default model if not exists
      const defaultModelName = 'Standard (défaut)';
      if (!modelsMap.has(defaultModelName)) {
        modelsMap.set(defaultModelName, {
          id: 'default',
          agency_id: '',
          model_name: defaultModelName,
          is_active: false,
          valid_from: '',
          valid_to: null,
          tiers: DEFAULT_TIERS.map((t, i) => ({
            id: `default-${i}`,
            from_amount: t.from_amount,
            to_amount: t.to_amount,
            percentage: t.percentage,
            tier_order: i + 1,
          })),
        });
      }

      return Array.from(modelsMap.values()).sort((a, b) => {
        // Standard first
        if (a.model_name.includes('Standard')) return -1;
        if (b.model_name.includes('Standard')) return 1;
        return a.model_name.localeCompare(b.model_name);
      });
    },
  });
}

/**
 * Sauvegarde (crée) une nouvelle configuration pour une agence
 */
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
      // Deactivate existing configs for this agency only
      await supabase
        .from('agency_royalty_config')
        .update({ is_active: false, valid_to: new Date().toISOString().split('T')[0] })
        .eq('agency_id', agencyId)
        .eq('is_active', true);

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
      queryClient.invalidateQueries({ queryKey: ['royalty-models-all'] });
      toast.success('Configuration des redevances enregistrée');
    },
    onError: (error: any) => {
      logError('ROYALTY_CONFIG', 'Erreur sauvegarde config redevances', { error });
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    },
  });
}

/**
 * Applique un modèle existant à une agence
 */
export function useApplyRoyaltyModel() {
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
      // Deactivate existing configs for this agency
      await supabase
        .from('agency_royalty_config')
        .update({ is_active: false, valid_to: new Date().toISOString().split('T')[0] })
        .eq('agency_id', agencyId)
        .eq('is_active', true);

      // Create new config with the model
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
      queryClient.invalidateQueries({ queryKey: ['royalty-models-all'] });
      toast.success(`Modèle "${variables.modelName}" appliqué à l'agence`);
    },
    onError: (error: any) => {
      logError('ROYALTY_CONFIG', 'Erreur application modèle', { error });
      toast.error(error.message || 'Erreur lors de l\'application');
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
