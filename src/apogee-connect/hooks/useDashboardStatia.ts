/**
 * Hook Dashboard 100% StatIA
 * P1a: Tous les fallbacks legacy supprimés - StatIA source unique de vérité
 */

import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { useApiToggle } from "@/apogee-connect/contexts/ApiToggleContext";
import { logApogee } from "@/lib/logger";

// StatIA imports - SOURCE UNIQUE DE VÉRITÉ
import { getGlobalApogeeDataServices } from "@/statia/adapters/dataServiceAdapter";
import { getMetricForAgency } from "@/statia/api/getMetricForAgency";

export interface DashboardData {
  // KPIs principaux (StatIA)
  caJour: number;
  nbFacturesCA: number;
  tauxSAVGlobal: number;
  tauxTransformationDevis: number;
  panierMoyen: number;
  montantRestant: number;
  
  // KPIs StatIA - dossiers & devis
  dossiersJour: number;
  rtJour: number;
  devisJour: number;
  caDevis: number;
  
  // KPIs StatIA - délais
  delaiMoyenDossier: number;
  delaiDossierPremierDevis: number;
  
  // KPIs StatIA - complexité
  tauxDossiersComplexes: number;
  nbMoyenInterventionsParDossier: number;
  nbMoyenVisitesParIntervention: number;
  tauxDossiersMultiUnivers: number;
  tauxDossiersSansDevis: number;
  tauxDossiersMultiTechniciens: number;
  polyvalenceTechniciens: number;
  
  // Variations (calculées côté StatIA si disponibles)
  variations: {
    dossiers: number;
    rt: number | null;
    devis: number | null;
    ca: number;
  };
  
  // Charts & widgets data (StatIA rankings)
  top10Apporteurs: any[];
  flop10Apporteurs: any[];
  partApporteurs: number;
  tauxTransformationMoyen: number;
  panierMoyenHT: number;
  delaiMoyenFacturation: number;
  tauxSAV: any;
  
  // Données graphiques
  activityData: any[];
  activityVariation: number;
  monthlyCAData: any[];
  dossiersConfiesParApporteur: any[];
  duGlobal: any;
  typesApporteursStats: any;
  particuliersStats: any;
  segmentationData: any[];
  
  // Extras pour rétro-compat
  heuresRT: number;
  nbDossiersAvecDevis: number;
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
      
      logApogee.debug('[Dashboard StatIA] Chargement 100% StatIA');
      
      // ========================================
      // TOUTES LES MÉTRIQUES VIA STATIA
      // ========================================
      const statiaParams = { dateRange };
      const secondaryParams = { dateRange: secondaryFilters.dateRange };
      
      // Métriques principales
      const [
        caResult,
        tauxSAVResult,
        tauxTransfoResult,
        panierMoyenResult,
        montantRestantResult,
        nbDossiersResult,
        nbDevisResult,
        montantDevisResult,
        delaiDossierResult,
        delaiPremierDevisResult,
        tauxComplexesResult,
      ] = await Promise.all([
        getMetricForAgency('ca_global_ht', agencySlug, statiaParams, services),
        getMetricForAgency('taux_sav_global', agencySlug, statiaParams, services),
        getMetricForAgency('taux_transformation_devis_nombre', agencySlug, statiaParams, services),
        getMetricForAgency('panier_moyen_ht', agencySlug, statiaParams, services),
        getMetricForAgency('montant_restant', agencySlug, statiaParams, services),
        getMetricForAgency('nb_dossiers_crees', agencySlug, statiaParams, services),
        getMetricForAgency('nombre_devis', agencySlug, statiaParams, services),
        getMetricForAgency('montant_devis', agencySlug, statiaParams, services),
        getMetricForAgency('duree_moyenne_dossier', agencySlug, statiaParams, services),
        getMetricForAgency('delai_dossier_premier_devis', agencySlug, statiaParams, services),
        getMetricForAgency('taux_dossiers_complexes', agencySlug, statiaParams, services),
      ]);
      
      // Métriques apporteurs (période secondaire)
      const [
        topApporteursResult,
        flopApporteursResult,
        partApporteursResult,
        duGlobalResult,
      ] = await Promise.all([
        getMetricForAgency('top_apporteurs_ca', agencySlug, secondaryParams, services),
        getMetricForAgency('flop_apporteurs_ca', agencySlug, secondaryParams, services),
        getMetricForAgency('part_apporteurs', agencySlug, secondaryParams, services),
        getMetricForAgency('du_client', agencySlug, secondaryParams, services),
      ]);
      
