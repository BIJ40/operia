import { useQuery } from "@tanstack/react-query";
import { apogeeProxy } from "@/services/apogeeProxy";
import type { PlanningCreneau } from "@/shared/types/apogeePlanning";

export function usePlanningCreneaux() {
  const { data, isLoading, error } = useQuery<PlanningCreneau[]>({
    queryKey: ["apogee-planning-creneaux"],
    queryFn: async () => {
      // Utiliser getInterventionsCreneaux (seul endpoint disponible)
      const result = await apogeeProxy.getInterventionsCreneaux();
      return (result || []) as PlanningCreneau[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    creneaux: data ?? [],
    loading: isLoading,
    error,
  };
}
