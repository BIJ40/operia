/**
 * useApporteurKpis — React Query hook pour get-apporteur-stats V2
 */

import { useQuery } from '@tanstack/react-query';
import { useApporteurApi } from './useApporteurApi';
import { useApporteurSession } from '../contexts/ApporteurSessionContext';
import type {
  ApporteurStatsV2Request,
  ApporteurStatsV2Response,
  TrendValue,
} from '../types/apporteur-stats-v2';

interface StatsApiResponse {
  success: boolean;
  data?: ApporteurStatsV2Response;
  error?: string;
}

interface UseApporteurKpisOptions {
  period: ApporteurStatsV2Request['period'];
  from?: string;
  to?: string;
}

export function useApporteurKpis({ period, from, to }: UseApporteurKpisOptions) {
  const { post } = useApporteurApi();
  const hasToken = !!localStorage.getItem('apporteur_session_token');

  return useQuery({
    queryKey: ['apporteur-kpis', period, from, to],
    queryFn: async (): Promise<StatsApiResponse> => {
      const body: ApporteurStatsV2Request = { period, from, to };
      const result = await post<StatsApiResponse>('/get-apporteur-stats', body);
      if (result.error) {
        return { success: false, error: result.error };
      }
      return result.data || { success: false, error: 'Réponse vide' };
    },
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,   // 5 min
    gcTime: 15 * 60 * 1000,     // 15 min
    retry: 1,
  });
}

/**
 * Formate un trend en string lisible.
 * "+8.4%" / "-9.3%" / "–" si null/0
 */
export function formatTrend(trend: TrendValue | null | undefined): string {
  if (!trend || (trend.delta === 0 && trend.pct === 0)) return '–';
  const sign = trend.pct > 0 ? '+' : '';
  return `${sign}${trend.pct.toFixed(1)}%`;
}
