/**
 * useApporteurStats - Hook pour récupérer les statistiques d'un apporteur
 * Appelle l'Edge Function get-apporteur-stats
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  return useQuery({
    queryKey: ['apporteur-stats', period, from, to],
    queryFn: async (): Promise<StatsResponse> => {
      const body: Record<string, string> = { period };
      if (from) body.from = from;
      if (to) body.to = to;

      const { data, error } = await supabase.functions.invoke<StatsResponse>('get-apporteur-stats', {
        body,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data || { success: false, error: 'Réponse vide' };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format pourcentage
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}
