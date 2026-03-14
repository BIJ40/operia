/**
 * useFinancialSummary — Read from agency_financial_summary view
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FinancialSummary {
  id: string;
  agency_id: string;
  year: number;
  month: number;
  month_date: string;
  locked_at: string | null;
  synced_at: string | null;
  sync_version: number;
  nb_interventions: number;
  nb_factures: number;
  heures_facturees: number;
  ca_total: number;
  achats: number;
  sous_traitance: number;
  ca_net: number;
  marge_brute: number;
  charges_variables: number;
  marge_contributive: number;
  charges_fixes: number;
  resultat_exploitation: number;
}

export function useFinancialSummary(year: number, month: number) {
  const { agencyId } = useAuth();

  const query = useQuery({
    queryKey: ['financial-summary', agencyId, year, month],
    enabled: !!agencyId && year > 0 && month >= 1 && month <= 12,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_financial_summary')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as FinancialSummary | null;
    },
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
