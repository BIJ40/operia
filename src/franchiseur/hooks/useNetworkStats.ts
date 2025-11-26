import { useQuery } from '@tanstack/react-query';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { useNetworkFilters } from '../contexts/NetworkFiltersContext';
import { supabase } from '@/integrations/supabase/client';

interface NetworkStats {
  totalCAYear: number;
  totalCAPeriod: number;
  totalProjects: number;
  agencyCount: number;
  totalInterventions: number;
  savRate: number;
  monthlyRoyalties: number;
  averageProcessingTime: number;
  top5Agencies: Array<{ agencyId: string; agencyLabel: string; ca: number; rank: number }>;
  bestApporteur: { name: string; ca: number; nbDossiers: number } | null;
  monthlyCAEvolution: Array<{ month: string; ca: number; nbFactures: number }>;
  caByAgency: Array<{ agencyLabel: string; ca: number }>;
  monthlySAVEvolution: Array<{ month: string; tauxSAV: number }>;
}

export function useNetworkStats() {
  const { franchiseurRole } = useFranchiseur();
  const { dateRange } = useNetworkFilters();

  return useQuery<NetworkStats>({
    queryKey: ['network-stats', dateRange],
    queryFn: async () => {
      console.log('🔄 Calling network-kpis edge function...');

      // Call the edge function that handles all data loading and aggregation
      const { data, error } = await supabase.functions.invoke('network-kpis', {
        body: {
          dateRange: dateRange ? {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString(),
          } : null,
        },
      });

      if (error) {
        console.error('❌ Error calling network-kpis:', error);
        throw error;
      }

      console.log('✅ Received KPIs from edge function');
      return data as NetworkStats;
    },
    enabled: !!franchiseurRole,
    staleTime: 5 * 60 * 1000, // 5 minutes - match edge function cache
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
  });
}
