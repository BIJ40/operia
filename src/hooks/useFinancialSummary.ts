/**
 * useFinancialSummary — Read from agency_financial_summary view (expanded P&L)
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
  // Activité
  nb_interventions: number;
  nb_factures: number;
  nb_salaries: number;
  heures_facturees: number;
  nb_heures_payees_productifs: number;
  nb_heures_payees_improductifs: number;
  // CA
  ca_total: number;
  achats: number;
  sous_traitance: number;
  // Masse salariale productifs
  salaires_brut_intervenants: number;
  charges_patronales_intervenants: number;
  frais_personnel_intervenants: number;
  aides_emploi: number;
  masse_salariale_productifs: number;
  // Marges
  marge_sur_achats: number;
  taux_marge_achats: number;
  marge_brute: number;
  taux_marge_brute: number;
  // Improductifs
  salaires_brut_improductifs: number;
  charges_patronales_improductifs: number;
  frais_personnel_improductifs: number;
  salaires_brut_franchise: number;
  charges_patronales_franchise: number;
  frais_franchise: number;
  total_improductifs: number;
  // Charges par section
  charges_agence: number;
  charges_location: number;
  charges_externes: number;
  charges_autres: number;
  // Totaux
  total_charges_hors_ms_productifs: number;
  total_charges: number;
  resultat_avant_is: number;
  // Legacy
  ca_net: number;
  charges_fixes: number;
  charges_variables: number;
  marge_contributive: number;
  resultat_exploitation: number;
}

function isTableNotFoundError(error: any): boolean {
  return error?.code === 'PGRST205' || error?.message?.includes('Could not find the table');
}

export function useFinancialSummary(year: number, month: number) {
  const { agencyId } = useAuth();

  const query = useQuery({
    queryKey: ['financial-summary', agencyId, year, month],
    enabled: !!agencyId && year > 0 && month >= 1 && month <= 12,
    retry: (failureCount, error: any) => {
      if (isTableNotFoundError(error)) return false;
      return failureCount < 3;
    },
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_financial_summary')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) {
        if (isTableNotFoundError(error)) return null;
        throw error;
      }
      return data as FinancialSummary | null;
    },
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
