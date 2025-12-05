/**
 * Hook DiffusionKpiTiles migré vers StatIA
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { DataService } from "@/apogee-connect/services/dataService";
import { computeTechUniversStatsForAgency } from "@/shared/utils/technicienUniversEngine";
import { startOfMonth, endOfMonth } from "date-fns";

export function useDiffusionKpisStatia(currentMonthIndex: number) {
  const { agence } = useAuth();
  const services = getGlobalApogeeDataServices();

  const currentDate = new Date();
  currentDate.setMonth(currentMonthIndex);

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

      // Charger données brutes
      const allData = await DataService.loadAllData(true);

      // === Métriques StatIA ===
      const [caResult, savResult] = await Promise.all([
        getMetricForAgency('ca_global_ht', agence, { dateRange }, services),
        getMetricForAgency('taux_sav_global', agence, { dateRange }, services),
      ]);

      const currentMonthCA = Number(caResult.value) || 0;
      const tauxSAV = Number(savResult.value) || 0;

      // === Calculs techniciens ===
      const techStats = computeTechUniversStatsForAgency(
        allData.factures || [],
        allData.projects || [],
        allData.interventions || [],
        allData.users || [],
        dateRange
      );

      // Agréger CA par technicien
      const techTotals: Record<string, { nom: string; caHT: number }> = {};
      techStats.forEach(stat => {
        if (!techTotals[stat.technicienId]) {
          techTotals[stat.technicienId] = { nom: stat.technicienNom, caHT: 0 };
        }
        techTotals[stat.technicienId].caHT += stat.totaux.caHT;
      });

      const sortedTechs = Object.values(techTotals).sort((a, b) => b.caHT - a.caHT);
      const topTechnicien = sortedTechs[0] || null;
      const nbTechsActifs = sortedTechs.filter(t => t.caHT > 0).length;
      const caMoyenParTech = nbTechsActifs > 0 ? currentMonthCA / nbTechsActifs : 0;

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
