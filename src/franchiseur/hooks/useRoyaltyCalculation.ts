import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';
import { useRoyaltyConfig } from './useRoyaltyConfig';
import { calculateRoyalties, DEFAULT_TIERS, RoyaltyCalculationResult } from '../utils/royaltyCalculator';

interface CalculateRoyaltyParams {
  agencyId: string;
  year: number;
  month: number;
  caCumulAnnuel: number;
}

/**
 * Hook pour calculer les redevances d'une agence
 */
export function useCalculateRoyalty(agencyId: string | null) {
  const { data: config } = useRoyaltyConfig(agencyId);
  
  /**
   * Calcule les redevances pour un CA donné
   */
  const calculate = (ca: number): RoyaltyCalculationResult => {
    const tiers = config?.tiers && config.tiers.length > 0
      ? config.tiers.map(t => ({
          from_amount: t.from_amount,
          to_amount: t.to_amount,
          percentage: t.percentage,
        }))
      : DEFAULT_TIERS;
    
    return calculateRoyalties(ca, tiers);
  };

  return {
    calculate,
    config,
    hasCustomConfig: config?.tiers && config.tiers.length > 0,
  };
}

/**
 * Hook pour sauvegarder un calcul de redevance
 */
export function useSaveRoyaltyCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      year,
      month,
      caCumulAnnuel,
      configId,
      calculation,
    }: {
      agencyId: string;
      year: number;
      month: number;
      caCumulAnnuel: number;
      configId: string;
      calculation: RoyaltyCalculationResult;
    }) => {
      // Vérifier si un calcul existe déjà pour ce mois
      const { data: existing } = await supabase
        .from('agency_royalty_calculations')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      const calculationData = {
        agency_id: agencyId,
        year,
        month,
        ca_cumul_annuel: caCumulAnnuel,
        redevance_calculee: calculation.totalRoyalty,
        config_id: configId,
        detail_tranches: calculation.details.map(d => ({
          from: d.tier.from_amount,
          to: d.tier.to_amount,
          percentage: d.tier.percentage,
          baseAmount: d.baseAmount,
          royaltyAmount: d.royaltyAmount,
        })),
      };

      if (existing) {
        // Mise à jour
        const { error } = await supabase
          .from('agency_royalty_calculations')
          .update(calculationData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insertion
        const { error } = await supabase
          .from('agency_royalty_calculations')
          .insert(calculationData);

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['royalty-history', variables.agencyId] });
      toast.success('Calcul de redevance enregistré');
    },
    onError: (error: Error) => {
      logError('ROYALTY_CALCULATION', 'Erreur sauvegarde calcul', { error });
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    },
  });
}
