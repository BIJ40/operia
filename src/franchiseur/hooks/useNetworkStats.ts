import { useQuery } from '@tanstack/react-query';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { useNetworkFilters } from '../contexts/NetworkFiltersContext';
import { supabase } from '@/integrations/supabase/client';
import { NetworkDataService } from '../services/networkDataService';
import {
  calculateTop5Agencies,
  calculateBestApporteur,
  calculateTotalInterventions,
  calculateNetworkSAVStats,
  calculateAverageProcessingTime,
  calculateMonthlyCAEvolution,
  calculateCAByAgency,
  calculateMonthlySAVEvolution,
} from '../utils/networkCalculations';

interface NetworkStats {
  totalCAYear: number;
  totalCAPeriod: number;
  totalProjects: number;
  agencyCount: number;
  totalInterventions: number;
  savRateMoyenne: number;        // Simple average of agency SAV rates
  savRateGlobal: number;         // Global network SAV rate (weighted by projects)
  nbTotalSAVProjects: number;    // Total SAV projects across network
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
      console.log('🔄 Loading network data from agencies...');

      // Get all active agencies
      const { data: agencies, error: agenciesError } = await supabase
        .from('apogee_agencies')
        .select('id, slug, label')
        .eq('is_active', true);

      if (agenciesError) throw agenciesError;
      if (!agencies || agencies.length === 0) {
        throw new Error('No active agencies found');
      }

      console.log(`📊 Loading ${agencies.length} agencies...`);

      // Load all agencies data SEQUENTIALLY (to avoid BASE_URL race condition)
      const agencyData = [];
      for (const agency of agencies) {
        console.log(`🔄 Loading ${agency.slug}...`);
        const data = await NetworkDataService.loadAgencyData(agency.slug);
        if (data) {
          agencyData.push({
            agencyId: agency.slug,
            agencyLabel: agency.label,
            data,
          });
          console.log(`✅ ${agency.slug}: loaded`);
        }
      }

      console.log(`✅ Loaded ${agencyData.length}/${agencies.length} agencies`);

      // Calculate all KPIs using the same calculation functions
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

      const calcRange = dateRange 
        ? { start: dateRange.from, end: dateRange.to }
        : { start: yearStart, end: yearEnd };

      const totalCAYear = NetworkDataService.aggregateCA(agencyData, { start: yearStart, end: yearEnd });
      const totalCAPeriod = NetworkDataService.aggregateCA(agencyData, calcRange);
      const savStats = calculateNetworkSAVStats(agencyData);

      return {
        totalCAYear,
        totalCAPeriod,
        totalProjects: agencyData.reduce((sum, a) => sum + (a.data?.projects?.length || 0), 0),
        agencyCount: agencyData.length,
        totalInterventions: calculateTotalInterventions(agencyData, calcRange),
        savRateMoyenne: savStats.tauxMoyenAgences,
        savRateGlobal: savStats.tauxGlobalReseau,
        nbTotalSAVProjects: savStats.nbTotalSAVProjects,
        monthlyRoyalties: 0, // Placeholder (redevances calculées ailleurs)
        averageProcessingTime: calculateAverageProcessingTime(agencyData),
        top5Agencies: calculateTop5Agencies(agencyData),
        bestApporteur: calculateBestApporteur(agencyData),
        monthlyCAEvolution: calculateMonthlyCAEvolution(agencyData),
        caByAgency: calculateCAByAgency(agencyData),
        monthlySAVEvolution: calculateMonthlySAVEvolution(agencyData),
      };
    },
    enabled: !!franchiseurRole,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
