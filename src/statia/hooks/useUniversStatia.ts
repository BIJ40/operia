/**
 * Hook StatIA pour la page Indicateurs Univers
 * Centralise toutes les métriques univers
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { startOfYear, endOfYear } from "date-fns";

export interface UniversStatItem {
  univers: string;
  caHT: number;
  nbDossiers: number;
  panierMoyen: number;
  nbInterventions: number;
  tauxSAV: number;
}

export function useUniversStatia() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useSecondaryFilters();
  
  const agencySlug = currentAgency?.id || '';
  const dateRange = filters.dateRange;
  const services = getGlobalApogeeDataServices();

  // Plage annuelle pour le graphique d'évolution (indépendante du sélecteur)
  const now = new Date();
  const yearlyDateRange = {
    start: startOfYear(now),
    end: endOfYear(now),
  };

  return useQuery({
    queryKey: ["univers-statia", agencySlug, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      if (!agencySlug || !dateRange) {
        throw new Error('Agency ou dateRange manquant');
      }

      // Récupérer toutes les métriques en parallèle
      // Note: ca_mensuel_par_univers utilise yearlyDateRange (graphique d'évolution décorrélé)
      const [
        caResult,
        dossiersResult,
        panierResult,
        interventionsResult,
        tauxSavResult,
        caMensuelResult,
        transfoResult,
        matrixResult
      ] = await Promise.all([
        getMetricForAgency('ca_par_univers', agencySlug, { dateRange }, services),
        getMetricForAgency('dossiers_par_univers', agencySlug, { dateRange }, services),
        getMetricForAgency('panier_moyen_par_univers', agencySlug, { dateRange }, services),
        getMetricForAgency('interventions_par_univers', agencySlug, { dateRange }, services),
        getMetricForAgency('taux_sav_par_univers', agencySlug, { dateRange }, services),
        // Graphique évolution = année complète, pas la période sélectionnée
        getMetricForAgency('ca_mensuel_par_univers', agencySlug, { dateRange: yearlyDateRange }, services),
        getMetricForAgency('taux_transfo_par_univers', agencySlug, { dateRange }, services),
        getMetricForAgency('matrix_univers_apporteur', agencySlug, { dateRange }, services),
      ]);

      // Extraire les données
      const caByUnivers = caResult.value as Record<string, number> || {};
      const dossiersByUnivers = dossiersResult.value as Record<string, number> || {};
      const panierByUnivers = panierResult.value as Record<string, number> || {};
      const interventionsByUnivers = interventionsResult.value as Record<string, number> || {};
      const tauxSavByUnivers = tauxSavResult.value as Record<string, number> || {};

      // Fusionner en stats par univers
      const allUniverses = new Set([
        ...Object.keys(caByUnivers),
        ...Object.keys(dossiersByUnivers),
      ]);

      const stats: UniversStatItem[] = Array.from(allUniverses).map(univers => ({
        univers,
        caHT: caByUnivers[univers] || 0,
        nbDossiers: dossiersByUnivers[univers] || 0,
        panierMoyen: panierByUnivers[univers] || 0,
        nbInterventions: interventionsByUnivers[univers] || 0,
        tauxSAV: tauxSavByUnivers[univers] || 0,
      }));

      // Trier par CA décroissant
      stats.sort((a, b) => b.caHT - a.caHT);

      // CA Mensuel (pour graphique empilé) - année complète
      const monthlyCA = caMensuelResult.value as Array<{ month: string; [key: string]: number | string }> || [];

      // Transformation (pour graphique)
      const transfoParUnivers = transfoResult.value as Record<string, { caDevis: number; caFactures: number; tauxTransfo: number }> || {};

      // Matrice Univers × Apporteur
      const matrixUniversApporteur = matrixResult.value as Record<string, Record<string, { ca: number; nbDossiers: number }>> || {};

      // CA Total
      const caTotal = Object.values(caByUnivers).reduce((sum, v) => sum + v, 0);
      const dossiersTotal = Object.values(dossiersByUnivers).reduce((sum, v) => sum + v, 0);

      return {
        stats,
        monthlyCA,
        dossiersParUnivers: dossiersByUnivers,
        transfoParUnivers,
        matrixUniversApporteur,
        // KPIs globaux
        caTotal,
        dossiersTotal,
        panierMoyenGlobal: dossiersTotal > 0 ? caTotal / dossiersTotal : 0,
      };
    },
    enabled: isAgencyReady && !!agencySlug && !!dateRange,
    staleTime: 5 * 60 * 1000,
  });
}
