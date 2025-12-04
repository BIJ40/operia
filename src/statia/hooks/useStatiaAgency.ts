/**
 * StatIA Phase 2 - Hook intégré pour contexte Agence
 * Utilise automatiquement l'adaptateur DataService
 */

import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { getGlobalApogeeDataServices } from '../adapters/dataServiceAdapter';
import { getMetricForAgency, getAgencyDashboard } from '../api/getMetricForAgency';
import { StatResult, DateRange } from '../definitions/types';
import { logApogee } from '@/lib/logger';

/**
 * Hook pour récupérer une métrique StatIA dans le contexte agence
 * Utilise automatiquement l'agence courante et les filtres de période
 */
export function useStatiaAgencyMetric(
  statId: string,
  options?: { 
    enabled?: boolean; 
    customDateRange?: DateRange;
    staleTime?: number;
  }
) {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useFilters();
  
  const agencySlug = currentAgency?.id || '';
  const dateRange = options?.customDateRange || filters.dateRange;
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ['statia-agency', statId, agencySlug, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async (): Promise<StatResult> => {
      if (!agencySlug || !dateRange) {
        throw new Error('Agency slug ou dateRange manquant');
      }
      
      logApogee.debug(`[StatIA] Calcul métrique ${statId} pour ${agencySlug}`);
      return getMetricForAgency(statId, agencySlug, { dateRange }, services);
    },
    enabled: isAgencyReady && !!agencySlug && !!dateRange && options?.enabled !== false,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
  });
}

/**
 * Hook pour récupérer plusieurs métriques StatIA
 */
export function useStatiaAgencyMetrics(
  statIds: string[],
  options?: { enabled?: boolean; customDateRange?: DateRange }
) {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useFilters();
  
  const agencySlug = currentAgency?.id || '';
  const dateRange = options?.customDateRange || filters.dateRange;
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ['statia-agency-multi', statIds.join(','), agencySlug, dateRange?.start?.toISOString()],
    queryFn: async (): Promise<Record<string, StatResult>> => {
      if (!agencySlug || !dateRange) {
        throw new Error('Agency slug ou dateRange manquant');
      }
      
      logApogee.debug(`[StatIA] Calcul métriques [${statIds.join(', ')}] pour ${agencySlug}`);
      
      const results: Record<string, StatResult> = {};
      await Promise.all(
        statIds.map(async (id) => {
          results[id] = await getMetricForAgency(id, agencySlug, { dateRange }, services);
        })
      );
      return results;
    },
    enabled: isAgencyReady && !!agencySlug && !!dateRange && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour récupérer le dashboard complet via StatIA
 */
export function useStatiaDashboard(options?: { enabled?: boolean; customDateRange?: DateRange }) {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useFilters();
  
  const agencySlug = currentAgency?.id || '';
  const dateRange = options?.customDateRange || filters.dateRange;
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ['statia-dashboard', agencySlug, dateRange?.start?.toISOString()],
    queryFn: async () => {
      if (!agencySlug || !dateRange) {
        throw new Error('Agency slug ou dateRange manquant');
      }
      
      logApogee.debug(`[StatIA] Calcul dashboard complet pour ${agencySlug}`);
      return getAgencyDashboard(agencySlug, { dateRange }, services);
    },
    enabled: isAgencyReady && !!agencySlug && !!dateRange && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook utilitaire pour CA global
 */
export function useStatiaCA(options?: { enabled?: boolean }) {
  return useStatiaAgencyMetric('ca_global_ht', options);
}

/**
 * Hook utilitaire pour CA par univers
 */
export function useStatiaCAParUnivers(options?: { enabled?: boolean }) {
  return useStatiaAgencyMetric('ca_par_univers', options);
}

/**
 * Hook utilitaire pour taux SAV
 */
export function useStatiaTauxSAV(options?: { enabled?: boolean }) {
  return useStatiaAgencyMetric('taux_sav_global', options);
}

/**
 * Hook utilitaire pour taux transformation devis
 */
export function useStatiaTauxTransformation(options?: { enabled?: boolean }) {
  return useStatiaAgencyMetric('taux_transformation_devis_nombre', options);
}

/**
 * Hook utilitaire pour taux recouvrement
 */
export function useStatiaTauxRecouvrement(options?: { enabled?: boolean }) {
  return useStatiaAgencyMetric('taux_recouvrement_global', options);
}
