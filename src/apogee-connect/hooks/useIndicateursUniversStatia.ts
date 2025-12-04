/**
 * Hook Indicateurs Univers migré vers StatIA
 * Utilise StatIA pour les métriques disponibles, legacy pour le reste
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { DataService } from "@/apogee-connect/services/dataService";
import { EnrichmentService } from "@/apogee-connect/services/enrichmentService";
import { calculateMonthlyUniversCA } from "@/apogee-connect/utils/universCalculations";
import {
  calculateTransfoParUnivers,
  calculateUniversApporteurMatrix,
} from "@/apogee-connect/utils/universExtendedCalculations";
import { logApogee } from "@/lib/logger";

export interface UniversStat {
  univers: string;
  caHT: number;
  nbDossiers: number;
  panierMoyen: number;
  nbInterventions: number;
  tauxSAV: number;
}

export function useIndicateursUniversStatia() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useSecondaryFilters();
  
  const agencySlug = currentAgency?.id || '';
  const dateRange = filters.dateRange;
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ["indicateurs-univers-statia", agencySlug, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      if (!agencySlug || !dateRange) {
        throw new Error('Agency ou dateRange manquant');
      }

      logApogee.debug(`[StatIA] Calcul indicateurs univers pour ${agencySlug}`);

      // Charger les données brutes pour les calculs legacy
      const rawData = await DataService.loadAllData();
      EnrichmentService.initialize(rawData);

      // === Métriques StatIA ===
      const [caParUniversResult, dossiersParUniversResult, panierMoyenResult] = await Promise.all([
        getMetricForAgency('ca_par_univers', agencySlug, { dateRange }, services),
        getMetricForAgency('dossiers_par_univers', agencySlug, { dateRange }, services),
        getMetricForAgency('panier_moyen_par_univers', agencySlug, { dateRange }, services),
      ]);

      // Construire les stats par univers depuis StatIA
      const caByUnivers = caParUniversResult.breakdown || {};
      const dossiersByUnivers = dossiersParUniversResult.breakdown || {};
      const panierByUnivers = panierMoyenResult.breakdown || {};

      // Fusionner les données StatIA en UniversStat[]
      const allUniverses = new Set([
        ...Object.keys(caByUnivers),
        ...Object.keys(dossiersByUnivers),
      ]);

      const stats: UniversStat[] = Array.from(allUniverses).map(univers => ({
        univers,
        caHT: caByUnivers[univers] || 0,
        nbDossiers: dossiersByUnivers[univers] || 0,
        panierMoyen: panierByUnivers[univers] || 0,
        nbInterventions: 0, // TODO: migrer vers StatIA
        tauxSAV: 0, // TODO: migrer vers StatIA
      }));

      // Trier par CA décroissant
      stats.sort((a, b) => b.caHT - a.caHT);

      // === Calculs legacy pour les métriques non encore migrées ===
      const monthlyCA = calculateMonthlyUniversCA(
        rawData.factures,
        rawData.projects,
        dateRange
      );

      const transfoParUnivers = calculateTransfoParUnivers(
        rawData.projects,
        rawData.devis,
        rawData.factures,
        dateRange
      );

      const matrixUniversApporteur = calculateUniversApporteurMatrix(
        rawData.projects,
        rawData.clients,
        rawData.factures,
        dateRange
      );

      return {
        stats,
        monthlyCA,
        dossiersParUnivers: dossiersByUnivers,
        transfoParUnivers,
        matrixUniversApporteur,
        universes: EnrichmentService.getAllUniverses(),
      };
    },
    enabled: isAgencyReady && !!agencySlug && !!dateRange,
    staleTime: 5 * 60 * 1000,
  });
}
