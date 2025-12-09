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

export interface TopApporteurItem {
  name: string;
  ca: number;
  rank: number;
}

export interface EncoursApporteurItem {
  name: string;
  encours: number;
}

export interface TypeApporteurStats {
  type: string;
  caHT: number;
  nbDossiers: number;
  panierMoyen: number;
  tauxTransfo: number;
  tauxSav: number;
}

export interface SegmentationMensuelle {
  mois: string;
  apporteurs: number;
  particuliers: number;
}

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
  delaiMoyenPaiement: number;
  tauxFidelite: number;
  croissanceCA: number;
  hasDataN1: boolean;
  
  // Données détaillées pour les widgets
  caParApporteur: Record<string, number>;
  dossiersParApporteur: Record<string, number>;
  tauxTransfoParApporteur: Record<string, number>;
  
  // Top apporteurs triés
  topApporteurs: TopApporteurItem[];
  topEncours: EncoursApporteurItem[];
  
  // Par Type d'apporteur (pour cartes)
  statsByType: TypeApporteurStats[];
  
  // Segmentation mensuelle (Apporteurs vs Particuliers)
  segmentationMensuelle: SegmentationMensuelle[];
  caParticuliersTotal: number;
  caApporteursTotal: number;
  
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
  delaiMoyenPaiement: 0,
  tauxFidelite: 0,
  croissanceCA: 0,
  hasDataN1: false,
  caParApporteur: {},
  dossiersParApporteur: {},
  tauxTransfoParApporteur: {},
  topApporteurs: [],
  topEncours: [],
  statsByType: [],
  segmentationMensuelle: [],
  caParticuliersTotal: 0,
  caApporteursTotal: 0,
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
        panierMoyenResult,
        encoursParApporteurResult,
        // Par Type
        caParTypeResult,
        dossiersParTypeResult,
        panierParTypeResult,
        tauxTransfoParTypeResult,
        tauxSavParTypeResult,
        // Segmentation mensuelle
        caSegmenteResult,
        // V2: Nouvelles métriques apporteurs
        duGlobalApporteursResult,
        delaiPaiementResult,
        delaiDossierFactureResult,
      ] = await Promise.all([
        getMetricForAgency('ca_par_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('dossiers_par_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('taux_transformation_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('panier_moyen_par_type_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('encours_par_apporteur', agencySlug, { dateRange }, services),
        // Par Type d'apporteur
        getMetricForAgency('ca_par_type_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('dossiers_par_type_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('panier_moyen_par_type_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('taux_transfo_par_type_apporteur', agencySlug, { dateRange }, services),
        getMetricForAgency('taux_sav_par_type_apporteur', agencySlug, { dateRange }, services),
        // Segmentation
        getMetricForAgency('ca_mensuel_segmente', agencySlug, { dateRange }, services),
        // V2: Nouvelles métriques apporteurs (Dû TTC, Délai paiement, Délai dossier→facture)
        getMetricForAgency('apporteurs_du_global_ttc', agencySlug, { dateRange }, services),
        getMetricForAgency('apporteurs_delai_paiement_moyen', agencySlug, { dateRange }, services),
        getMetricForAgency('apporteurs_delai_dossier_facture', agencySlug, { dateRange }, services),
      ]);
      
      // Extraire les données par apporteur
      const caParApporteur = (caParApporteurResult.value || {}) as Record<string, number>;
      const dossiersParApporteur = (dossiersParApporteurResult.value || {}) as Record<string, number>;
      const tauxTransfoParApporteur = (tauxTransfoResult.value || {}) as Record<string, number>;
      
      // Extraire les données par TYPE d'apporteur
      const caByType = (caParTypeResult.value || {}) as Record<string, number>;
      const dossiersByType = (dossiersParTypeResult.value || {}) as Record<string, number>;
      const panierByType = (panierParTypeResult.value || {}) as Record<string, number>;
      const tauxTransfoByType = (tauxTransfoParTypeResult.value || {}) as Record<string, number>;
      const tauxSavByType = (tauxSavParTypeResult.value || {}) as Record<string, number>;
      
      // Construire statsByType
      const allTypes = new Set([
        ...Object.keys(caByType),
        ...Object.keys(dossiersByType),
      ]);
      
      const statsByType: TypeApporteurStats[] = Array.from(allTypes).map(type => ({
        type,
        caHT: caByType[type] || 0,
        nbDossiers: dossiersByType[type] || 0,
        panierMoyen: panierByType[type] || 0,
        tauxTransfo: tauxTransfoByType[type] || 0,
        tauxSav: tauxSavByType[type] || 0,
      })).sort((a, b) => b.caHT - a.caHT);
      
      // Extraire segmentation mensuelle
      const segmentationMensuelle = (caSegmenteResult.value || []) as SegmentationMensuelle[];
      const caParticuliersTotal = segmentationMensuelle.reduce((sum, m) => sum + (m.particuliers || 0), 0);
      const caApporteursTotal = segmentationMensuelle.reduce((sum, m) => sum + (m.apporteurs || 0), 0);
      
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
      
      // Top apporteurs triés par CA décroissant
      const topApporteurs: TopApporteurItem[] = Object.entries(caParApporteur)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, ca], idx) => ({ name, ca, rank: idx + 1 }));
      
      // Top encours par apporteur (factures impayées)
      const encoursParApporteur = (encoursParApporteurResult?.value || {}) as Record<string, number>;
      const topEncours: EncoursApporteurItem[] = Object.entries(encoursParApporteur)
        .filter(([, encours]) => encours > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, encours]) => ({ name, encours }));
      
      return {
        // V2: Dû Global TTC apporteurs (exclut factures sans apporteur, reste dû TTC)
        duGlobal: Number(duGlobalApporteursResult.value) || 0,
        dossiersConfiesTotal,
        tauxTransformationMoyen: Math.round(tauxTransformationMoyen * 10) / 10,
        panierMoyenHT: Math.round(panierMoyenHT * 100) / 100,
        // V2: Délai dossier→facture apporteurs
        delaiMoyenFacturation: Number(delaiDossierFactureResult.value) || 0,
        apporteursActifs,
        caMoyenParApporteur: Math.round(caMoyenParApporteur * 100) / 100,
        // V2: Délai paiement moyen apporteurs (factures payées uniquement)
        delaiMoyenPaiement: Number(delaiPaiementResult.value) || 0,
        tauxFidelite: 0, // TODO: métrique dédiée
        croissanceCA: 0, // TODO: métrique dédiée N-1
        hasDataN1: false,
        caParApporteur,
        dossiersParApporteur,
        tauxTransfoParApporteur,
        topApporteurs,
        topEncours,
        statsByType,
        segmentationMensuelle,
        caParticuliersTotal,
        caApporteursTotal,
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
