/**
 * useStatiaFinancialBridge — Bridges StatIA metrics into the P&L financial module
 * Auto-populates activity & CA fields from Apogee data for the selected month
 */
import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useApiToggle } from '@/apogee-connect/contexts/ApiToggleContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { getMetricsForAgency } from '@/statia/api/getMetricForAgency';
import { logError } from '@/lib/logger';

export interface FinancialAutoValues {
  ca_total?: number;
  nb_factures?: number;
  nb_interventions?: number;
  heures_facturees?: number;
}

export function useStatiaFinancialBridge(year: number, month: number) {
  const { currentAgency, isAgencyReady } = useAgency();
  const { isApiEnabled } = useApiToggle();
  const agencySlug = currentAgency?.slug || '';
  const services = getGlobalApogeeDataServices();

  // Build date range for the selected month
  const dateRange = {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59), // last day of month
  };

  const query = useQuery({
    queryKey: ['statia-financial-bridge', agencySlug, year, month],
    enabled: isAgencyReady && isApiEnabled && !!agencySlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FinancialAutoValues> => {
      try {
        const results = await getMetricsForAgency(
          ['ca_global_ht', 'nb_interventions_periode', 'nb_heures_productives'],
          agencySlug,
          { dateRange },
          services
        );

        const caResult = results['ca_global_ht'];
        const interventionsResult = results['nb_interventions_periode'];
        const heuresResult = results['nb_heures_productives'];

        return {
          ca_total: (caResult?.value as number) ?? 0,
          nb_factures: (caResult?.breakdown as any)?.factureCount ?? 0,
          nb_interventions: (interventionsResult?.value as number) ?? 0,
          heures_facturees: Math.round(((heuresResult?.value as number) ?? 0) * 100) / 100,
        };
      } catch (err) {
        logError('STATIA_BRIDGE', 'Failed to fetch financial metrics', err);
        return {};
      }
    },
  });

  return {
    statiaValues: query.data ?? {},
    isLoading: query.isLoading,
  };
}
