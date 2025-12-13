/**
 * Hook unifié pour les données planning
 * Gère les fallbacks et la normalisation
 */

import { useQuery } from "@tanstack/react-query";
import { apogeeProxy } from "@/services/apogeeProxy";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { normalizeCreneaux, unwrapArray, type NormalizedCreneau } from "@/shared/planning/normalize";

export function usePlanningData() {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.slug;

  const { data, isLoading, error } = useQuery<NormalizedCreneau[]>({
    queryKey: ["apogee-planning-data", agencySlug],
    enabled: isAgencyReady && !!agencySlug,
    queryFn: async () => {
      try {
        if (!agencySlug) return [];
        // Essayer d'abord getInterventionsCreneaux (endpoint confirmé)
        const result = await apogeeProxy.getInterventionsCreneaux({ agencySlug });
        const normalized = normalizeCreneaux(result);
        
        if (normalized.length > 0) {
          return normalized;
        }
        
        // Fallback simple: aucune autre source fiable pour l'instant
        return [];
      } catch (err) {
        console.error("[usePlanningData] Erreur:", err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    creneaux: data ?? [],
    loading: isLoading,
    error,
  };
}

export function useApogeeUsersNormalized() {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.slug;

  const { data, isLoading, error } = useQuery({
    queryKey: ["apogee-users-normalized", agencySlug],
    enabled: isAgencyReady && !!agencySlug,
    queryFn: async () => {
      if (!agencySlug) return [];
      const result = await apogeeProxy.getUsers({ agencySlug });
      return unwrapArray(result);
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    users: data ?? [],
    loading: isLoading,
    error,
  };
}
