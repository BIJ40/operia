import { useQuery } from '@tanstack/react-query';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { supabase } from '@/integrations/supabase/client';
import { NetworkDataService } from '../services/networkDataService';
import {
  calculateNetworkSAVStats,
  calculateTotalInterventions,
  calculateProjectsOnPeriod,
} from '../utils/networkCalculations';
import { logNetwork } from '@/lib/logger';

interface PeriodKPIs {
  ca: number;
  projects: number;
  interventions: number;
  savRate: number;
}

interface PeriodComparisonResult {
  period1: PeriodKPIs;
  period2: PeriodKPIs;
  isLoading: boolean;
  error: Error | null;
}

interface PeriodParams {
  type: 'month' | 'year';
  year: number;
  month?: number;
}

function buildDateRange(params: PeriodParams): { start: Date; end: Date } {
  if (params.type === 'year') {
    return {
      start: new Date(params.year, 0, 1),
      end: new Date(params.year, 11, 31, 23, 59, 59),
    };
  }
  // Month
  const month = params.month ?? 0;
  const start = new Date(params.year, month, 1);
  const end = new Date(params.year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

export function usePeriodComparison(
  period1: PeriodParams,
  period2: PeriodParams
): PeriodComparisonResult {
  const { franchiseurRole } = useFranchiseur();

  const queryKey = [
    'period-comparison',
    period1.type,
    period1.year,
    period1.month,
    period2.type,
    period2.year,
    period2.month,
  ];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      logNetwork.info('Chargement comparaison de périodes...');

      // Get all active agencies
      const { data: agencies, error: agenciesError } = await supabase
        .from('apogee_agencies')
        .select('id, slug, label')
        .eq('is_active', true);

      if (agenciesError) throw agenciesError;
      if (!agencies || agencies.length === 0) {
        throw new Error('No active agencies found');
      }

      logNetwork.debug(`Chargement de ${agencies.length} agences...`);

      // Load all agencies data SEQUENTIALLY
      const agencyData = [];
      for (const agency of agencies) {
        const data = await NetworkDataService.loadAgencyData(agency.slug);
        if (data) {
          agencyData.push({
            agencyId: agency.slug,
            agencyLabel: agency.label,
            data,
          });
        }
      }

      logNetwork.info(`${agencyData.length}/${agencies.length} agences chargées`);

      // Calculate KPIs for period 1
      const range1 = buildDateRange(period1);
      const ca1 = NetworkDataService.aggregateCA(agencyData, range1);
      const projects1 = calculateProjectsOnPeriod(agencyData, range1);
      const interventions1 = calculateTotalInterventions(agencyData, range1);
      const savStats1 = calculateNetworkSAVStats(agencyData);

      // Calculate KPIs for period 2
      const range2 = buildDateRange(period2);
      const ca2 = NetworkDataService.aggregateCA(agencyData, range2);
      const projects2 = calculateProjectsOnPeriod(agencyData, range2);
      const interventions2 = calculateTotalInterventions(agencyData, range2);
      const savStats2 = calculateNetworkSAVStats(agencyData);

      return {
        period1: {
          ca: ca1,
          projects: projects1,
          interventions: interventions1,
          savRate: savStats1.tauxGlobalReseau,
        },
        period2: {
          ca: ca2,
          projects: projects2,
          interventions: interventions2,
          savRate: savStats2.tauxGlobalReseau,
        },
      };
    },
    enabled: !!franchiseurRole,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    period1: data?.period1 ?? { ca: 0, projects: 0, interventions: 0, savRate: 0 },
    period2: data?.period2 ?? { ca: 0, projects: 0, interventions: 0, savRate: 0 },
    isLoading,
    error: error as Error | null,
  };
}
