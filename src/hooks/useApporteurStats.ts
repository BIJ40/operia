/**
 * useApporteurStats - Hook pour récupérer les statistiques d'un apporteur
 * Appelle l'Edge Function get-apporteur-stats
 */

import { useQuery } from '@tanstack/react-query';
import { useApporteurApi } from '@/apporteur/hooks/useApporteurApi';

export interface ApporteurStats {
  period: { from: string; to: string };
  projects: {
    total: number;
    open: number;
    closed: number;
  };
  devis: {
    total: number;
    accepted: number;
    amount_ht: number;
    conversion_rate: number;
  };
  factures: {
    total: number;
    amount_ht: number;
    paid_ht: number;
    due_ht: number;
  };
  demands: {
    total: number;
    pending: number;
    completed: number;
  };
}

export type StatsPeriod = 'month' | 'quarter' | 'year';

interface UseApporteurStatsOptions {
  period?: StatsPeriod;
  from?: string;
  to?: string;
  enabled?: boolean;
}

interface StatsResponse {
  success: boolean;
  data?: ApporteurStats;
  error?: string;
  message?: string;
}

export function useApporteurStats(options: UseApporteurStatsOptions = {}) {
  const { period = 'month', from, to, enabled = true } = options;
  const { post } = useApporteurApi();

  return useQuery({
    queryKey: ['apporteur-stats', period, from, to],
    queryFn: async (): Promise<StatsResponse> => {
      const body: Record<string, string> = { period };
      if (from) body.from = from;
      if (to) body.to = to;

      const result = await post<StatsResponse>('/get-apporteur-stats', body);
      if (result.error) {
        return { success: false, error: result.error };
      }
      return result.data || { success: false, error: 'Réponse vide' };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Format montant en euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Format pourcentage
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}
