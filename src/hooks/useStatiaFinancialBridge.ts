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
  panier_moyen?: number;
  ca_par_heure?: number;
  // CA par univers
  ca_plomberie?: number;
  ca_electricite?: number;
  ca_menuiserie?: number;
  ca_serrurerie?: number;
  ca_vitrerie?: number;
  ca_volets?: number;
  ca_autres?: number;
}

/** Mapping from univers name variants → P&L field key */
const UNIVERS_FIELD_MAP: Record<string, keyof FinancialAutoValues> = {
  plomberie: 'ca_plomberie',
  électricité: 'ca_electricite',
  electricite: 'ca_electricite',
  menuiserie: 'ca_menuiserie',
  serrurerie: 'ca_serrurerie',
  vitrerie: 'ca_vitrerie',
  'volets roulants': 'ca_volets',
  volet: 'ca_volets',
  volets: 'ca_volets',
};

function mapUniversToField(universName: string): keyof FinancialAutoValues | null {
  const norm = universName.toLowerCase().trim();
  for (const [pattern, field] of Object.entries(UNIVERS_FIELD_MAP)) {
    if (norm.includes(pattern)) return field;
  }
  return null;
}

export function useStatiaFinancialBridge(year: number, month: number) {
  const { currentAgency, isAgencyReady } = useAgency();
  const { isApiEnabled } = useApiToggle();
  const agencySlug = currentAgency?.slug || '';
  const services = getGlobalApogeeDataServices();

  const dateRange = {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59),
  };

  const query = useQuery({
    queryKey: ['statia-financial-bridge', agencySlug, year, month],
    enabled: isAgencyReady && isApiEnabled && !!agencySlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FinancialAutoValues> => {
      try {
        const results = await getMetricsForAgency(
          [
            'ca_global_ht',
            'nb_interventions_periode',
            'nb_heures_productives',
            'panier_moyen',
            'ca_par_heure_global',
            'ca_par_univers',
          ],
          agencySlug,
          { dateRange },
          services
        );

        const caResult = results['ca_global_ht'];
        const interventionsResult = results['nb_interventions_periode'];
        const heuresResult = results['nb_heures_productives'];
        const panierResult = results['panier_moyen'];
        const caHeureResult = results['ca_par_heure_global'];
        const caUniversResult = results['ca_par_univers'];

        const values: FinancialAutoValues = {
          ca_total: (caResult?.value as number) ?? 0,
          nb_factures: (caResult?.breakdown as any)?.factureCount ?? 0,
          nb_interventions: (interventionsResult?.value as number) ?? 0,
          heures_facturees: Math.round(((heuresResult?.value as number) ?? 0) * 100) / 100,
          panier_moyen: (panierResult?.value as number) ?? 0,
          ca_par_heure: (caHeureResult?.value as number) ?? 0,
        };

        // Map CA par univers breakdown to individual fields
        if (caUniversResult?.breakdown && typeof caUniversResult.breakdown === 'object') {
          const breakdown = caUniversResult.breakdown as Record<string, any>;
          for (const [universName, data] of Object.entries(breakdown)) {
            const field = mapUniversToField(universName);
            if (field) {
              const amount = typeof data === 'number' ? data : (data?.ca ?? data?.value ?? 0);
              values[field] = (values[field] ?? 0) + amount;
            }
          }
          // Sum unmatched univers into ca_autres
          let matchedTotal = 0;
          for (const key of Object.keys(UNIVERS_FIELD_MAP)) {
            // skip — we sum from values directly
          }
          const knownFields: (keyof FinancialAutoValues)[] = ['ca_plomberie', 'ca_electricite', 'ca_menuiserie', 'ca_serrurerie', 'ca_vitrerie', 'ca_volets'];
          const knownSum = knownFields.reduce((s, f) => s + ((values[f] as number) ?? 0), 0);
          const totalCA = (values.ca_total ?? 0);
          if (totalCA > knownSum) {
            values.ca_autres = Math.round((totalCA - knownSum) * 100) / 100;
          }
        }

        return values;
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
