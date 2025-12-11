import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { calculateRecouvrement, RecouvrementStats } from '@/apogee-connect/utils/recouvrementCalculations';
import { logApogee } from '@/lib/logger';

import { apogeeProxy } from "@/services/apogeeProxy";

/**
 * Hook pour récupérer les statistiques de recouvrement
 * 
 * Utilise les filtres globaux (période, etc.) et charge les données depuis DataService
 * 
 * @param options - Options de configuration
 * @param options.agencySlug - Slug de l'agence cible (optionnel, utilise l'agence de l'utilisateur par défaut)
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
  agencySlug?: string;
} = {}) {
  const { filters } = useFilters();
  const { isAgencyReady, currentAgency } = useAgency();

  // CRITICAL: Si un agencySlug est explicitement fourni, l'utiliser prioritairement
  // Sinon utiliser l'agence courante de l'utilisateur
  const effectiveSlug = options.agencySlug || currentAgency?.slug;

  return useQuery<RecouvrementStats>({
    // CRITICAL: Inclure agencySlug dans la queryKey pour éviter le partage de cache entre agences
    queryKey: ['recouvrement-stats', options.agencySlug || 'user-default', effectiveSlug, filters.dateRange, options.includeDetails],
    queryFn: async () => {
      logApogee.debug('useRecouvrementStats - début calcul', {
        agencySlugParam: options.agencySlug,
        effectiveSlug,
        dateRange: filters.dateRange,
        includeDetails: options.includeDetails
      });

      try {
        let factures;
        
        // CRITICAL FIX: Si un agencySlug est EXPLICITEMENT fourni en paramètre,
        // TOUJOURS charger via le proxy pour cette agence spécifique
        // C'est le cas quand on affiche les stats d'une agence dans FranchiseurAgencyProfile
        if (options.agencySlug) {
          logApogee.debug('useRecouvrementStats - Chargement via PROXY pour agence spécifique', { 
            agencySlug: options.agencySlug 
          });
          factures = await apogeeProxy.getFactures({ agencySlug: options.agencySlug });
          logApogee.debug('useRecouvrementStats - factures chargées via proxy', {
            agencySlug: options.agencySlug,
            nbFactures: factures?.length || 0
          });
        } else {
          // Pas d'agencySlug fourni = utiliser DataService pour l'agence de l'utilisateur
          logApogee.debug('useRecouvrementStats - Chargement via DataService pour agence utilisateur');
          const allData = await DataService.loadAllData(true, false, effectiveSlug);
          factures = allData.factures;
        }

        if (!factures || factures.length === 0) {
          logApogee.warn('useRecouvrementStats - Aucune facture trouvée', { 
            agencySlugParam: options.agencySlug,
            effectiveSlug 
          });
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
          factures,
          filters,
          {
            includeDetails: options.includeDetails
          }
        );

        logApogee.debug('useRecouvrementStats - résultat', { 
          agencySlugParam: options.agencySlug,
          effectiveSlug, 
          stats 
        });

        return stats;
      } catch (error) {
        logApogee.error('useRecouvrementStats - erreur', { 
          error, 
          agencySlugParam: options.agencySlug,
          effectiveSlug 
        });
        throw error;
      }
    },
    // CRITICAL: Si agencySlug est fourni, ne pas attendre isAgencyReady
    enabled: (options.agencySlug ? true : isAgencyReady) && (options.enabled !== false),
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
  const { isAgencyReady, currentAgency } = useAgency();
  const agencySlug = currentAgency?.slug;

  return useQuery({
    queryKey: ['recouvrement-by-client', agencySlug, filters.dateRange],
    queryFn: async () => {
      const allData = await DataService.loadAllData(true, false, agencySlug);
      const clientsMap = new Map(
        (allData.clients || []).map(c => [
          c.id,
          c.raisonSociale || `${c.prenom || ''} ${c.nom || ''}`.trim() || c.id
        ])
      );

      const { calculateRecouvrementByClient } = await import('@/apogee-connect/utils/recouvrementCalculations');
      return calculateRecouvrementByClient(allData.factures, filters, clientsMap);
    },
    enabled: isAgencyReady && !!agencySlug && (options.enabled !== false),
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
  const { isAgencyReady, currentAgency } = useAgency();
  const agencySlug = currentAgency?.slug;

  return useQuery({
    queryKey: ['recouvrement-by-project', agencySlug, filters.dateRange],
    queryFn: async () => {
      const allData = await DataService.loadAllData(true, false, agencySlug);
      const projectsMap = new Map(
        (allData.projects || []).map(p => [p.id, p.nom || p.id])
      );

      const { calculateRecouvrementByProject } = await import('@/apogee-connect/utils/recouvrementCalculations');
      return calculateRecouvrementByProject(allData.factures, filters, projectsMap);
    },
    enabled: isAgencyReady && !!agencySlug && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });
}
