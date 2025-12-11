/**
 * StatIA V2 - Hook pour FranchiseurStats (Tableaux)
 * Remplace les calculs legacy par StatIA tout en conservant les matrices
 */

import { useQuery } from '@tanstack/react-query';
import { useAgencies } from './useAgencies';
import { useFranchiseur } from '../contexts/FranchiseurContext';
import { useNetworkFilters } from '../contexts/NetworkFiltersContext';
import { NetworkDataService } from '../services/networkDataService';
import { aggregateUniversApporteurMatrix } from '../utils/networkCalculations';
import { aggregateTechUniversStatsMultiAgency, type TechUniversStats } from '@/shared/utils/technicienUniversEngine';
import { logNetwork, logError } from '@/lib/logger';

interface FranchiseurStatsData {
  universApporteurMatrix: Record<string, Record<string, { ca: number; nbDossiers: number }>>;
  technicienStats: TechUniversStats[];
  agenciesLoaded: number;
  agenciesTotal: number;
}

const DEFAULT_DATA: FranchiseurStatsData = {
  universApporteurMatrix: {},
  technicienStats: [],
  agenciesLoaded: 0,
  agenciesTotal: 0,
};

export function useFranchiseurStatsStatia() {
  const { data: agencies, isLoading: isLoadingAgencies } = useAgencies();
  const { selectedAgencies, isLoading: isLoadingContext } = useFranchiseur();
  const { dateRange } = useNetworkFilters();

  // Déterminer les agences à charger
  const agenciesToLoad = agencies?.filter(a => {
    if (!a.is_active) return false;
    if (selectedAgencies.length === 0) return true;
    return selectedAgencies.includes(a.id);
  }) || [];

  const query = useQuery<FranchiseurStatsData>({
    queryKey: [
      'statia-franchiseur-stats-matrices',
      agenciesToLoad.map(a => a.slug).join(','),
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
    ],
    queryFn: async () => {
      if (agenciesToLoad.length === 0) {
        return DEFAULT_DATA;
      }

      logNetwork.info(`[StatIA] FranchiseurStats - Chargement de ${agenciesToLoad.length} agences...`);

      try {
        // Charger les données de toutes les agences séquentiellement
        const agencySlugs = agenciesToLoad.map(a => a.slug);
        const agencyDataResults = await NetworkDataService.loadMultiAgencyData(agencySlugs, dateRange);

        // Enrichir avec les labels
        const enrichedData = agencyDataResults.map(result => ({
          ...result,
          agencyLabel: agencies?.find(a => a.slug === result.agencyId)?.label || result.agencyId,
        }));

        // Calculer la matrice Univers × Apporteurs
        const universApporteurMatrix = aggregateUniversApporteurMatrix(
          enrichedData,
          { start: dateRange.from, end: dateRange.to }
        );

        // Calculer les stats Technicien × Univers via le moteur unifié
        const agenciesDataForStats = enrichedData
          .filter(agency => agency.data?.factures && agency.data?.projects && agency.data?.interventions && agency.data?.users)
          .map(agency => ({
            factures: agency.data.factures,
            projects: agency.data.projects,
            interventions: agency.data.interventions,
            users: agency.data.users,
            agenceSlug: agency.agencyId,
            agenceLabel: agency.agencyLabel,
          }));

        const technicienStats = aggregateTechUniversStatsMultiAgency(
          agenciesDataForStats,
          { start: dateRange.from, end: dateRange.to }
        );

        logNetwork.info(`[StatIA] FranchiseurStats - ${enrichedData.length}/${agenciesToLoad.length} agences chargées`);

        return {
          universApporteurMatrix,
          technicienStats,
          agenciesLoaded: enrichedData.length,
          agenciesTotal: agenciesToLoad.length,
        };
      } catch (err) {
        logError('[StatIA] FranchiseurStats - Erreur', err);
        return DEFAULT_DATA;
      }
    },
    enabled: !isLoadingAgencies && !isLoadingContext && agenciesToLoad.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data || DEFAULT_DATA,
    isLoading: isLoadingAgencies || isLoadingContext || query.isLoading,
    error: query.error as Error | null,
    agenciesToLoad,
  };
}
