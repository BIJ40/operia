/**
 * useApporteurAlerts - Détection d'alertes sur tous les apporteurs
 * Compare période courante vs précédente
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { aggregateDailyMetrics, type DailyMetricRow } from '../engine/aggregators';
import { generateAlerts, type Insight, type InsightLevel } from '../engine/insights';

interface UseApporteurAlertsOptions {
  agencyId?: string | null;
  dateFrom: string;
  dateTo: string;
  enabled?: boolean;
}

export type AlertItem = Insight & { apporteur_id: string; apporteur_name: string };

export function useApporteurAlerts({ agencyId, dateFrom, dateTo, enabled = true }: UseApporteurAlertsOptions) {
  // Calculate previous period (same length before dateFrom)
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const periodDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  const prevFrom = new Date(from.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const prevFromStr = prevFrom.toISOString().slice(0, 10);
  const prevToStr = new Date(from.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return useQuery({
    queryKey: ['prospection-apporteur-alerts', agencyId, dateFrom, dateTo],
    queryFn: async (): Promise<AlertItem[]> => {
      if (!agencyId) return [];

      // Load current + previous period in parallel
      const [currentRes, prevRes] = await Promise.all([
        supabase
          .from('metrics_apporteur_daily')
          .select('*')
          .eq('agence_id', agencyId)
          .gte('date', dateFrom)
          .lte('date', dateTo),
        supabase
          .from('metrics_apporteur_daily')
          .select('*')
          .eq('agence_id', agencyId)
          .gte('date', prevFromStr)
          .lte('date', prevToStr),
      ]);

      if (currentRes.error) throw currentRes.error;
      if (prevRes.error) throw prevRes.error;

      // Group by apporteur
      const groupBy = (rows: DailyMetricRow[]) => {
        const map = new Map<string, DailyMetricRow[]>();
        for (const r of rows) {
          const existing = map.get(r.apporteur_id) || [];
          existing.push(r);
          map.set(r.apporteur_id, existing);
        }
        return map;
      };

      const currentByApporteur = groupBy((currentRes.data || []) as DailyMetricRow[]);
      const prevByApporteur = groupBy((prevRes.data || []) as DailyMetricRow[]);

      // Build comparison input
      const allIds = new Set([...currentByApporteur.keys(), ...prevByApporteur.keys()]);
      const apporteurs = Array.from(allIds).map(id => ({
        apporteur_id: id,
        apporteur_name: id, // Will be enriched by UI with client name
        current: aggregateDailyMetrics(currentByApporteur.get(id) || []),
        previous: aggregateDailyMetrics(prevByApporteur.get(id) || []),
      }));

      return generateAlerts(apporteurs);
    },
    enabled: enabled && !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}
