/**
 * Hook DiffusionKpiTiles migré vers StatIA
 * Utilise exclusivement les métriques StatIA pour les KPIs
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { DataService } from "@/apogee-connect/services/dataService";
import { startOfMonth, endOfMonth } from "date-fns";

export function useDiffusionKpisStatia(currentMonthIndex: number) {
  const { agence } = useAuth();
  const services = getGlobalApogeeDataServices();

  // Utiliser l'année courante - 1 si on est en début d'année sans données
  // Pour la diffusion, on veut généralement l'année fiscale en cours
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

      // Charger données brutes pour l'agence spécifique
      const allData = await DataService.loadAllData(true, false, agence);

      // === Métriques StatIA ===
      const [caResult, savResult, caMoyenResult, topTechResult] = await Promise.all([
        getMetricForAgency('ca_global_ht', agence, { dateRange }, services),
        getMetricForAgency('taux_sav_global', agence, { dateRange }, services),
        getMetricForAgency('ca_moyen_par_tech', agence, { dateRange }, services),
        getMetricForAgency('top_techniciens_ca', agence, { dateRange }, services),
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

      // === Dossiers reçus (projets créés dans le mois) ===
      const nbDossiersRecus = (allData.projects || []).filter((p: any) => {
        const pDate = new Date(p.date || p.createdAt);
        return pDate >= dateRange.start && pDate <= dateRange.end;
      }).length;

      // === Moyenne CA/jour ===
      const daysInMonth = new Date(currentDate.getFullYear(), currentMonthIndex + 1, 0).getDate();
      const currentDay = currentDate.getMonth() === new Date().getMonth() ? new Date().getDate() : daysInMonth;
      const moyenneParJour = currentDay > 0 ? currentMonthCA / currentDay : 0;

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
