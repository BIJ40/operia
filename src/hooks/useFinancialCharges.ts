/**
 * useFinancialCharges — Manage agency_financial_charges for a given month
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ChargeType = 'salaires' | 'charges_sociales' | 'loyer' | 'assurances' | 'telecom' | 'vehicules' | 'divers';
export type ChargeCategory = 'FIXE' | 'VARIABLE';

export interface FinancialCharge {
  id: string;
  agency_id: string;
  charge_type: ChargeType;
  category: ChargeCategory;
  label: string | null;
  amount: number;
  start_month: string;
  end_month: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CHARGE_LABELS: Record<ChargeType, string> = {
  salaires: 'Salaires',
  charges_sociales: 'Charges sociales',
  loyer: 'Loyer',
  assurances: 'Assurances',
  telecom: 'Télécom',
  vehicules: 'Véhicules',
  divers: 'Divers',
};

export const CHARGE_WEIGHTS: Record<ChargeType, number> = {
  salaires: 30,
  charges_sociales: 25,
  loyer: 20,
  vehicules: 10,
  assurances: 5,
  telecom: 5,
  divers: 5,
};

export const ONBOARDING_STEPS = [
  { label: 'Charges salariales', types: ['salaires', 'charges_sociales'] as ChargeType[] },
  { label: 'Charges fixes', types: ['loyer', 'assurances', 'telecom'] as ChargeType[] },
  { label: 'Autres charges', types: ['vehicules', 'divers'] as ChargeType[] },
];

export function computeCompletionScore(charges: FinancialCharge[]): number {
  const filledTypes = new Set(charges.filter(c => c.amount > 0).map(c => c.charge_type));
  let score = 0;
  for (const [type, weight] of Object.entries(CHARGE_WEIGHTS)) {
    if (filledTypes.has(type as ChargeType)) score += weight;
  }
  return score;
}

export function useFinancialCharges(year: number, month: number) {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();
  const monthDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const queryKey = ['financial-charges', agencyId, year, month];

  const query = useQuery({
    queryKey,
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_financial_charges')
        .select('*')
        .eq('agency_id', agencyId)
        .lte('start_month', monthDate)
        .or(`end_month.is.null,end_month.gte.${monthDate}`)
        .order('charge_type');
      if (error) throw error;
      return (data ?? []) as FinancialCharge[];
    },
  });

  const createCharge = useMutation({
    mutationFn: async (values: { charge_type: ChargeType; category: ChargeCategory; amount: number; label?: string; notes?: string }) => {
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

  return {
    charges: query.data ?? [],
    isLoading: query.isLoading,
    completionScore,
    createCharge,
    updateChargeViaRpc,
    refetch: query.refetch,
  };
}
