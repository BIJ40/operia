import { useQuery } from '@tanstack/react-query';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { useNetworkFilters } from '../contexts/NetworkFiltersContext';
import { NetworkDataService } from '../services/networkDataService';
import { startOfYear, endOfYear } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { 
  calculateTop5Agencies, 
  calculateBestApporteur, 
  calculateMonthlyRoyalties,
  calculateTotalInterventions,
  calculateSAVRate 
} from '../utils/networkCalculations';

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
      const rawAgencyData = await NetworkDataService.loadMultiAgencyData(
        agenciesToLoad.map(a => a.slug),
        dateRange
      );

      // Enrich agency data with labels
      const agencyData = rawAgencyData.map(agency => {
        const agencyInfo = agenciesToLoad.find(a => a.slug === agency.agencyId);
        return {
          ...agency,
          agencyLabel: agencyInfo?.label || agency.agencyId,
        };
      });

      // Convert date range for calculations
      const now = new Date();
      const yearRange = {
        start: startOfYear(now),
        end: endOfYear(now),
      };

      const calculationDateRange = dateRange
        ? { start: dateRange.from, end: dateRange.to }
        : yearRange;

      // Calculate aggregated statistics
      const stats = {
        totalCAYear: NetworkDataService.aggregateCA(agencyData, yearRange),
        totalCAPeriod: NetworkDataService.aggregateCA(agencyData, calculationDateRange),
        totalProjects: NetworkDataService.aggregateProjectCount(agencyData),
        agencyCount: agenciesToLoad.length,
        totalInterventions: calculateTotalInterventions(agencyData, calculationDateRange),
        savRate: calculateSAVRate(agencyData),
        monthlyRoyalties: calculateMonthlyRoyalties(agencyData),
        top5Agencies: calculateTop5Agencies(agencyData),
        bestApporteur: calculateBestApporteur(agencyData),
        agencyData,
      };

      return stats;
    },
    enabled: !!franchiseurRole,
  });
}
