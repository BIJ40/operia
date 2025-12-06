/**
 * Hooks StatIA spécifiques pour les métriques SAV
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { getGlobalApogeeDataServices } from "../adapters/dataServiceAdapter";
import { getMetricForAgency } from "../api/getMetricForAgency";
import { logError } from "@/lib/logger";

interface SAVMetrics {
  tauxSavGlobal: number;
  nbSavGlobal: number;
  nbInterventionsSav: number;
  caImpacteSav: number;
  coutSavEstime: number;
  tauxSavParUnivers: Record<string, number>;
  tauxSavParApporteur: Record<string, number>;
  tauxSavParTypeApporteur: Record<string, number>;
  detailsParUnivers: Record<string, { total: number; sav: number; taux: number }>;
  detailsParApporteur: Record<string, { total: number; sav: number; taux: number }>;
  detailsParTypeApporteur: Record<string, { total: number; sav: number; taux: number }>;
}

const DEFAULT_METRICS: SAVMetrics = {
  tauxSavGlobal: 0,
  nbSavGlobal: 0,
  nbInterventionsSav: 0,
  caImpacteSav: 0,
  coutSavEstime: 0,
  tauxSavParUnivers: {},
  tauxSavParApporteur: {},
  tauxSavParTypeApporteur: {},
  detailsParUnivers: {},
  detailsParApporteur: {},
  detailsParTypeApporteur: {},
};

export function useStatiaSAVMetrics() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useSecondaryFilters();
  const agencySlug = currentAgency?.slug || currentAgency?.id || "";
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ["statia-sav-metrics", agencySlug, filters.dateRange?.start?.toISOString(), filters.dateRange?.end?.toISOString()],
    queryFn: async (): Promise<SAVMetrics> => {
      if (!agencySlug || !filters.dateRange) return DEFAULT_METRICS;
      
      const dateRange = filters.dateRange;

      // Calculer toutes les métriques en parallèle
      const [
        tauxSavGlobalResult,
        nbSavGlobalResult,
        nbInterventionsSavResult,
        caImpacteSavResult,
        coutSavEstimeResult,
        tauxSavParUniversResult,
        tauxSavParApporteurResult,
        tauxSavParTypeApporteurResult,
      ] = await Promise.all([
        getMetricForAgency("taux_sav_global", agencySlug, { dateRange }, services).catch(e => {
          logError("StatIA SAV", "taux_sav_global failed", e);
          return { value: 0 };
        }),
        getMetricForAgency("nb_sav_global", agencySlug, { dateRange }, services).catch(e => {
          logError("StatIA SAV", "nb_sav_global failed", e);
          return { value: 0 };
        }),
        getMetricForAgency("nb_interventions_sav", agencySlug, { dateRange }, services).catch(e => {
          logError("StatIA SAV", "nb_interventions_sav failed", e);
          return { value: 0 };
        }),
        getMetricForAgency("ca_impacte_sav", agencySlug, { dateRange }, services).catch(e => {
          logError("StatIA SAV", "ca_impacte_sav failed", e);
          return { value: 0 };
        }),
        getMetricForAgency("cout_sav_estime", agencySlug, { dateRange }, services).catch(e => {
          logError("StatIA SAV", "cout_sav_estime failed", e);
          return { value: 0 };
        }),
        getMetricForAgency("taux_sav_par_univers", agencySlug, { dateRange }, services).catch(e => {
          logError("StatIA SAV", "taux_sav_par_univers failed", e);
          return { value: {}, breakdown: { details: {} } };
        }),
        getMetricForAgency("taux_sav_par_apporteur", agencySlug, { dateRange }, services).catch(e => {
          logError("StatIA SAV", "taux_sav_par_apporteur failed", e);
          return { value: {}, breakdown: { details: {} } };
        }),
        getMetricForAgency("taux_sav_par_type_apporteur", agencySlug, { dateRange }, services).catch(e => {
          logError("StatIA SAV", "taux_sav_par_type_apporteur failed", e);
          return { value: {}, breakdown: { details: {} } };
        }),
      ]);

      return {
        tauxSavGlobal: typeof tauxSavGlobalResult.value === "number" ? tauxSavGlobalResult.value : 0,
        nbSavGlobal: typeof nbSavGlobalResult.value === "number" ? nbSavGlobalResult.value : 0,
        nbInterventionsSav: typeof nbInterventionsSavResult.value === "number" ? nbInterventionsSavResult.value : 0,
        caImpacteSav: typeof caImpacteSavResult.value === "number" ? caImpacteSavResult.value : 0,
        coutSavEstime: typeof coutSavEstimeResult.value === "number" ? coutSavEstimeResult.value : 0,
        tauxSavParUnivers: typeof tauxSavParUniversResult.value === "object" ? tauxSavParUniversResult.value as Record<string, number> : {},
        tauxSavParApporteur: typeof tauxSavParApporteurResult.value === "object" ? tauxSavParApporteurResult.value as Record<string, number> : {},
        tauxSavParTypeApporteur: typeof tauxSavParTypeApporteurResult.value === "object" ? tauxSavParTypeApporteurResult.value as Record<string, number> : {},
        detailsParUnivers: (tauxSavParUniversResult.breakdown?.details || {}) as Record<string, { total: number; sav: number; taux: number }>,
        detailsParApporteur: (tauxSavParApporteurResult.breakdown?.details || {}) as Record<string, { total: number; sav: number; taux: number }>,
        detailsParTypeApporteur: (tauxSavParTypeApporteurResult.breakdown?.details || {}) as Record<string, { total: number; sav: number; taux: number }>,
      };
    },
    enabled: isAgencyReady && !!agencySlug && !!filters.dateRange,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
