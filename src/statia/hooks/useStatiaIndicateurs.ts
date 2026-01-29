/**
 * StatIA - Hook pour les indicateurs agence
 * P1a: 100% StatIA - AUCUN fallback legacy
 */

import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { useApiToggle } from '@/apogee-connect/contexts/ApiToggleContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { logError, logWarn } from '@/lib/logger';
import { DateRange } from '../definitions/types';

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
 * Hook principal pour les indicateurs via StatIA - 100% StatIA
 */
export function useStatiaIndicateurs(selectedYear?: number) {
  const { filters } = useFilters();
  const { isApiEnabled } = useApiToggle();
  const { agencyChangeCounter, currentAgency, isAgencyReady } = useAgency();
  const userAgency = currentAgency?.id || '';
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ['statia-indicateurs', filters, isApiEnabled, agencyChangeCounter, selectedYear],
    enabled: isAgencyReady && isApiEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async (): Promise<IndicateursData | null> => {
      if (!currentAgency?.id) {
        logWarn('STATIA', 'Agence non définie - Chargement annulé');
        return null;
      }

      const statiaParams = { dateRange: filters.dateRange };

      try {
        // === 100% STATIA - Toutes métriques ===
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
          nbInterventions,
        ] = await Promise.all([
          getMetricForAgency('ca_global_ht', userAgency, statiaParams, services),
          getMetricForAgency('taux_sav_global', userAgency, statiaParams, services),
          getMetricForAgency('taux_transformation_devis_nombre', userAgency, statiaParams, services),
          getMetricForAgency('nombre_devis', userAgency, statiaParams, services),
          getMetricForAgency('montant_devis', userAgency, statiaParams, services),
          getMetricForAgency('panier_moyen', userAgency, statiaParams, services),
          getMetricForAgency('duree_moyenne_dossier', userAgency, statiaParams, services),
          getMetricForAgency('nb_dossiers_crees', userAgency, statiaParams, services),
          getMetricForAgency('taux_dossiers_complexes', userAgency, statiaParams, services),
          getMetricForAgency('delai_dossier_premier_devis', userAgency, statiaParams, services),
          getMetricForAgency('nb_interventions', userAgency, statiaParams, services),
        ]);

        // Extraction des breakdowns
        const complexeBreakdown = dossiersComplexesStat.breakdown as any || {};
        const interventionsBreakdown = nbInterventions.breakdown as any || {};

        return {
          // CA
          caJour: caGlobal?.value as number ?? 0,
          nbFacturesCA: (caGlobal?.breakdown as any)?.factureCount ?? 0,
          caDevis: montantDevis?.value as number ?? 0,
          
          // Dossiers & RDV  
          dossiersJour: nbDossiers?.value as number ?? 0,
          rtJour: interventionsBreakdown?.byType?.rt ?? 0,
          devisJour: nbDevis?.value as number ?? 0,
          
          // Taux
          tauxSAVGlobal: tauxSav?.value as number ?? 0,
          tauxSAVGlobalBreakdown: {
            nbInterventionsInitiales: (tauxSav?.breakdown as any)?.nbInterventionsInitiales ?? 0,
            nbInterventionsSAV: (tauxSav?.breakdown as any)?.nbInterventionsSAV ?? 0,
            nbDossiers: (tauxSav?.breakdown as any)?.nbDossiers ?? 0,
          },
          panierMoyen: {
            panierMoyen: panierMoyen?.value as number ?? 0,
            nbDossiers: (panierMoyen?.breakdown as any)?.factureCount ?? 0,
          },
          tauxTransformationDevis: {
            tauxTransformation: tauxTransfoDevis?.value as number ?? 0,
            nbAcceptes: (tauxTransfoDevis?.breakdown as any)?.devisTransformes ?? 0,
            nbEnvoyes: (tauxTransfoDevis?.breakdown as any)?.totalDevis ?? 0,
          },
          
          // Délais
          delaiDossierFacture: {
            delaiMoyen: dureeDossier?.value as number ?? 0,
            nbDossiers: (dureeDossier?.breakdown as any)?.nbDossiers ?? 0,
          },
          delaiDossierPremierDevis: {
            delaiMoyen: delaiPremierDevisStat?.value as number | null ?? null,
            mediane: (delaiPremierDevisStat?.breakdown as any)?.mediane ?? null,
            min: (delaiPremierDevisStat?.breakdown as any)?.min ?? null,
            max: (delaiPremierDevisStat?.breakdown as any)?.max ?? null,
            nbDossiers: (delaiPremierDevisStat?.breakdown as any)?.nbDossiersAvecDevis ?? 0,
          },
          
          // Complexité - tout via StatIA breakdown
          dossiersComplexes: {
            tauxComplexite: dossiersComplexesStat?.value as number ?? 0,
            nbComplexes: complexeBreakdown?.nbComplexes ?? 0,
            nbTotal: complexeBreakdown?.nbTotal ?? 0,
          },
          nbMoyenInterventionsParDossier: {
            nbMoyen: complexeBreakdown?.avgInterventions ?? 0,
            totalInterventions: interventionsBreakdown?.total ?? 0,
            nbProjets: nbDossiers?.value as number ?? 0,
          },
          nbMoyenVisitesParIntervention: {
            nbMoyen: complexeBreakdown?.avgVisites ?? 0,
            totalVisites: interventionsBreakdown?.totalVisites ?? 0,
            nbInterventions: nbInterventions?.value as number ?? 0,
          },
          tauxDossiersMultiUnivers: {
            tauxMultiUnivers: complexeBreakdown?.tauxMultiUnivers ?? 0,
            nbMultiUnivers: complexeBreakdown?.nbMultiUnivers ?? 0,
            nbTotal: complexeBreakdown?.nbTotal ?? 0,
          },
          tauxDossiersSansDevis: {
            tauxSansDevis: complexeBreakdown?.tauxSansDevis ?? 0,
            nbSansDevis: complexeBreakdown?.nbSansDevis ?? 0,
            nbFactures: (caGlobal?.breakdown as any)?.factureCount ?? 0,
          },
          tauxDossiersMultiTechniciens: {
            tauxMultiTech: complexeBreakdown?.tauxMultiTech ?? 0,
            nbMultiTech: complexeBreakdown?.nbMultiTech ?? 0,
            nbTotal: complexeBreakdown?.nbTotal ?? 0,
          },
          polyvalenceTechniciens: {
            polyvalenceMoyenne: 0, // À implémenter dans StatIA si nécessaire
            nbTechniciens: 0,
            detailsTechs: [],
          },
        };
      } catch (error) {
        logError('STATIA', 'Erreur calcul indicateurs', { error });
        throw error;
      }
    },
  });
}

/**
 * Hook simplifié pour un seul KPI StatIA
 */
export function useStatiaKpi(metricId: string, dateRange?: DateRange) {
  const { isApiEnabled } = useApiToggle();
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters } = useFilters();
  const services = getGlobalApogeeDataServices();
  
  const effectiveDateRange = dateRange || filters.dateRange;

  return useQuery({
    queryKey: ['statia-kpi', metricId, effectiveDateRange, currentAgency?.id],
    enabled: isAgencyReady && isApiEnabled && !!metricId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      
      return getMetricForAgency(metricId, currentAgency.id, { dateRange: effectiveDateRange }, services);
    },
  });
}
