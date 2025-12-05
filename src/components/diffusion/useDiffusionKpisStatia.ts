/**
 * Hook DiffusionKpiTiles migré vers StatIA
 * 100% métriques StatIA - zéro calcul manuel
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { startOfMonth, endOfMonth } from "date-fns";

export function useDiffusionKpisStatia(currentMonthIndex: number) {
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
    queryKey: ["diffusion-kpis-statia", agence, currentMonthIndex],
    enabled: !!agence,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!agence) throw new Error("Agency manquant");

      // === 100% Métriques StatIA ===
      const [
        caResult,
        savResult,
        caMoyenResult,
        topTechResult,
        dossiersResult,
        caJourResult,
      ] = await Promise.all([
        getMetricForAgency('ca_global_ht', agence, { dateRange }, services),
        getMetricForAgency('taux_sav_global', agence, { dateRange }, services),
        getMetricForAgency('ca_moyen_par_tech', agence, { dateRange }, services),
        getMetricForAgency('top_techniciens_ca', agence, { dateRange }, services),
        getMetricForAgency('nb_dossiers_crees', agence, { dateRange }, services),
        getMetricForAgency('ca_moyen_par_jour', agence, { dateRange }, services),
      ]);

      const currentMonthCA = Number(caResult.value) || 0;
      const tauxSAV = Number(savResult.value) || 0;
      const caMoyenParTech = Number(caMoyenResult.value) || 0;
      
      // Extraire top technicien du breakdown
      const topTechBreakdown = topTechResult.breakdown as any;
      const ranking = topTechBreakdown?.ranking || [];
      const topTechData = ranking[0];
      const topTechnicien = topTechData ? {
        nom: topTechData.name || `Tech ${topTechData.id}`,
        caHT: (topTechResult.value as Record<string, number>)?.[topTechData.id] || 0,
      } : null;
      
      // Nombre de techniciens actifs depuis le breakdown de caMoyen
      const nbTechsActifs = (caMoyenResult.breakdown as any)?.nbTechActifs || 0;

      // === Métriques StatIA : Dossiers & CA/jour ===
      const nbDossiersRecus = Number(dossiersResult.value) || 0;
      const moyenneParJour = Number(caJourResult.value) || 0;
      
      // Nombre de jours pour affichage (depuis breakdown)
      const currentDay = (caJourResult.breakdown as any)?.nbJours || 1;

      return {
        currentMonthCA,
        tauxSAV,
        caMoyenParTech,
        nbTechsActifs,
        topTechnicien,
        nbDossiersRecus,
        moyenneParJour,
        currentDay,
      };
    },
  });
}
