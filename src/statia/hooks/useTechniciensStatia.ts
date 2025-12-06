/**
 * Hook StatIA - Métriques Techniciens
 * Centralise les appels StatIA pour la page IndicateursTechniciens
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";
import { DataService } from "@/apogee-connect/services/dataService";
import { EnrichmentService } from "@/apogee-connect/services/enrichmentService";
import { logError } from "@/lib/logger";

export interface TechnicienStatsByUnivers {
  [universSlug: string]: {
    caHT: number;
    heures: number;
    caParHeure: number;
    nbDossiers: number;
  };
}

export interface TechnicienStats {
  technicienId: string;
  technicienNom: string;
  technicienColor: string;
  technicienActif: boolean;
  totaux: {
    caHT: number;
    heures: number;
    caParHeure: number;
    nbDossiers: number;
  };
  universes: TechnicienStatsByUnivers;
}

export interface UniverseInfo {
  slug: string;
  label: string;
  colorHex: string;
}

export interface TechniciensStatiaData {
  // Stats par technicien × univers (heatmap)
  technicienUniversStats: TechnicienStats[];
  
  // Liste des univers disponibles (format attendu par TechnicienUniversHeatmap)
  universes: UniverseInfo[];
  
  // KPIs globaux
  caTotal: number;
  heuresTotal: number;
  caParHeureGlobal: number;
  nbTechniciens: number;
  
  // Top performers
  topTechniciens: Array<{ name: string; ca: number; color: string; rank: number }>;
  
  // CA mensuel par technicien (évolution)
  caMensuelParTech: Record<string, Record<string, number>>;
  
  // Loading states
  isLoading: boolean;
  error: Error | null;
}

const DEFAULT_DATA: TechniciensStatiaData = {
  technicienUniversStats: [],
  universes: [],
  caTotal: 0,
  heuresTotal: 0,
  caParHeureGlobal: 0,
  nbTechniciens: 0,
  topTechniciens: [],
  caMensuelParTech: {},
  isLoading: true,
  error: null,
};

export function useTechniciensStatia(): TechniciensStatiaData {
  const { isAgencyReady, currentAgency } = useAgency();
  const { isAuthLoading, agence } = useAuth();
  const { filters } = useSecondaryFilters();
  
  const agencySlug = agence || currentAgency?.slug || '';
  
  const query = useQuery({
    queryKey: ["statia-techniciens", agencySlug, filters.dateRange],
    queryFn: async () => {
      if (!agencySlug) {
        throw new Error("Aucune agence définie");
      }
      
      // Charger les services de données
      const rawData = await DataService.loadAllData();
      
      // Initialiser l'enrichment service pour avoir les couleurs des univers
      EnrichmentService.initialize(rawData);
      
      const services = {
        getFactures: async () => rawData.factures,
        getProjects: async () => rawData.projects,
        getInterventions: async () => rawData.interventions,
        getUsers: async () => rawData.users,
        getDevis: async () => rawData.devis,
        getClients: async () => rawData.clients,
      };
      
      const params = { dateRange: filters.dateRange };
      
      // Charger les métriques en parallèle
      const [
        caParTechUniversResult,
        caParTechResult,
        topTechResult,
        caMoyenParHeureResult,
        heuresProductivesResult,
        interventionsParTechResult,
      ] = await Promise.all([
        getMetricForAgency("ca_par_technicien_univers", agencySlug, params, services),
        getMetricForAgency("ca_par_technicien", agencySlug, params, services),
        getMetricForAgency("top_techniciens_ca", agencySlug, params, services),
        getMetricForAgency("ca_moyen_par_heure_tous_techniciens", agencySlug, params, services),
        getMetricForAgency("nb_heures_productives", agencySlug, params, services),
        getMetricForAgency("nb_interventions_par_technicien", agencySlug, params, services),
      ]);
      
      // Transformer ca_par_technicien_univers en format TechnicienStats[]
      const caParTechUnivers = caParTechUniversResult.value as Record<string, any> || {};
      
      const technicienUniversStats: TechnicienStats[] = Object.entries(caParTechUnivers).map(([techId, data]: [string, any]) => ({
        technicienId: techId,
        technicienNom: data.name || `Tech ${techId}`,
        technicienColor: data.color || '#808080',
        technicienActif: true,
        totaux: {
          caHT: data.ca || 0,
          heures: data.heures || 0,
          caParHeure: data.caParHeure || 0,
          nbDossiers: 0,
        },
        universes: data.byUnivers || {},
      }));
      
      // Extraire la liste des univers avec leurs infos (slug, label, colorHex)
      const universesSet = new Set<string>();
      technicienUniversStats.forEach(tech => {
        Object.keys(tech.universes).forEach(u => universesSet.add(u));
      });
      
      // Récupérer les infos d'univers depuis EnrichmentService
      const universes: UniverseInfo[] = Array.from(universesSet)
        .map(slug => {
          const info = EnrichmentService.getUniverse(slug);
          return { slug: info.slug, label: info.label, colorHex: info.colorHex };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
      
      // Calculs globaux
      let caTotal = 0;
      let heuresTotal = 0;
      
      technicienUniversStats.forEach(tech => {
        caTotal += tech.totaux.caHT;
        heuresTotal += tech.totaux.heures;
      });
      
      const caParHeureGlobal = heuresTotal > 0 ? caTotal / heuresTotal : 0;
      
      // Top techniciens depuis résultat direct
      const topTechData = topTechResult.value as Record<string, { name: string; ca: number; color: string; rank: number }> || {};
      const topTechniciens = Object.values(topTechData)
        .sort((a, b) => (a.rank || 0) - (b.rank || 0))
        .slice(0, 10);
      
      return {
        technicienUniversStats,
        universes,
        caTotal,
        heuresTotal,
        caParHeureGlobal,
        nbTechniciens: technicienUniversStats.length,
        topTechniciens,
        caMensuelParTech: {},
      };
    },
    enabled: isAgencyReady && !isAuthLoading && !!agencySlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  
  if (query.error) {
    logError("useTechniciensStatia error", query.error);
  }
  
  return {
    ...DEFAULT_DATA,
    ...query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
