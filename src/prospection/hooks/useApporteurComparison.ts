/**
 * useApporteurComparison - Compare N apporteurs sur les mêmes KPIs
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { aggregateDailyMetrics, type DailyMetricRow, type AggregatedKPIs } from '../engine/aggregators';

export interface ComparisonItem {
  apporteur_id: string;
  kpis: AggregatedKPIs;
}

interface UseApporteurComparisonOptions {
  agencyId?: string | null;
  apporteurIds: string[];
  dateFrom: string;
  dateTo: string;
  enabled?: boolean;
}

export function useApporteurComparison({ agencyId, apporteurIds, dateFrom, dateTo, enabled = true }: UseApporteurComparisonOptions) {
  return useQuery({
    queryKey: ['prospection-apporteur-comparison', agencyId, apporteurIds, dateFrom, dateTo],
    queryFn: async (): Promise<ComparisonItem[]> => {
      if (!agencyId || apporteurIds.length === 0) return [];

      const { data, error } = await supabase
        .from('metrics_apporteur_daily')
        .select('*')
        .eq('agence_id', agencyId)
        .in('apporteur_id', apporteurIds)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (error) throw error;
      if (!data) return [];

      const byApporteur = new Map<string, DailyMetricRow[]>();
      for (const row of data as DailyMetricRow[]) {
        const existing = byApporteur.get(row.apporteur_id) || [];
        existing.push(row);
        byApporteur.set(row.apporteur_id, existing);
      }

      return apporteurIds.map(id => ({
        apporteur_id: id,
        kpis: aggregateDailyMetrics(byApporteur.get(id) || []),
      }));
    },
    enabled: enabled && !!agencyId && apporteurIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
