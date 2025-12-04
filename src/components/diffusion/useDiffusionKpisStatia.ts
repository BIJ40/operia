/**
 * Hook DiffusionKpiTiles migré vers StatIA
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { DataService } from "@/apogee-connect/services/dataService";
import { calculateTop10Apporteurs } from "@/apogee-connect/utils/apporteursCalculations";
import { buildTechMap } from "@/apogee-connect/utils/techTools";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export function useDiffusionKpisStatia(currentMonthIndex: number) {
  const { agence } = useAuth();
  const services = getGlobalApogeeDataServices();

  const currentDate = new Date();
  currentDate.setMonth(currentMonthIndex);

  const dateRange = {
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  };

  const yearRange = {
    start: startOfYear(currentDate),
    end: endOfYear(currentDate),
  };

  return useQuery({
    queryKey: ["diffusion-kpis-statia", agence, currentMonthIndex],
    enabled: !!agence,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!agence) throw new Error("Agency manquant");

      // Charger données brutes pour calculs legacy
      const allData = await DataService.loadAllData(true);

      // === Métriques StatIA ===
      const [caResult, savResult, transfoResult, caUniversResult] = await Promise.all([
        getMetricForAgency('ca_global_ht', agence, { dateRange }, services),
        getMetricForAgency('taux_sav_global', agence, { dateRange }, services),
        getMetricForAgency('taux_transformation_devis_nombre', agence, { dateRange }, services),
        getMetricForAgency('ca_par_univers', agence, { dateRange }, services),
      ]);

      const currentMonthCA = Number(caResult.value) || 0;
      const tauxSAV = Number(savResult.value) || 0;
      const tauxTransfo = Number(transfoResult.value) || 0;

      // Top univers depuis StatIA
      const caByUnivers = (caUniversResult.breakdown || {}) as Record<string, number>;
      const topUniversEntry = Object.entries(caByUnivers).sort(([, a], [, b]) => b - a)[0];
      const topUnivers = topUniversEntry ? { univers: topUniversEntry[0], caHT: topUniversEntry[1] } : null;

      // === Calculs legacy ===
      const techMap = buildTechMap(allData.users || []);
      const nbTechsActifs = Object.keys(techMap).length;
      const caMoyenParTech = nbTechsActifs > 0 ? currentMonthCA / nbTechsActifs : 0;

      const topApporteurs = calculateTop10Apporteurs(
        allData.factures || [],
        allData.projects || [],
        allData.devis || [],
        allData.clients || [],
        yearRange
      );

      const daysInMonth = new Date(currentDate.getFullYear(), currentMonthIndex + 1, 0).getDate();
      const currentDay = currentDate.getMonth() === new Date().getMonth() ? new Date().getDate() : daysInMonth;
      const moyenneParJour = currentDay > 0 ? currentMonthCA / currentDay : 0;

      // SAV count (from legacy data for now)
      const savProjectIds = new Set<number>();
      allData.interventions?.forEach((intervention: any) => {
        const type2 = intervention.type2 || intervention.data?.type2 || "";
        const type = intervention.type || intervention.data?.type || "";
        const isSAV = type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");
        if (isSAV && intervention.projectId) savProjectIds.add(intervention.projectId);
      });
      
      const projectsInRange = (allData.projects || []).filter((p: any) => {
        const pDate = new Date(p.date || p.createdAt);
        return pDate >= dateRange.start && pDate <= dateRange.end;
      });

      return {
        currentMonthCA,
        tauxSAV,
        tauxTransfo,
        topUnivers,
        caMoyenParTech,
        nbTechsActifs,
        topApporteur: topApporteurs[0] || null,
        moyenneParJour,
        currentDay,
        nbSAVProjects: savProjectIds.size,
        nbTotalProjects: projectsInRange.length,
      };
    },
  });
}
