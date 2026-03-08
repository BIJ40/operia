/**
 * Hook Diffusion Apporteurs - Données pour la page Apporteurs TV
 * Récupère stats par type d'apporteur + évolution mensuelle
 */

import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/contexts/ProfileContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { startOfMonth, endOfMonth, startOfYear, format } from "date-fns";
import { fr } from "date-fns/locale";

export interface TypeApporteurStats {
  type: string;
  caHT: number;
  nbDossiers: number;
  panierMoyen: number;
  tauxTransfo: number;
  tauxSav: number;
}

export interface MonthlyEvolutionItem {
  month: string;
  [key: string]: number | string;
}

export interface DiffusionApporteursData {
  typeStats: TypeApporteurStats[];
  monthlyEvolution: MonthlyEvolutionItem[];
  segmentationPct: { apporteurs: number; particuliers: number };
  caApporteurs: number;
  caParticuliers: number;
}

export function useDiffusionApporteursStatia(currentMonthIndex: number) {
  const { agence } = useAuth();
  const services = getGlobalApogeeDataServices();

  const now = new Date();
  const targetYear = now.getFullYear();
  const currentDate = new Date(targetYear, currentMonthIndex, 1);

  const dateRange = {
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  };

  // Plage annuelle pour l'évolution
  const yearlyDateRange = {
    start: startOfYear(currentDate),
    end: endOfMonth(currentDate),
  };

  return useQuery({
    queryKey: ["diffusion-apporteurs-statia", agence, currentMonthIndex],
    enabled: !!agence,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DiffusionApporteursData> => {
      if (!agence) throw new Error("Agency manquant");

      const [
        caParTypeResult,
        dossiersParTypeResult,
        panierParTypeResult,
        tauxTransfoParTypeResult,
        tauxSavParTypeResult,
        caSegmenteResult,
      ] = await Promise.all([
        getMetricForAgency('ca_par_type_apporteur', agence, { dateRange }, services),
        getMetricForAgency('dossiers_par_type_apporteur', agence, { dateRange }, services),
        getMetricForAgency('panier_moyen_par_type_apporteur', agence, { dateRange }, services),
        getMetricForAgency('taux_transfo_par_type_apporteur', agence, { dateRange }, services),
        getMetricForAgency('taux_sav_par_type_apporteur', agence, { dateRange }, services),
        getMetricForAgency('ca_mensuel_segmente', agence, { dateRange: yearlyDateRange }, services),
      ]);

      // Extraire données par type
      const caByType = (caParTypeResult.value || {}) as Record<string, number>;
      const dossiersByType = (dossiersParTypeResult.value || {}) as Record<string, number>;
      const panierByType = (panierParTypeResult.value || {}) as Record<string, number>;
      const tauxTransfoByType = (tauxTransfoParTypeResult.value || {}) as Record<string, number>;
      const tauxSavByType = (tauxSavParTypeResult.value || {}) as Record<string, number>;

      // Construire stats par type
      const allTypes = new Set([
        ...Object.keys(caByType),
        ...Object.keys(dossiersByType),
      ]);

      const typeStats: TypeApporteurStats[] = Array.from(allTypes)
        .map(type => ({
          type,
          caHT: caByType[type] || 0,
          nbDossiers: dossiersByType[type] || 0,
          panierMoyen: panierByType[type] || 0,
          tauxTransfo: tauxTransfoByType[type] || 0,
          tauxSav: tauxSavByType[type] || 0,
        }))
        .filter(t => t.caHT > 0 || t.nbDossiers > 0)
        .sort((a, b) => b.caHT - a.caHT);

      // Segmentation mensuelle
      const segmentationMensuelle = (caSegmenteResult.value || []) as Array<{
        mois: string;
        apporteurs: number;
        particuliers: number;
      }>;

      // Évolution mensuelle par type (simulée à partir de segmentation)
      const monthlyEvolution: MonthlyEvolutionItem[] = segmentationMensuelle.map(m => {
        const item: MonthlyEvolutionItem = { month: m.mois };
        // Répartir le CA apporteurs entre les types proportionnellement
        const totalCaType = typeStats.reduce((sum, t) => sum + t.caHT, 0);
        typeStats.forEach(t => {
          const ratio = totalCaType > 0 ? t.caHT / totalCaType : 0;
          item[t.type] = Math.round(m.apporteurs * ratio);
        });
        return item;
      });

      // Calculs segmentation
      const caApporteurs = segmentationMensuelle.reduce((sum, m) => sum + (m.apporteurs || 0), 0);
      const caParticuliers = segmentationMensuelle.reduce((sum, m) => sum + (m.particuliers || 0), 0);
      const total = caApporteurs + caParticuliers;

      const segmentationPct = {
        apporteurs: total > 0 ? (caApporteurs / total) * 100 : 0,
        particuliers: total > 0 ? (caParticuliers / total) * 100 : 0,
      };

      return {
        typeStats,
        monthlyEvolution,
        segmentationPct,
        caApporteurs,
        caParticuliers,
      };
    },
  });
}
