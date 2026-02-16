/**
 * useApporteurListMetrics - Liste des apporteurs avec KPIs agrégés
 * Source: metrics_apporteur_daily
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { aggregateDailyMetrics, type DailyMetricRow, type AggregatedKPIs } from '../engine/aggregators';

export interface ApporteurListItem {
  apporteur_id: string;
  kpis: AggregatedKPIs;
}

interface UseApporteurListMetricsOptions {
  agencyId?: string | null;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
  enabled?: boolean;
}

export function useApporteurListMetrics({ agencyId, dateFrom, dateTo, enabled = true }: UseApporteurListMetricsOptions) {
  return useQuery({
    queryKey: ['prospection-apporteur-list', agencyId, dateFrom, dateTo],
    queryFn: async (): Promise<ApporteurListItem[]> => {
      if (!agencyId) return [];

      const { data, error } = await supabase
        .from('metrics_apporteur_daily')
        .select('*')
        .eq('agence_id', agencyId)
        .gte('date', dateFrom)
        .lte('date', dateTo);

      if (error) throw error;
      if (!data) return [];

      // Group by apporteur_id and aggregate
      const byApporteur = new Map<string, DailyMetricRow[]>();
      for (const row of data as DailyMetricRow[]) {
        const existing = byApporteur.get(row.apporteur_id) || [];
        existing.push(row);
        byApporteur.set(row.apporteur_id, existing);
      }

      return Array.from(byApporteur.entries())
        .map(([apporteur_id, rows]) => ({
          apporteur_id,
          kpis: aggregateDailyMetrics(rows),
        }))
        .sort((a, b) => b.kpis.ca_ht - a.kpis.ca_ht);
    },
    enabled: enabled && !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}
