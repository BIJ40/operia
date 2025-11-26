import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoyaltyCalculationService } from '../services/royaltyCalculationService';
import { useAuth } from '@/contexts/AuthContext';

export function useRoyaltyConfig(agencyId: string) {
  return useQuery({
    queryKey: ['royalty-config', agencyId],
    queryFn: () => RoyaltyCalculationService.getActiveConfig(agencyId),
    enabled: !!agencyId,
  });
}

export function useRoyaltyHistory(agencyId: string, year?: number) {
  return useQuery({
    queryKey: ['royalty-history', agencyId, year],
    queryFn: () => RoyaltyCalculationService.getCalculationHistory(agencyId, year),
    enabled: !!agencyId,
  });
}

export function useSaveRoyaltyCalculation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      configId,
      agencyId,
      year,
      month,
      caCumulAnnuel,
      tiers,
    }: {
      configId: string;
      agencyId: string;
      year: number;
      month: number;
      caCumulAnnuel: number;
      tiers: any[];
    }) => {
      const result = RoyaltyCalculationService.calculateRoyalty(caCumulAnnuel, tiers);
      return RoyaltyCalculationService.saveCalculation(
        configId,
        agencyId,
        year,
        month,
        result,
        user?.id || ''
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['royalty-history', variables.agencyId, variables.year] 
      });
    },
  });
}
