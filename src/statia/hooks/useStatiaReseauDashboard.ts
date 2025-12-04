/**
 * StatIA V2 - Hook pour le Dashboard Réseau Franchiseur
 * API unifiée pour consommer les métriques StatIA du dashboard réseau
 */

import { useQuery } from '@tanstack/react-query';
import { useFranchiseur } from '@/franchiseur/contexts/FranchiseurContext';
import { useNetworkFilters } from '@/franchiseur/contexts/NetworkFiltersContext';
import { computeReseauDashboard, ReseauDashboardData } from '../engines/reseauDashboardEngine';
import { startOfYear, endOfYear } from 'date-fns';
import { logNetwork } from '@/lib/logger';

export interface UseStatiaReseauDashboardParams {
  periode?: 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'year' | 'custom';
  dateStart?: Date;
  dateEnd?: Date;
  scopeAgences?: string[];
}

export interface UseStatiaReseauDashboardResult {
  isLoading: boolean;
  error: Error | null;
  data: ReseauDashboardData | null;
}

const DEFAULT_DATA: ReseauDashboardData = {
  tuilesHautes: {
    caAnneeEnCours: 0,
    caPeriode: 0,
    dossiersPeriode: 0,
    interventionsPeriode: 0,
    redevancesMois: 0,
    delaiMoyenTraitement: 0,
    tauxOneShot: 0,
    delaiDossierDevis: 0,
    visitesParDossier: 0,
    tauxMultiUnivers: 0,
  },
  blocSav: {
    tauxSavGlobalReseau: 0,
    nbSavGlobal: 0,
    nbDossiersBaseSav: 0,
    tauxSavMoyenAgences: 0,
    serieTauxSavMensuel: [],
  },
  blocCA: {
    serieCAMensuel: [],
    partCAParAgence: [],
    top5AgencesCA: [],
  },
  blocApporteurs: {
    top3ApporteursCA: [],
  },
};

/**
 * Hook principal pour le dashboard réseau
 * Utilise les contextes FranchiseurContext et NetworkFiltersContext
 */
export function useStatiaReseauDashboard(params?: UseStatiaReseauDashboardParams): UseStatiaReseauDashboardResult {
  const { franchiseurRole, selectedAgencies } = useFranchiseur();
  const { dateRange } = useNetworkFilters();
  
  // Déterminer les dates effectives
  const now = new Date();
  const effectiveDateStart = params?.dateStart || dateRange?.from || startOfYear(now);
  const effectiveDateEnd = params?.dateEnd || dateRange?.to || endOfYear(now);
  const effectiveScopeAgences = params?.scopeAgences || selectedAgencies;
  
  console.log('[useStatiaReseauDashboard] Params:', {
    selectedAgencies,
    selectedAgenciesLength: selectedAgencies.length,
    effectiveScopeAgences,
    effectiveScopeAgencesLength: effectiveScopeAgences.length,
    willPassUndefined: effectiveScopeAgences.length === 0,
    dateRange,
  });
  
  const query = useQuery<ReseauDashboardData>({
    queryKey: [
      'statia-reseau-dashboard',
      effectiveDateStart.toISOString(),
      effectiveDateEnd.toISOString(),
      effectiveScopeAgences.join(','),
    ],
    queryFn: async () => {
      logNetwork.info('[useStatiaReseauDashboard] Chargement des métriques StatIA...');
      
      try {
        const result = await computeReseauDashboard({
          dateStart: effectiveDateStart,
          dateEnd: effectiveDateEnd,
          scopeAgences: effectiveScopeAgences.length > 0 ? effectiveScopeAgences : undefined,
        });
        
        logNetwork.info('[useStatiaReseauDashboard] Métriques chargées avec succès');
        return result;
      } catch (err) {
        logNetwork.error('[useStatiaReseauDashboard] Erreur chargement métriques', err);
        return DEFAULT_DATA;
      }
    },
    enabled: !!franchiseurRole,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    isLoading: query.isLoading,
    error: query.error as Error | null,
    data: query.data || DEFAULT_DATA,
  };
}

// Re-export types for consumers
export type { ReseauDashboardData };
