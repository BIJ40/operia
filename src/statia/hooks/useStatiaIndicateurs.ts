/**
 * StatIA - Hook pour les indicateurs agence
 * Migration Phase 3: Remplace les appels legacy dashboardCalculations
 */

import { useQuery } from '@tanstack/react-query';
import { DataService } from '@/apogee-connect/services/dataService';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { useApiToggle } from '@/apogee-connect/contexts/ApiToggleContext';
import { computeStat, computeMultipleStats } from '../engine/computeStat';
import { LoadedData, DateRange, StatParams } from '../definitions/types';
import { logError, logWarn } from '@/lib/logger';

/**
 * Interface pour les résultats d'indicateurs
 */
export interface IndicateursData {
  // CA
  caJour: number;
  nbFacturesCA: number;
  caDevis: number;
  
  // Dossiers & RDV
  dossiersJour: number;
  rtJour: number;
  devisJour: number;
  
  // Taux
  tauxSAVGlobal: number;
  tauxSAVGlobalBreakdown?: { nbInterventionsInitiales: number; nbInterventionsSAV: number; nbDossiers: number };
  tauxTransformationDevis: { tauxTransformation: number; nbAcceptes: number; nbEnvoyes: number };
  
  // Délais
  delaiDossierFacture: { delaiMoyen: number; nbDossiers: number };
  delaiDossierPremierDevis: { delaiMoyen: number | null; mediane?: number | null; min?: number | null; max?: number | null; nbDossiers?: number };
  
  // Complexité
  dossiersComplexes: { tauxComplexite: number; nbComplexes: number; nbTotal: number };
  panierMoyen: { panierMoyen: number; nbDossiers: number };
  
  // Stats avancées
  nbMoyenInterventionsParDossier: { nbMoyen: number; totalInterventions: number; nbProjets: number };
  nbMoyenVisitesParIntervention: { nbMoyen: number; totalVisites: number; nbInterventions: number };
  tauxDossiersMultiUnivers: { tauxMultiUnivers: number; nbMultiUnivers: number; nbTotal: number };
  tauxDossiersSansDevis: { tauxSansDevis: number; nbSansDevis: number; nbFactures: number };
  tauxDossiersMultiTechniciens: { tauxMultiTech: number; nbMultiTech: number; nbTotal: number };
  polyvalenceTechniciens: { polyvalenceMoyenne: number; nbTechniciens: number; detailsTechs: any[] };
  
  // Mensuel
  monthlyCAData?: any[];
}

/**
 * Crée un service de données compatible StatIA à partir de DataService
 */
function createStatiaServices(isApiEnabled: boolean, agencySlug?: string) {
  return {
    getFactures: async () => {
      const data = await DataService.loadAllData(isApiEnabled, false, agencySlug);
      return data.factures || [];
    },
    getDevis: async () => {
      const data = await DataService.loadAllData(isApiEnabled, false, agencySlug);
      return data.devis || [];
    },
    getInterventions: async () => {
      const data = await DataService.loadAllData(isApiEnabled, false, agencySlug);
      return data.interventions || [];
    },
    getProjects: async () => {
      const data = await DataService.loadAllData(isApiEnabled, false, agencySlug);
      return data.projects || [];
    },
    getUsers: async () => {
      const data = await DataService.loadAllData(isApiEnabled, false, agencySlug);
      return data.users || [];
    },
    getClients: async () => {
      const data = await DataService.loadAllData(isApiEnabled, false, agencySlug);
      return data.clients || [];
    },
  };
}

/**
 * Hook principal pour les indicateurs via StatIA
 */
