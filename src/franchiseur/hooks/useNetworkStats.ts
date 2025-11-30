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
  calculateOneShotRate,
  calculateProjectToQuoteDelay,
  calculateVisitsPerProject,
  calculateMultiUniversRate,
  calculateProjectsOnPeriod,
} from '../utils/networkCalculations';
import { logNetwork } from '@/lib/logger';

interface NetworkStats {
  totalCAYear: number;
  totalCAPeriod: number;
  totalProjects: number;
  totalProjectsPeriod: number;   // Projects filtered by selected period
  agencyCount: number;
  totalInterventions: number;
  savRateMoyenne: number;        // Simple average of agency SAV rates
  savRateGlobal: number;         // Global network SAV rate (weighted by projects)
  nbTotalSAVProjects: number;    // Total SAV projects across network
  monthlyRoyalties: number;
  averageProcessingTime: number;
  oneShotRate: number;           // % projects resolved in single intervention
  projectToQuoteDelay: number;   // Average days from project to first quote
  visitsPerProject: number;      // Average visits/appointments per project
  multiUniversRate: number;      // % projects with multiple universes
  top5Agencies: Array<{ agencyId: string; agencyLabel: string; ca: number; rank: number }>;
  bestApporteur: { name: string; ca: number; nbDossiers: number } | null;
  monthlyCAEvolution: Array<{ month: string; ca: number; nbFactures: number }>;
  caByAgency: Array<{ agencyLabel: string; ca: number }>;
  monthlySAVEvolution: Array<{ month: string; tauxSAV: number }>;
}

export function useNetworkStats() {
  const { franchiseurRole, selectedAgencies } = useFranchiseur();
  const { dateRange } = useNetworkFilters();

  return useQuery<NetworkStats>({
    queryKey: ['network-stats', dateRange, selectedAgencies],
    queryFn: async (): Promise<NetworkStats> => {
      logNetwork.info('Chargement des données réseau...');

      // Default stats to return in case of error
      const DEFAULT_STATS: NetworkStats = {
        totalCAYear: 0,
        totalCAPeriod: 0,
        totalProjects: 0,
        totalProjectsPeriod: 0,
        agencyCount: 0,
        totalInterventions: 0,
        savRateMoyenne: 0,
        savRateGlobal: 0,
        nbTotalSAVProjects: 0,
        monthlyRoyalties: 0,
        averageProcessingTime: 0,
        oneShotRate: 0,
        projectToQuoteDelay: 0,
        visitsPerProject: 0,
        multiUniversRate: 0,
        top5Agencies: [],
        bestApporteur: null,
        monthlyCAEvolution: [],
        caByAgency: [],
        monthlySAVEvolution: [],
      };

      try {
        // Get all active agencies
        const { data: agencies, error: agenciesError } = await supabase
          .from('apogee_agencies')
          .select('id, slug, label')
          .eq('is_active', true);

        if (agenciesError) {
          logNetwork.error('Erreur chargement agences', agenciesError);
          return DEFAULT_STATS;
        }
        if (!agencies || agencies.length === 0) {
          logNetwork.warn('Aucune agence active trouvée');
          return DEFAULT_STATS;
        }

        // Filter agencies based on selection
        const filteredAgencies = selectedAgencies.length > 0
          ? agencies.filter(a => selectedAgencies.includes(a.id))
          : agencies;

        logNetwork.debug(`Chargement de ${filteredAgencies.length} agences (${selectedAgencies.length > 0 ? 'filtré' : 'toutes'})...`);

      // Load all agencies data SEQUENTIALLY (to avoid BASE_URL race condition)
      const agencyData = [];
      for (const agency of filteredAgencies) {
        logNetwork.debug(`Chargement ${agency.slug}...`);
        const data = await NetworkDataService.loadAgencyData(agency.slug);
        if (data) {
          agencyData.push({
            agencyId: agency.slug,
            agencyLabel: agency.label,
            data,
          });
          logNetwork.debug(`${agency.slug}: chargé`);
        }
      }

      logNetwork.info(`${agencyData.length}/${filteredAgencies.length} agences chargées`);

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
          totalProjectsPeriod: calculateProjectsOnPeriod(agencyData, calcRange),
          agencyCount: agencyData.length,
          totalInterventions: calculateTotalInterventions(agencyData, calcRange),
          savRateMoyenne: savStats.tauxMoyenAgences,
          savRateGlobal: savStats.tauxGlobalReseau,
          nbTotalSAVProjects: savStats.nbTotalSAVProjects,
          monthlyRoyalties: 0, // Placeholder (redevances calculées ailleurs)
          averageProcessingTime: calculateAverageProcessingTime(agencyData),
          oneShotRate: calculateOneShotRate(agencyData),
          projectToQuoteDelay: calculateProjectToQuoteDelay(agencyData),
          visitsPerProject: calculateVisitsPerProject(agencyData),
          multiUniversRate: calculateMultiUniversRate(agencyData),
          top5Agencies: calculateTop5Agencies(agencyData),
          bestApporteur: calculateBestApporteur(agencyData),
          monthlyCAEvolution: calculateMonthlyCAEvolution(agencyData),
          caByAgency: calculateCAByAgency(agencyData),
          monthlySAVEvolution: calculateMonthlySAVEvolution(agencyData),
        };
      } catch (error) {
        logNetwork.error('Erreur chargement données réseau', error);
        return DEFAULT_STATS;
      }
    },
    enabled: !!franchiseurRole,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
