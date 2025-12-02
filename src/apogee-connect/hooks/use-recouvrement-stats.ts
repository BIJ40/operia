import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { calculateRecouvrement, RecouvrementStats } from '@/apogee-connect/utils/recouvrementCalculations';
import { logApogee } from '@/lib/logger';

/**
 * Hook pour récupérer les statistiques de recouvrement
 * 
 * Utilise les filtres globaux (période, etc.) et charge les données depuis DataService
 * 
 * @param options - Options de configuration
 * @returns Query result avec les stats de recouvrement
 * 
 * @example
 * ```tsx
 * function RecouvrementTile() {
 *   const { data, isLoading, error } = useRecouvrementStats({ includeDetails: true });
 *   
 *   if (isLoading) return <div>Chargement...</div>;
 *   if (error) return <div>Erreur: {error.message}</div>;
 *   
 *   return (
 *     <div>
 *       <h3>Recouvrement</h3>
 *       <p>{formatEuros(data.recouvrement)}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRecouvrementStats(options: {
  includeDetails?: boolean;
  enabled?: boolean;
} = {}) {
  const { filters } = useFilters();
  const { isAgencyReady } = useAgency();

  return useQuery<RecouvrementStats>({
    queryKey: ['recouvrement-stats', filters.dateRange, options.includeDetails],
    queryFn: async () => {
      logApogee.debug('useRecouvrementStats - début calcul', {
        dateRange: filters.dateRange,
        includeDetails: options.includeDetails
      });

      try {
        // Charger toutes les données depuis l'API Apogée
        const allData = await DataService.loadAllData(true, false);

        if (!allData.factures || allData.factures.length === 0) {
          logApogee.warn('useRecouvrementStats - Aucune facture trouvée');
          return {
            totalFacturesTTC: 0,
            totalReglementsRecus: 0,
            recouvrement: 0,
            nbFactures: 0,
            details: options.includeDetails ? {
              facturesPositives: 0,
              avoirs: 0,
              facturesPayees: 0,
              facturesEnAttente: 0
            } : undefined
          };
        }

        // Calculer le recouvrement
        const stats = calculateRecouvrement(
          allData.factures,
          filters,
          {
            includeDetails: options.includeDetails
          }
        );

        logApogee.debug('useRecouvrementStats - résultat', stats);

        return stats;
      } catch (error) {
        logApogee.error('useRecouvrementStats - erreur', { error });
        throw error;
      }
    },
    enabled: isAgencyReady && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook pour récupérer le recouvrement par client
 * 
 * @returns Query result avec tableau de recouvrement par client
 */
export function useRecouvrementByClient(options: { enabled?: boolean } = {}) {
  const { filters } = useFilters();
  const { isAgencyReady } = useAgency();

  return useQuery({
    queryKey: ['recouvrement-by-client', filters.dateRange],
    queryFn: async () => {
      const allData = await DataService.loadAllData(true, false);
      const clientsMap = new Map(
        (allData.clients || []).map(c => [
          c.id,
          c.raisonSociale || `${c.prenom || ''} ${c.nom || ''}`.trim() || c.id
        ])
      );

      const { calculateRecouvrementByClient } = await import('@/apogee-connect/utils/recouvrementCalculations');
      return calculateRecouvrementByClient(allData.factures, filters, clientsMap);
    },
    enabled: isAgencyReady && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour récupérer le recouvrement par projet
 * 
 * @returns Query result avec tableau de recouvrement par projet
 */
export function useRecouvrementByProject(options: { enabled?: boolean } = {}) {
  const { filters } = useFilters();
  const { isAgencyReady } = useAgency();

  return useQuery({
    queryKey: ['recouvrement-by-project', filters.dateRange],
    queryFn: async () => {
      const allData = await DataService.loadAllData(true, false);
      const projectsMap = new Map(
        (allData.projects || []).map(p => [p.id, p.nom || p.id])
      );

      const { calculateRecouvrementByProject } = await import('@/apogee-connect/utils/recouvrementCalculations');
      return calculateRecouvrementByProject(allData.factures, filters, projectsMap);
    },
    enabled: isAgencyReady && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });
}
