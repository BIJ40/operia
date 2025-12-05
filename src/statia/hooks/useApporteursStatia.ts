/**
 * StatIA - Hook pour les KPIs de la page Apporteurs
 * Remplace les calculs legacy par des appels StatIA
 */

import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { useSecondaryFilters } from '@/apogee-connect/contexts/SecondaryFiltersContext';
import { getGlobalApogeeDataServices } from '../adapters/dataServiceAdapter';
import { getMetricForAgency } from '../api/getMetricForAgency';
import { StatResult } from '../definitions/types';
import { logApogee } from '@/lib/logger';

export interface ApporteursKPIs {
  // KPIs principaux
  duGlobal: number;
  dossiersConfiesTotal: number;
  tauxTransformationMoyen: number;
  panierMoyenHT: number;
  delaiMoyenFacturation: number;
  
  // KPIs secondaires
  apporteursActifs: number;
  caMoyenParApporteur: number;
  
  // Données détaillées pour les widgets
  caParApporteur: Record<string, number>;
  dossiersParApporteur: Record<string, number>;
  tauxTransfoParApporteur: Record<string, number>;
  
  // Breakdown utiles
  caTotal: number;
}

const DEFAULT_KPIS: ApporteursKPIs = {
  duGlobal: 0,
  dossiersConfiesTotal: 0,
  tauxTransformationMoyen: 0,
  panierMoyenHT: 0,
  delaiMoyenFacturation: 0,
  apporteursActifs: 0,
  caMoyenParApporteur: 0,
  caParApporteur: {},
  dossiersParApporteur: {},
  tauxTransfoParApporteur: {},
  caTotal: 0,
};

/**
 * Hook principal pour les KPIs apporteurs via StatIA
 */
export function useApporteursStatia() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters: secondaryFilters } = useSecondaryFilters();
  
  const agencySlug = currentAgency?.id || '';
  const dateRange = secondaryFilters.dateRange;
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: [
      'statia-apporteurs-kpis', 
      agencySlug, 
      dateRange?.start?.toISOString(), 
      dateRange?.end?.toISOString()
    ],
    queryFn: async (): Promise<ApporteursKPIs> => {
      if (!agencySlug || !dateRange) {
        throw new Error('Agency slug ou dateRange manquant');
      }
      
      logApogee.debug('[StatIA] Calcul KPIs apporteurs pour', agencySlug);
      
      // Appels parallèles aux métriques StatIA
      const [
        caParApporteurResult,
        dossiersParApporteurResult,
        tauxTransfoResult,
        montantRestantResult,
        panierMoyenResult,
      ] = await Promise.all([
        getMetricForAgency('ca_par_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('dossiers_par_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('taux_transformation_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('montant_restant', agencySlug, { dateRange }, services),
        getMetricForAgency('panier_moyen_par_type_apporteur', agencySlug, { dateRange }, services),
      ]);
      
      // Extraire les données
      const caParApporteur = (caParApporteurResult.value || {}) as Record<string, number>;
      const dossiersParApporteur = (dossiersParApporteurResult.value || {}) as Record<string, number>;
      const tauxTransfoParApporteur = (tauxTransfoResult.value || {}) as Record<string, number>;
      
      // Calculs dérivés
      const apporteurNames = Object.keys(caParApporteur);
      const apporteursActifs = apporteurNames.length;
      
      const caTotal = Object.values(caParApporteur).reduce((sum, ca) => sum + ca, 0);
      const caMoyenParApporteur = apporteursActifs > 0 ? caTotal / apporteursActifs : 0;
      
      const dossiersConfiesTotal = Object.values(dossiersParApporteur).reduce((sum, nb) => sum + nb, 0);
      
      // Taux transformation moyen (moyenne des taux)
      const tauxValues = Object.values(tauxTransfoParApporteur);
      const tauxTransformationMoyen = tauxValues.length > 0 
        ? tauxValues.reduce((sum, t) => sum + t, 0) / tauxValues.length 
        : 0;
      
      // Panier moyen : moyenne des paniers par type
      const panierValues = Object.values((panierMoyenResult.value || {}) as Record<string, number>);
      const panierMoyenHT = panierValues.length > 0
        ? panierValues.reduce((sum, p) => sum + p, 0) / panierValues.length
        : (dossiersConfiesTotal > 0 ? caTotal / dossiersConfiesTotal : 0);
      
      return {
        duGlobal: Number(montantRestantResult.value) || 0,
        dossiersConfiesTotal,
        tauxTransformationMoyen: Math.round(tauxTransformationMoyen * 10) / 10,
        panierMoyenHT: Math.round(panierMoyenHT * 100) / 100,
        delaiMoyenFacturation: 0, // TODO: ajouter métrique délai facturation
        apporteursActifs,
        caMoyenParApporteur: Math.round(caMoyenParApporteur * 100) / 100,
        caParApporteur,
        dossiersParApporteur,
        tauxTransfoParApporteur,
        caTotal,
      };
    },
    enabled: isAgencyReady && !!agencySlug && !!dateRange,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour le CA par apporteur uniquement
 */
export function useStatiaCAParApporteur() {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters: secondaryFilters } = useSecondaryFilters();
  
  const agencySlug = currentAgency?.id || '';
  const dateRange = secondaryFilters.dateRange;
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ['statia-ca-par-apporteur', agencySlug, dateRange?.start?.toISOString()],
    queryFn: async (): Promise<StatResult> => {
      if (!agencySlug || !dateRange) {
        throw new Error('Agency slug ou dateRange manquant');
      }
      return getMetricForAgency('ca_par_apporteur', agencySlug, { dateRange }, services);
    },
    enabled: isAgencyReady && !!agencySlug && !!dateRange,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour le Top apporteurs (CA décroissant)
 */
export function useStatiaTopApporteurs(topN: number = 10) {
  const { currentAgency, isAgencyReady } = useAgency();
  const { filters: secondaryFilters } = useSecondaryFilters();
  
  const agencySlug = currentAgency?.id || '';
  const dateRange = secondaryFilters.dateRange;
  const services = getGlobalApogeeDataServices();

  return useQuery({
    queryKey: ['statia-top-apporteurs', agencySlug, dateRange?.start?.toISOString(), topN],
    queryFn: async (): Promise<Array<{ name: string; ca: number }>> => {
      if (!agencySlug || !dateRange) {
        throw new Error('Agency slug ou dateRange manquant');
      }
      
      const result = await getMetricForAgency('ca_par_apporteur', agencySlug, { dateRange }, services);
      const caByApporteur = (result.value || {}) as Record<string, number>;
      
      // Trier par CA décroissant et prendre les top N
      return Object.entries(caByApporteur)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([name, ca]) => ({ name, ca }));
    },
    enabled: isAgencyReady && !!agencySlug && !!dateRange,
    staleTime: 5 * 60 * 1000,
  });
}
