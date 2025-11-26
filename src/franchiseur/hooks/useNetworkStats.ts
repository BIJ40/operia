import { useQuery } from '@tanstack/react-query';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { useNetworkFilters } from '../contexts/NetworkFiltersContext';
import { NetworkDataService } from '../services/networkDataService';
import { supabase } from '@/integrations/supabase/client';

export function useNetworkStats() {
  const { selectedAgencies, assignedAgencies, franchiseurRole } = useFranchiseur();
  const { dateRange } = useNetworkFilters();

  return useQuery({
    queryKey: ['network-stats', selectedAgencies, dateRange],
    queryFn: async () => {
      // Get all active agencies
      const { data: allAgencies } = await supabase
        .from('apogee_agencies')
        .select('id, slug, label')
        .eq('is_active', true);

      if (!allAgencies) return null;

      // Filter agencies based on selection
      let agenciesToLoad = allAgencies;
      
      if (selectedAgencies.length > 0) {
        agenciesToLoad = allAgencies.filter(a => selectedAgencies.includes(a.id));
      } else if (franchiseurRole === 'animateur' && assignedAgencies.length > 0) {
        agenciesToLoad = allAgencies.filter(a => assignedAgencies.includes(a.id));
      }

      // Load data for all agencies
      const agencyData = await NetworkDataService.loadMultiAgencyData(
        agenciesToLoad.map(a => a.slug),
        dateRange
      );

      // Calculate aggregated statistics
      const stats = {
        totalCA: NetworkDataService.aggregateCA(agencyData),
        totalProjects: NetworkDataService.aggregateProjectCount(agencyData),
        agencyCount: agenciesToLoad.length,
        agencyData,
      };

      return stats;
    },
    enabled: !!franchiseurRole,
  });
}
