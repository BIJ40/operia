/**
 * Hook Diffusion Univers - Données pour la page Univers TV
 * Récupère stats par univers
 */

import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/contexts/ProfileContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { startOfMonth, endOfMonth } from "date-fns";

export interface UniversStatItem {
  univers: string;
  caHT: number;
  nbDossiers: number;
  panierMoyen: number;
  tauxSAV: number;
}

export interface DiffusionUniversData {
  stats: UniversStatItem[];
  caTotal: number;
  dossiersTotal: number;
}

export function useDiffusionUniversStatia(currentMonthIndex: number) {
  const { agence } = useAuth();
  const services = getGlobalApogeeDataServices();

  const now = new Date();
  const targetYear = now.getFullYear();
  const currentDate = new Date(targetYear, currentMonthIndex, 1);

  const dateRange = {
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  };

  return useQuery({
    queryKey: ["diffusion-univers-statia", agence, currentMonthIndex],
    enabled: !!agence,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DiffusionUniversData> => {
      if (!agence) throw new Error("Agency manquant");

      const [
        caResult,
        dossiersResult,
        panierResult,
        tauxSavResult,
      ] = await Promise.all([
        getMetricForAgency('ca_par_univers', agence, { dateRange }, services),
        getMetricForAgency('dossiers_par_univers', agence, { dateRange }, services),
        getMetricForAgency('panier_moyen_par_univers', agence, { dateRange }, services),
        getMetricForAgency('taux_sav_par_univers', agence, { dateRange }, services),
      ]);

      // Extraire données
      const caByUnivers = (caResult.value || {}) as Record<string, number>;
      const dossiersByUnivers = (dossiersResult.value || {}) as Record<string, number>;
      const panierByUnivers = (panierResult.value || {}) as Record<string, number>;
      const tauxSavByUnivers = (tauxSavResult.value || {}) as Record<string, number>;

      // Fusionner en stats
      const allUniverses = new Set([
        ...Object.keys(caByUnivers),
        ...Object.keys(dossiersByUnivers),
      ]);

      const stats: UniversStatItem[] = Array.from(allUniverses)
        .map(univers => ({
          univers,
          caHT: caByUnivers[univers] || 0,
          nbDossiers: dossiersByUnivers[univers] || 0,
          panierMoyen: panierByUnivers[univers] || 0,
          tauxSAV: tauxSavByUnivers[univers] || 0,
        }))
        .filter(s => s.caHT > 0 || s.nbDossiers > 0)
        .sort((a, b) => b.caHT - a.caHT);

      const caTotal = Object.values(caByUnivers).reduce((sum, v) => sum + v, 0);
      const dossiersTotal = Object.values(dossiersByUnivers).reduce((sum, v) => sum + v, 0);

      return {
        stats,
        caTotal,
        dossiersTotal,
      };
    },
  });
}
