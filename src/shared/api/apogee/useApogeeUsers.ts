import { useQuery } from "@tanstack/react-query";
import { apogeeProxy } from "@/services/apogeeProxy";
import type { ApogeeUser } from "@/shared/types/apogeePlanning";

export interface UseApogeeUsersOptions {
  agencySlug?: string;
}

export function useApogeeUsers(options: UseApogeeUsersOptions = {}) {
  const { agencySlug } = options;

  const { data, isLoading, error, refetch } = useQuery<ApogeeUser[]>({
    queryKey: ["apogee-users", agencySlug ?? "none"],
    queryFn: async () => {
      if (!agencySlug) return [];
      const result = await apogeeProxy.getUsers({ agencySlug });
      return (result || []) as ApogeeUser[];
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  return {
    users: data ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}
