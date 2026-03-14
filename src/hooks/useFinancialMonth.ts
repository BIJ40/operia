/**
 * useFinancialMonth — Query/upsert agency_financial_months for a given month
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FinancialMonth {
  id: string;
  agency_id: string;
  year: number;
  month: number;
  nb_interventions: number;
  nb_factures: number;
  heures_facturees: number;
  ca_total: number;
  achats: number;
  sous_traitance: number;
  synced_at: string | null;
  sync_version: number;
  locked_at: string | null;
  locked_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useFinancialMonth(year: number, month: number) {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['financial-month', agencyId, year, month];

  const query = useQuery({
    queryKey,
    enabled: !!agencyId && year > 0 && month >= 1 && month <= 12,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_financial_months')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as FinancialMonth | null;
    },
  });

  const upsertMonth = useMutation({
    mutationFn: async (values: Partial<Omit<FinancialMonth, 'id' | 'agency_id' | 'year' | 'month' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await (supabase as any)
        .from('agency_financial_months')
        .upsert({
          agency_id: agencyId,
          year,
          month,
          ...values,
        }, { onConflict: 'agency_id,year,month' })
        .select()
        .single();
      if (error) throw error;
      return data as FinancialMonth;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', agencyId, year, month] });
    },
  });

  return {
    financialMonth: query.data ?? null,
    isLoading: query.isLoading,
    isLocked: !!query.data?.locked_at,
    upsertMonth,
    refetch: query.refetch,
  };
}
