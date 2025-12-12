/**
 * Hook unifié pour les données planning
 * Gère les fallbacks et la normalisation
 */

import { useQuery } from "@tanstack/react-query";
import { apogeeProxy } from "@/services/apogeeProxy";
import { normalizeCreneaux, unwrapArray, type NormalizedCreneau } from "@/shared/planning/normalize";

export function usePlanningData() {
  const { data, isLoading, error } = useQuery<NormalizedCreneau[]>({
    queryKey: ["apogee-planning-data"],
    queryFn: async () => {
      try {
        // Essayer d'abord getInterventionsCreneaux (endpoint confirmé)
        const result = await apogeeProxy.getInterventionsCreneaux();
        const normalized = normalizeCreneaux(result);
        
        if (normalized.length > 0) {
          return normalized;
        }
        
        // Fallback: essayer via autre méthode si disponible
        return [];
      } catch (err) {
        console.error("[usePlanningData] Erreur:", err);
        return [];
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["apogee-users-normalized"],
    queryFn: async () => {
      const result = await apogeeProxy.getUsers();
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
