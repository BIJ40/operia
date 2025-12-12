import { useQuery } from "@tanstack/react-query";
import { apogeeProxy } from "@/services/apogeeProxy";
import type { ApogeeUser } from "@/shared/types/apogeePlanning";

export function useApogeeUsers() {
  const { data, isLoading, error } = useQuery<ApogeeUser[]>({
    queryKey: ["apogee-users"],
    queryFn: async () => {
      const result = await apogeeProxy.getUsers();
      return (result || []) as ApogeeUser[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    users: data ?? [],
    loading: isLoading,
    error,
  };
}
