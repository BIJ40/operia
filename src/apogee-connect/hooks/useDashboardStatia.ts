/**
 * Hook Dashboard intégrant StatIA pour les métriques migrées
 * Migration progressive : StatIA pour les métriques disponibles, legacy pour le reste
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { DataService } from "@/apogee-connect/services/dataService";
import { logApogee } from "@/lib/logger";

// StatIA imports
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";

// Legacy calculations (à supprimer progressivement)
import { calculateDashboardStats } from "@/apogee-connect/utils/dashboardCalculations";
import { calculateLast7DaysActivity, calculateVariationVs30Days } from "@/apogee-connect/utils/activityCalculations";
import { calculateMonthlyCA } from "@/apogee-connect/utils/monthlyCalculations";
import { 
  calculateTop10Apporteurs, 
  calculateDossiersConfiesParApporteur, 
  calculateDuGlobal, 
  calculatePartApporteurs,
  calculateTauxTransformationMoyen,
  calculatePanierMoyenHT,
  calculateDelaiMoyenFacturation,
  calculateTauxSAV,
  calculateTauxSAVGlobal,
  calculateFlop10Apporteurs
} from "@/apogee-connect/utils/apporteursCalculations";
import { calculateTypesApporteursStats } from "@/apogee-connect/utils/typesApporteursCalculations";
import { calculateParticuliersStats } from "@/apogee-connect/utils/particuliersCalculations";
import { calculateMonthlySegmentation } from "@/apogee-connect/utils/segmentationCalculations";

export interface DashboardData {
  // KPIs principaux (StatIA)
  caJour: number;
  nbFacturesCA: number;
  tauxSAVGlobal: number;
  tauxTransformationDevis: number;
  panierMoyen: number;
  montantRestant: number;
  
  // KPIs legacy (à migrer)
  dossiersJour: number;
  rtJour: number;
  heuresRT: number;
  devisJour: number;
  caDevis: number;
  delaiMoyenDossier: number;
  tauxDossiersComplexes: number;
  nbMoyenInterventionsParDossier: number;
  nbMoyenVisitesParIntervention: number;
  tauxDossiersMultiUnivers: number;
  tauxDossiersSansDevis: number;
  tauxDossiersMultiTechniciens: number;
  polyvalenceTechniciens: number;
  delaiDossierPremierDevis: number;
  nbDossiersAvecDevis: number;
  
  // Variations
  variations: {
    dossiers: number;
    rt: number | null;
    devis: number | null;
    ca: number;
  };
  
  // Charts & widgets data
  activityData: any[];
  activityVariation: number;
  monthlyCAData: any[];
  top10Apporteurs: any[];
  dossiersConfiesParApporteur: any[];
  duGlobal: any;
  partApporteurs: number;
  tauxTransformationMoyen: number;
  panierMoyenHT: number;
  delaiMoyenFacturation: number;
  tauxSAV: any;
  flop10Apporteurs: any[];
  typesApporteursStats: any;
  particuliersStats: any;
  segmentationData: any[];
}

export function useDashboardStatia() {
  const { filters } = useFilters();
  const { filters: secondaryFilters } = useSecondaryFilters();
  const { isApiEnabled } = useApiToggle();
  const { currentAgency, isAgencyReady, agencyChangeCounter } = useAgency();
  
  const agencySlug = currentAgency?.id || "";
  const dateRange = filters.dateRange;
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ["dashboard-statia", agencySlug, dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), secondaryFilters, agencyChangeCounter],
    enabled: isAgencyReady && isApiEnabled && !!agencySlug && !!dateRange,
    queryFn: async (): Promise<DashboardData | null> => {
      if (!currentAgency?.id || !dateRange) {
        logApogee.warn('[Dashboard StatIA] Agence ou période non définie');
        return null;
      }
      
      logApogee.debug('[Dashboard StatIA] Chargement hybride StatIA + Legacy');
      
      // Charger les données brutes pour les calculs legacy
      const apiData = await DataService.loadAllData(isApiEnabled, false, agencySlug);
      
      // ========================================
      // MÉTRIQUES StatIA (source de vérité)
      // ========================================
      const statiaParams = { dateRange };
      
      const [
        caResult,
        tauxSAVResult,
        tauxTransfoResult,
        panierMoyenResult,
        montantRestantResult,
      ] = await Promise.all([
        getMetricForAgency('ca_global_ht', agencySlug, statiaParams, services),
        getMetricForAgency('taux_sav_global', agencySlug, statiaParams, services),
        getMetricForAgency('taux_transformation_devis_nombre', agencySlug, statiaParams, services),
        getMetricForAgency('panier_moyen_ht', agencySlug, statiaParams, services),
        getMetricForAgency('montant_restant', agencySlug, statiaParams, services),
      ]);
      
      // ========================================
      // CALCULS LEGACY (à migrer progressivement)
      // ========================================
      const legacyStats = calculateDashboardStats({
        projects: apiData.projects || [],
        interventions: apiData.interventions || [],
        factures: apiData.factures || [],
        devis: apiData.devis || [],
        clients: apiData.clients || [],
        users: apiData.users || [],
      }, dateRange, agencySlug);
      
      // Activity chart
      const activityData = calculateLast7DaysActivity(apiData.projects || []);
      const activityVariation = calculateVariationVs30Days(apiData.projects || []);
      
      // Monthly CA chart
      const year = dateRange.start instanceof Date ? dateRange.start.getFullYear() : new Date().getFullYear();
      const monthlyCAData = calculateMonthlyCA(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        year,
        agencySlug
      );
      
      // Apporteurs widgets (période secondaire)
      const top10Apporteurs = calculateTop10Apporteurs(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const dossiersConfiesParApporteur = calculateDossiersConfiesParApporteur(
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const duGlobal = calculateDuGlobal(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const partApporteurs = calculatePartApporteurs(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange,
        agencySlug
      );
      
      const tauxTransformationMoyen = calculateTauxTransformationMoyen(
        apiData.devis || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const panierMoyenHT = calculatePanierMoyenHT(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const delaiMoyenFacturation = calculateDelaiMoyenFacturation(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const tauxSAV = calculateTauxSAV(
        apiData.interventions || [],
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const flop10Apporteurs = calculateFlop10Apporteurs(
        apiData.factures || [],
        apiData.projects || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const typesApporteursStats = calculateTypesApporteursStats(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.interventions || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const particuliersStats = calculateParticuliersStats(
        apiData.factures || [],
        apiData.projects || [],
        apiData.devis || [],
        apiData.interventions || [],
        apiData.clients || [],
        secondaryFilters.dateRange
      );
      
      const segmentationData = calculateMonthlySegmentation(
        apiData.factures || [],
        apiData.clients || [],
        apiData.projects || [],
        year
      );
      
      // ========================================
      // FUSION : StatIA prioritaire, legacy fallback
      // ========================================
      return {
        // StatIA metrics (source de vérité)
        caJour: (caResult.value as number) || 0,
        nbFacturesCA: (caResult.metadata?.recordCount as number) || legacyStats.nbFacturesCA,
        tauxSAVGlobal: (tauxSAVResult.value as number) || 0,
        tauxTransformationDevis: (tauxTransfoResult.value as number) || legacyStats.tauxTransformationDevis,
        panierMoyen: (panierMoyenResult.value as number) || legacyStats.panierMoyen,
        montantRestant: (montantRestantResult.value as number) || 0,
        
        // Legacy metrics (non encore migrés)
        dossiersJour: legacyStats.dossiersJour,
        rtJour: legacyStats.rtJour,
        heuresRT: legacyStats.heuresRT,
        devisJour: legacyStats.devisJour,
        caDevis: legacyStats.caDevis,
        delaiMoyenDossier: legacyStats.delaiMoyenDossier,
        tauxDossiersComplexes: legacyStats.tauxDossiersComplexes,
        nbMoyenInterventionsParDossier: legacyStats.nbMoyenInterventionsParDossier,
        nbMoyenVisitesParIntervention: legacyStats.nbMoyenVisitesParIntervention,
        tauxDossiersMultiUnivers: legacyStats.tauxDossiersMultiUnivers,
        tauxDossiersSansDevis: legacyStats.tauxDossiersSansDevis,
        tauxDossiersMultiTechniciens: legacyStats.tauxDossiersMultiTechniciens,
        polyvalenceTechniciens: legacyStats.polyvalenceTechniciens,
        delaiDossierPremierDevis: legacyStats.delaiDossierPremierDevis,
        nbDossiersAvecDevis: legacyStats.nbDossiersAvecDevis,
        
        // Variations (legacy)
        variations: legacyStats.variations,
        
        // Charts & widgets
        activityData,
        activityVariation,
        monthlyCAData,
        top10Apporteurs,
        dossiersConfiesParApporteur,
        duGlobal,
        partApporteurs,
        tauxTransformationMoyen,
        panierMoyenHT,
        delaiMoyenFacturation,
        tauxSAV,
        flop10Apporteurs,
        typesApporteursStats,
        particuliersStats,
        segmentationData,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
