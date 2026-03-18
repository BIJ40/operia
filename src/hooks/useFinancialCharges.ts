/**
 * useFinancialCharges — Manage agency_financial_charges for a given month
 * Now supports the full P&L charge_type taxonomy (agence_*, location_*, externe_*, autre_*)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PL_SECTIONS } from '@/config/financialLineItems';

export type ChargeCategory = 'FIXE' | 'VARIABLE';

export interface FinancialCharge {
  id: string;
  agency_id: string;
  charge_type: string;
  category: ChargeCategory;
  label: string | null;
  amount: number;
  start_month: string;
  end_month: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Compute a completion score based on how many charge sections have data */
export function computeCompletionScore(charges: FinancialCharge[]): number {
  const chargeSections = PL_SECTIONS.filter(s =>
    ['charges_agence', 'locations', 'charges_externes', 'autres'].includes(s.key)
  );
  const totalItems = chargeSections.reduce((n, s) => n + s.items.filter(i => i.charge_key).length, 0);
  if (totalItems === 0) return 0;
  const filledKeys = new Set(charges.filter(c => c.amount > 0).map(c => c.charge_type));
  const filledCount = chargeSections
    .flatMap(s => s.items)
    .filter(i => i.charge_key && filledKeys.has(i.charge_key))
    .length;
  return Math.round((filledCount / totalItems) * 100);
}

function isTableNotFoundError(error: any): boolean {
  return error?.code === 'PGRST205' || error?.message?.includes('Could not find the table');
}

export function useFinancialCharges(year: number, month: number) {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();
  const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const queryKey = ['financial-charges', agencyId, year, month];

  const query = useQuery({
    queryKey,
    enabled: !!agencyId,
    retry: (failureCount, error: any) => {
      if (isTableNotFoundError(error)) return false;
      return failureCount < 3;
    },
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_financial_charges')
        .select('*')
        .eq('agency_id', agencyId)
        .lte('start_month', monthDate)
        .or(`end_month.is.null,end_month.gte.${monthDate}`)
        .order('charge_type');
      if (error) {
        if (isTableNotFoundError(error)) return [] as FinancialCharge[];
        throw error;
      }
      return (data ?? []) as FinancialCharge[];
    },
  });

  const createCharge = useMutation({
    mutationFn: async (values: { charge_type: string; category: ChargeCategory; amount: number; label?: string; notes?: string }) => {
      const { data, error } = await (supabase as any)
        .from('agency_financial_charges')
        .insert({
          agency_id: agencyId,
          start_month: monthDate,
          ...values,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FinancialCharge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', agencyId, year, month] });
    },
  });

  const updateChargeViaRpc = useMutation({
    mutationFn: async (params: { charge_id: string; new_amount: number; new_start_month: string; notes?: string }) => {
      const { data, error } = await (supabase as any).rpc('update_financial_charge', {
        p_charge_id: params.charge_id,
        p_new_amount: params.new_amount,
        p_new_start_month: params.new_start_month,
        p_notes: params.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['financial-summary', agencyId, year, month] });
    },
  });

  const completionScore = computeCompletionScore(query.data ?? []);

  /** Get the amount for a specific charge_type (charge_key) */
  function getChargeAmount(chargeKey: string): number {
    const charge = (query.data ?? []).find(c => c.charge_type === chargeKey);
    return charge?.amount ?? 0;
  }

  /** Get the charge record for a specific charge_type */
  function getCharge(chargeKey: string): FinancialCharge | undefined {
    return (query.data ?? []).find(c => c.charge_type === chargeKey);
  }

  return {
    charges: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    completionScore,
    createCharge,
    updateChargeViaRpc,
    getChargeAmount,
    getCharge,
    refetch: query.refetch,
  };
}
