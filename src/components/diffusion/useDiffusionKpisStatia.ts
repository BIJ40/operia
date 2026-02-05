/**
 * Hook DiffusionKpiTiles migré vers StatIA
 * 100% métriques StatIA - zéro calcul manuel
 * V2 : Ajout panier moyen, délai, top apporteur, top univers, ranking complet
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { startOfMonth, endOfMonth } from "date-fns";

export interface TechnicienRanking {
  id: string;
  nom: string;
  caHT: number;
  color?: string;
  rank: number;
}

export interface DiffusionKpisData {
  currentMonthCA: number;
  tauxSAV: number;
  caMoyenParTech: number;
  nbTechsActifs: number;
  topTechnicien: { nom: string; caHT: number } | null;
  nbDossiersRecus: number;
  moyenneParJour: number;
  currentDay: number;
  // Nouvelles métriques V2
  panierMoyen: number;
  delaiMoyen: number;
  topApporteur: { name: string; ca: number } | null;
  topUnivers: { name: string; ca: number } | null;
  allTechRanking: TechnicienRanking[];
}

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
    queryFn: async (): Promise<DiffusionKpisData> => {
      if (!agence) throw new Error("Agency manquant");

      // === 100% Métriques StatIA V2 ===
      const [
        caResult,
        savResult,
        caMoyenResult,
        topTechResult,
        dossiersResult,
        caJourResult,
        panierResult,
        delaiResult,
        topApporteursResult,
        caUniversResult,
      ] = await Promise.all([
        getMetricForAgency('ca_global_ht', agence, { dateRange }, services),
        getMetricForAgency('taux_sav_global', agence, { dateRange }, services),
        getMetricForAgency('ca_moyen_par_tech', agence, { dateRange }, services),
        getMetricForAgency('top_techniciens_ca', agence, { dateRange }, services),
        getMetricForAgency('nb_dossiers_crees', agence, { dateRange }, services),
        getMetricForAgency('ca_moyen_par_jour', agence, { dateRange }, services),
        getMetricForAgency('panier_moyen', agence, { dateRange }, services),
        getMetricForAgency('delai_moyen_prise_en_charge_intervention', agence, { dateRange }, services),
        getMetricForAgency('top_apporteurs_ca', agence, { dateRange }, services),
        getMetricForAgency('ca_par_univers', agence, { dateRange }, services),
      ]);

      const currentMonthCA = Number(caResult.value) || 0;
      const tauxSAV = Number(savResult.value) || 0;
      const caMoyenParTech = Number(caMoyenResult.value) || 0;
      
      // Extraire ranking techniciens complet
      const topTechBreakdown = topTechResult.breakdown as any;
      const ranking = topTechBreakdown?.ranking || [];
      
      const allTechRanking: TechnicienRanking[] = ranking
        .filter((tech: any) => {
          // Exclure les techniciens sans nom valide (fantômes)
          const hasValidName = tech.name && typeof tech.name === 'string' && tech.name.trim().length > 0;
          return hasValidName;
        })
        .map((tech: any, index: number) => ({
          id: tech.id || `tech-${index}`,
          nom: (tech.name || tech.label || '').trim() || `Tech ${index + 1}`,
          caHT: tech.ca || tech.totalCA || 0,
          color: tech.color,
          rank: index + 1,
        }));

      const topTechData = ranking[0];
      const topTechnicien = topTechData ? {
        nom: topTechData.name || `Tech ${topTechData.id}`,
        caHT: topTechData.ca || topTechData.totalCA || 0,
      } : null;
      
      const nbTechsActifs = (caMoyenResult.breakdown as any)?.nbTechActifs || allTechRanking.length;

      // Dossiers & CA/jour
      const nbDossiersRecus = Number(dossiersResult.value) || 0;
      const moyenneParJour = Number(caJourResult.value) || 0;
      const currentDay = (caJourResult.breakdown as any)?.nbJours || 1;

      // === Nouvelles métriques V2 ===
      const panierMoyen = Number(panierResult.value) || 0;
      const delaiMoyen = Number(delaiResult.value) || 0;

      // TOP 1 apporteur - extraire depuis value (Record<id, ca>) ou breakdown
      const topApporteursBreakdown = topApporteursResult.breakdown as any;
      const topApporteursValue = topApporteursResult.value as Record<string, number> | null;
      
      let topApporteur: { name: string; ca: number } | null = null;
      
      // Priorité 1: breakdown.ranking
      if (topApporteursBreakdown?.ranking?.length > 0) {
        const top = topApporteursBreakdown.ranking[0];
        topApporteur = {
          name: top.name || top.label || top.id || 'Inconnu',
          ca: top.ca || top.totalCA || 0,
        };
      }
      // Priorité 2: value comme Record<apporteur, ca>
      else if (topApporteursValue && typeof topApporteursValue === 'object') {
        const entries = Object.entries(topApporteursValue)
          .filter(([, val]) => typeof val === 'number' && val > 0)
          .sort((a, b) => b[1] - a[1]);
        if (entries.length > 0) {
          topApporteur = { name: entries[0][0], ca: entries[0][1] };
        }
      }

      // TOP 1 univers (max CA)
      const universValues = caUniversResult.value as Record<string, number> | null;
      let topUnivers: { name: string; ca: number } | null = null;
      if (universValues && typeof universValues === 'object') {
        const sorted = Object.entries(universValues)
          .filter(([, val]) => typeof val === 'number' && val > 0)
          .sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          topUnivers = { name: sorted[0][0], ca: sorted[0][1] };
        }
      }

      return {
        currentMonthCA,
        tauxSAV,
        caMoyenParTech,
        nbTechsActifs,
        topTechnicien,
        nbDossiersRecus,
        moyenneParJour,
        currentDay,
        panierMoyen,
        delaiMoyen,
        topApporteur,
        topUnivers,
        allTechRanking,
      };
    },
  });
}
