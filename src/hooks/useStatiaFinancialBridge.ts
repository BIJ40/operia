/**
 * useStatiaFinancialBridge — Bridges StatIA metrics into the P&L financial module
 * Auto-populates activity & CA fields from Apogee data for the selected month
 */
import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useApiToggle } from '@/apogee-connect/contexts/ApiToggleContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { getMetricsForAgency } from '@/statia/api/getMetricForAgency';
import { logError, logDebug } from '@/lib/logger';

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

/**
 * Map univers name → P&L field.
 * Any univers not matched here (including "renovation", "amelioration", "non-classe") → ca_autres
 */
const UNIVERS_FIELD_MAP: Record<string, keyof FinancialAutoValues> = {
  plomberie: 'ca_plomberie',
  electricite: 'ca_electricite',
  électricité: 'ca_electricite',
  menuiserie: 'ca_menuiserie',
  serrurerie: 'ca_serrurerie',
  vitrerie: 'ca_vitrerie',
  'volets roulants': 'ca_volets',
  volet: 'ca_volets',
  volets: 'ca_volets',
};

function mapUniversToField(universName: string): keyof FinancialAutoValues {
  const norm = universName.toLowerCase().trim();
  for (const [pattern, field] of Object.entries(UNIVERS_FIELD_MAP)) {
    if (norm.includes(pattern)) return field;
  }
  // Everything else (renovation, amelioration, non-classe, etc.) → Autres
  return 'ca_autres';
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

        const caTotal = (caResult?.value as number) ?? 0;

        const values: FinancialAutoValues = {
          ca_total: caTotal,
          nb_factures: (caResult?.breakdown as any)?.factureCount ?? 0,
          nb_interventions: (interventionsResult?.value as number) ?? 0,
          heures_facturees: Math.round(((heuresResult?.value as number) ?? 0) * 100) / 100,
          panier_moyen: (panierResult?.value as number) ?? 0,
          ca_par_heure: (caHeureResult?.value as number) ?? 0,
        };

        // ca_par_univers returns { value: Record<string, number>, breakdown: { total } }
        if (caUniversResult?.value && typeof caUniversResult.value === 'object' && !Array.isArray(caUniversResult.value)) {
          const byUnivers = caUniversResult.value as Record<string, number>;

          logDebug('[FinancialBridge] CA par univers:', byUnivers);

          for (const [universName, amount] of Object.entries(byUnivers)) {
            if (typeof amount !== 'number' || amount === 0) continue;
            const field = mapUniversToField(universName);
            values[field] = ((values[field] as number) ?? 0) + Math.round(amount * 100) / 100;
          }

          // Verify: sum of univers fields should equal ca_total
          // If there's a rounding discrepancy, adjust ca_autres
          const universFields: (keyof FinancialAutoValues)[] = [
            'ca_plomberie', 'ca_electricite', 'ca_menuiserie',
            'ca_serrurerie', 'ca_vitrerie', 'ca_volets', 'ca_autres',
          ];
          const universSum = universFields.reduce((s, f) => s + ((values[f] as number) ?? 0), 0);
          const diff = Math.round((caTotal - universSum) * 100) / 100;
          if (Math.abs(diff) > 0.01) {
            values.ca_autres = ((values.ca_autres as number) ?? 0) + diff;
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
