/**
 * useApporteurDashboard - KPIs + univers + tendances pour un apporteur
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  aggregateDailyMetrics, aggregateUniversMetrics, aggregateByMonth,
  type DailyMetricRow, type UniversDailyRow, type AggregatedKPIs, type UniversAggregated,
} from '../engine/aggregators';

interface UseApporteurDashboardOptions {
  agencyId?: string | null;
  apporteurId: string | null;
  dateFrom: string;
  dateTo: string;
  enabled?: boolean;
}

export interface ApporteurDashboardData {
  kpis: AggregatedKPIs;
  universData: UniversAggregated[];
  monthlyTrend: Array<{ month: string; dossiers: number; ca_ht: number; taux_transfo: number | null }>;
}

export function useApporteurDashboard({ agencyId, apporteurId, dateFrom, dateTo, enabled = true }: UseApporteurDashboardOptions) {
  return useQuery({
    queryKey: ['prospection-apporteur-dashboard', agencyId, apporteurId, dateFrom, dateTo],
    queryFn: async (): Promise<ApporteurDashboardData> => {
      if (!agencyId || !apporteurId) throw new Error('Missing params');

      // Load daily + univers in parallel
      const [dailyRes, universRes] = await Promise.all([
        supabase
          .from('metrics_apporteur_daily')
          .select('*')
          .eq('agence_id', agencyId)
          .eq('apporteur_id', apporteurId)
          .gte('date', dateFrom)
          .lte('date', dateTo),
        supabase
          .from('metrics_apporteur_univers_daily')
          .select('*')
          .eq('agence_id', agencyId)
          .eq('apporteur_id', apporteurId)
          .gte('date', dateFrom)
          .lte('date', dateTo),
      ]);

      if (dailyRes.error) throw dailyRes.error;
      if (universRes.error) throw universRes.error;

      const dailyRows = (dailyRes.data || []) as DailyMetricRow[];
      const universRows = (universRes.data || []) as UniversDailyRow[];

      return {
        kpis: aggregateDailyMetrics(dailyRows),
        universData: aggregateUniversMetrics(universRows),
        monthlyTrend: aggregateByMonth(dailyRows),
      };
    },
    enabled: enabled && !!agencyId && !!apporteurId,
    staleTime: 5 * 60 * 1000,
  });
}