      // Métriques CA mensuel
      const [
        caParMoisResult,
        nbInterventionsResult,
      ] = await Promise.all([
        getMetricForAgency('ca_par_mois', agencySlug, statiaParams, services),
        getMetricForAgency('nb_interventions', agencySlug, statiaParams, services),
      ]);
      
      // Extraire les données des breakdowns
      const topApporteursList = (topApporteursResult.breakdown as any)?.ranking || [];
      const flopApporteursList = (flopApporteursResult.breakdown as any)?.ranking || [];
      const monthlyCAData = (caParMoisResult.breakdown as any)?.byMonth || [];
      
      // ========================================
      // CONSTRUCTION DU RÉSULTAT 100% STATIA
      // ========================================
      return {
        // KPIs principaux
        caJour: (caResult.value as number) || 0,
        nbFacturesCA: (caResult.breakdown as any)?.factureCount || 0,
        tauxSAVGlobal: (tauxSAVResult.value as number) || 0,
        tauxTransformationDevis: (tauxTransfoResult.value as number) || 0,
        panierMoyen: (panierMoyenResult.value as number) || 0,
        montantRestant: (montantRestantResult.value as number) || 0,
        
        // Dossiers & Devis
        dossiersJour: (nbDossiersResult.value as number) || 0,
        rtJour: (nbInterventionsResult.breakdown as any)?.byType?.rt || 0,
        devisJour: (nbDevisResult.value as number) || 0,
        caDevis: (montantDevisResult.value as number) || 0,
        
        // Délais
        delaiMoyenDossier: (delaiDossierResult.value as number) || 0,
        delaiDossierPremierDevis: (delaiPremierDevisResult.value as number) || 0,
        
        // Complexité
        tauxDossiersComplexes: (tauxComplexesResult.value as number) || 0,
        nbMoyenInterventionsParDossier: (tauxComplexesResult.breakdown as any)?.avgInterventions || 0,
        nbMoyenVisitesParIntervention: (tauxComplexesResult.breakdown as any)?.avgVisites || 0,
        tauxDossiersMultiUnivers: (tauxComplexesResult.breakdown as any)?.tauxMultiUnivers || 0,
        tauxDossiersSansDevis: (tauxComplexesResult.breakdown as any)?.tauxSansDevis || 0,
        tauxDossiersMultiTechniciens: (tauxComplexesResult.breakdown as any)?.tauxMultiTech || 0,
        polyvalenceTechniciens: 0, // À ajouter dans StatIA si nécessaire
        
        // Variations
        variations: {
          dossiers: (nbDossiersResult.breakdown as any)?.variation || 0,
          rt: null,
          devis: null,
          ca: (caResult.breakdown as any)?.variation || 0,
        },
        
        // Apporteurs
        top10Apporteurs: topApporteursList.slice(0, 10),
        flop10Apporteurs: flopApporteursList.slice(0, 10),
        partApporteurs: (partApporteursResult.value as number) || 0,
        tauxTransformationMoyen: (tauxTransfoResult.value as number) || 0,
        panierMoyenHT: (panierMoyenResult.value as number) || 0,
        delaiMoyenFacturation: (delaiDossierResult.value as number) || 0,
        tauxSAV: {
          global: (tauxSAVResult.value as number) || 0,
          breakdown: tauxSAVResult.breakdown || {},
        },
        dossiersConfiesParApporteur: topApporteursList.map((a: any) => ({
          apporteurId: a.id,
          apporteurName: a.name,
          nbDossiers: a.count || 0,
        })),
        duGlobal: {
          montant: (duGlobalResult.value as number) || 0,
          breakdown: duGlobalResult.breakdown || {},
        },
        
        // Graphiques
        activityData: [], // À implémenter via StatIA si besoin
        activityVariation: 0,
        monthlyCAData: monthlyCAData.map((m: any) => ({
          mois: m.month,
          ca: m.ca || 0,
          label: m.label || '',
        })),
        typesApporteursStats: null, // À implémenter via StatIA si besoin
        particuliersStats: null,
        segmentationData: [],
        
        // Extras rétro-compat
        heuresRT: 0,
        nbDossiersAvecDevis: (nbDevisResult.breakdown as any)?.nbDossiers || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