export function useStatiaIndicateurs(selectedYear?: number) {
  const { filters } = useFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();
  const userAgency = currentAgency?.id || '';

  return useQuery({
    queryKey: ['statia-indicateurs', filters, isApiEnabled, agencyChangeCounter, selectedYear],
    enabled: isAgencyReady && isApiEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async (): Promise<IndicateursData | null> => {
      if (!currentAgency?.id) {
        logWarn('STATIA', 'Agence non définie - Chargement annulé');
        return null;
      }

      // Charger toutes les données une seule fois
      const apiData = await DataService.loadAllData(isApiEnabled, false, userAgency);
      
      const loadedData: LoadedData = {
        factures: apiData.factures || [],
        devis: apiData.devis || [],
        interventions: apiData.interventions || [],
        projects: apiData.projects || [],
        users: apiData.users || [],
        clients: apiData.clients || [],
      };

      const params: StatParams = {
        dateRange: filters.dateRange,
        agencySlug: userAgency,
      };

      try {
        // Calculs StatIA
        const [
          caGlobal,
          tauxSav,
          tauxTransfoDevis,
          nbDevis,
          montantDevis,
          panierMoyen,
          dureeDossier,
          nbDossiers,
          dossiersComplexesStat,
          delaiPremierDevisStat,
        ] = await Promise.all([
          computeStatSafe('ca_global_ht', loadedData, params),
          computeStatSafe('taux_sav_global', loadedData, params), // Nouvelle formule: nb_SAV / nb_interventions_initiales
          computeStatSafe('taux_transformation_devis_nombre', loadedData, params),
          computeStatSafe('nombre_devis', loadedData, params),
          computeStatSafe('montant_devis', loadedData, params),
          computeStatSafe('panier_moyen', loadedData, params),
          computeStatSafe('duree_moyenne_dossier', loadedData, params),
          computeStatSafe('nb_dossiers_crees', loadedData, params),
          computeStatSafe('taux_dossiers_complexes', loadedData, params),
          computeStatSafe('delai_dossier_premier_devis', loadedData, params), // Utilise project.history "Devis envoyé"
        ]);

        // Calculs legacy pour les métriques non encore migrées
        const { 
          calculateDashboardStats,
          calculateDelaiMoyenDossierFacture, 
          calculateNbMoyenInterventionsParDossier,
          calculateNbMoyenVisitesParIntervention,
          calculateTauxDossiersMultiUnivers,
          calculateTauxDossiersSansDevis,
          calculateTauxDossiersMultiTechniciens,
          calculatePolyvalenceTechniciens,
        } = await import('@/apogee-connect/utils/dashboardCalculations');
        
        const legacyStats = calculateDashboardStats({
          projects: loadedData.projects,
          interventions: loadedData.interventions,
          factures: loadedData.factures,
          devis: loadedData.devis,
          clients: loadedData.clients,
          users: loadedData.users,
        }, filters.dateRange, userAgency);

        const delaiDossierFactureLegacy = calculateDelaiMoyenDossierFacture(
          loadedData.factures, loadedData.projects, undefined
        );
        
        const nbMoyenInterventionsParDossier = calculateNbMoyenInterventionsParDossier(
          loadedData.interventions, undefined
        );
        
        const nbMoyenVisitesParIntervention = calculateNbMoyenVisitesParIntervention(
          loadedData.interventions, undefined
        );
        
        const tauxDossiersMultiUnivers = calculateTauxDossiersMultiUnivers(
          loadedData.projects, undefined
        );
        
        const tauxDossiersSansDevis = calculateTauxDossiersSansDevis(
          loadedData.projects, loadedData.factures, loadedData.devis, undefined
        );
        
        const tauxDossiersMultiTechniciens = calculateTauxDossiersMultiTechniciens(
          loadedData.interventions, undefined
        );
        
        const polyvalenceTechniciens = calculatePolyvalenceTechniciens(
          loadedData.interventions, loadedData.projects, loadedData.users
        );

        return {
          // StatIA values
          caJour: caGlobal?.value as number ?? 0,
          nbFacturesCA: caGlobal?.breakdown?.factureCount ?? 0,
          tauxSAVGlobal: tauxSav?.value as number ?? 0,
          tauxSAVGlobalBreakdown: {
            nbInterventionsInitiales: tauxSav?.breakdown?.nbInterventionsInitiales ?? 0,
            nbInterventionsSAV: tauxSav?.breakdown?.nbInterventionsSAV ?? 0,
            nbDossiers: tauxSav?.breakdown?.nbDossiers ?? 0,
          },
          panierMoyen: {
            panierMoyen: panierMoyen?.value as number ?? 0,
            nbDossiers: panierMoyen?.breakdown?.factureCount ?? 0,
          },
          tauxTransformationDevis: {
            tauxTransformation: tauxTransfoDevis?.value as number ?? 0,
            nbAcceptes: tauxTransfoDevis?.breakdown?.devisTransformes ?? 0,
            nbEnvoyes: tauxTransfoDevis?.breakdown?.totalDevis ?? 0,
          },
          
          // Hybrid - some from StatIA, rest from legacy
          dossiersJour: nbDossiers?.value as number ?? legacyStats.dossiersJour ?? 0,
          devisJour: nbDevis?.value as number ?? legacyStats.devisJour ?? 0,
          caDevis: montantDevis?.value as number ?? legacyStats.caDevis ?? 0,
          
          // Legacy values (à migrer progressivement)
          rtJour: legacyStats.rtJour ?? 0,
          delaiDossierFacture: {
            delaiMoyen: dureeDossier?.value as number ?? delaiDossierFactureLegacy?.delaiMoyen ?? 0,
            nbDossiers: dureeDossier?.breakdown?.nbDossiers ?? delaiDossierFactureLegacy?.nbFactures ?? 0,
          },
          delaiDossierPremierDevis: {
            // IMPORTANT: null si aucune donnée, pas 0
            delaiMoyen: delaiPremierDevisStat?.value as number | null ?? null,
            mediane: delaiPremierDevisStat?.breakdown?.mediane ?? null,
            min: delaiPremierDevisStat?.breakdown?.min ?? null,
            max: delaiPremierDevisStat?.breakdown?.max ?? null,
            nbDossiers: delaiPremierDevisStat?.breakdown?.nbDossiersAvecDevis ?? 0,
          },
          dossiersComplexes: {
            tauxComplexite: dossiersComplexesStat?.value as number ?? 0,
            nbComplexes: dossiersComplexesStat?.breakdown?.nbComplexes ?? 0,
            nbTotal: dossiersComplexesStat?.breakdown?.nbTotal ?? 0,
          },
          nbMoyenInterventionsParDossier,
          nbMoyenVisitesParIntervention,
          tauxDossiersMultiUnivers,
          tauxDossiersSansDevis,
          tauxDossiersMultiTechniciens,
          polyvalenceTechniciens,
        };
      } catch (error) {
        logError('STATIA', 'Erreur calcul indicateurs', { error });
        throw error;
      }
    },
  });
}

