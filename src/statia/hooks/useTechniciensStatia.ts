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

export interface TechMensuelData {
  techId: string;
  name: string;
  color: string;
  months: Record<string, number>; // "YYYY-MM" -> CA
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
  caMensuelParTech: TechMensuelData[];
  availableMonths: string[]; // Liste des mois disponibles, du plus récent au plus ancien
  
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
  caMensuelParTech: [],
  availableMonths: [],
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
      
      // Charger les services de données avec l'agence explicite
      const rawData = await DataService.loadAllData(true, false, agencySlug);
      
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
        caMensuelParTechResult,
      ] = await Promise.all([
        getMetricForAgency("ca_par_technicien_univers", agencySlug, params, services),
        getMetricForAgency("ca_par_technicien", agencySlug, params, services),
        getMetricForAgency("top_techniciens_ca", agencySlug, params, services),
        getMetricForAgency("ca_moyen_par_heure_tous_techniciens", agencySlug, params, services),
        getMetricForAgency("nb_heures_productives", agencySlug, params, services),
        getMetricForAgency("nb_interventions_par_technicien", agencySlug, params, services),
        getMetricForAgency("ca_mensuel_par_technicien", agencySlug, params, services),
      ]);
      
      // Transformer ca_par_technicien_univers en format TechnicienStats[]
      const caParTechUnivers = caParTechUniversResult.value as Record<string, any> || {};
      
      // Transformer byUnivers pour inclure caParHeure par univers
      const technicienUniversStats: TechnicienStats[] = Object.entries(caParTechUnivers).map(([techId, data]: [string, any]) => {
        // Transformer byUnivers pour ajouter caParHeure et nbDossiers par univers
        const transformedUniverses: TechnicienStatsByUnivers = {};
        const byUnivers = data.byUnivers || {};
        
        Object.entries(byUnivers).forEach(([univers, uData]: [string, any]) => {
          const heures = uData.heures || 0;
          transformedUniverses[univers] = {
            caHT: uData.ca || 0,
            heures: heures,
            caParHeure: heures > 0 ? (uData.ca || 0) / heures : 0,
            nbDossiers: uData.nbDossiers || 0,
          };
        });
        
        return {
          technicienId: techId,
          technicienNom: data.name || `Tech ${techId}`,
          technicienColor: data.color || '#808080',
          technicienActif: data.isOn ?? true,
          totaux: {
            caHT: data.ca || 0,
            heures: data.heures || 0,
            caParHeure: data.caParHeure || 0,
            nbDossiers: data.nbDossiers || 0,
          },
          universes: transformedUniverses,
        };
      });
      
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
      
      // Calculs globaux - utiliser le breakdown du moteur unifié pour caTotal
      // Garantit la cohérence avec ca_par_technicien et top_techniciens_ca
      const caTotal = (caParTechResult.breakdown as any)?.total || 
        technicienUniversStats.reduce((sum, tech) => sum + tech.totaux.caHT, 0);
      
      let heuresTotal = 0;
      technicienUniversStats.forEach(tech => {
        heuresTotal += tech.totaux.heures;
      });
      
      const caParHeureGlobal = heuresTotal > 0 ? caTotal / heuresTotal : 0;
      
      // Top techniciens depuis résultat direct
      const topTechData = topTechResult.value as Record<string, { name: string; ca: number; color: string; rank: number }> || {};
      const topTechniciens = Object.values(topTechData)
        .sort((a, b) => (a.rank || 0) - (b.rank || 0))
        .slice(0, 10);
      
      // CA mensuel par technicien
      const caMensuelRaw = caMensuelParTechResult.value as Record<string, {
        name: string;
        color: string;
        isOn: boolean;
        months: Record<string, number>;
      }> || {};
      
      // Générer les 6 derniers mois avant la fin de la période sélectionnée
      // (toujours afficher 6 colonnes, même sans données)
      const now = new Date();
      const endDate = filters.dateRange.end < now ? new Date(filters.dateRange.end) : now;
      const availableMonths: string[] = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        availableMonths.push(key);
      }
      
      // Transformer en format TechMensuelData[]
      const caMensuelParTech: TechMensuelData[] = Object.entries(caMensuelRaw).map(([techId, data]) => ({
        techId,
        name: data.name,
        color: data.color,
        months: data.months,
      }));
      
      return {
        technicienUniversStats,
        universes,
        caTotal,
        heuresTotal,
        caParHeureGlobal,
        nbTechniciens: technicienUniversStats.length,
        topTechniciens,
        caMensuelParTech,
        availableMonths,
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