/**
 * Helper pour appeler computeStat de manière safe
 */
async function computeStatSafe(
  statId: string,
  loadedData: LoadedData,
  params: StatParams
) {
  try {
    console.log('[StatIA] computeStatSafe called for:', statId);
    return await computeStat(statId, params, {
      getFactures: async () => loadedData.factures,
      getDevis: async () => loadedData.devis,
      getInterventions: async () => loadedData.interventions,
      getProjects: async () => loadedData.projects,
      getUsers: async () => loadedData.users,
      getClients: async () => loadedData.clients,
    }, { useCache: false }); // Disable cache for debugging
  } catch (error) {
    logError('STATIA', `Erreur calcul métrique ${statId}`, { error });
    return null;
  }
}

/**
 * Hook simplifié pour un seul KPI StatIA
 */
export function useStatiaKpi(metricId: string, dateRange?: DateRange) {
  const { isApiEnabled } = useApiToggle();
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useFilters();
  
  const effectiveDateRange = dateRange || filters.dateRange;

  return useQuery({
    queryKey: ['statia-kpi', metricId, effectiveDateRange, currentAgency?.id],
    enabled: isAgencyReady && isApiEnabled && !!metricId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      
      const apiData = await DataService.loadAllData(isApiEnabled, false, currentAgency?.id);
      
      const loadedData: LoadedData = {
        factures: apiData.factures || [],
        devis: apiData.devis || [],
        interventions: apiData.interventions || [],
        projects: apiData.projects || [],
        users: apiData.users || [],
        clients: apiData.clients || [],
      };

      const params: StatParams = {
        dateRange: effectiveDateRange,
        agencySlug: currentAgency.id,
      };

      return computeStatSafe(metricId, loadedData, params);
    },
  });
}
