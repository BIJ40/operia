import { useQuery } from "@tanstack/react-query";
import { listProfilesByAgency, type ProfileRow } from "@/repositories/profileRepository";
import { agencyRepo } from "@/repositories";

export interface AgencyUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role_agence: string | null;
  global_role: string | null;
  is_active: boolean | null;
}

export function useAgencyUsers(agencySlug: string | null) {
  return useQuery({
    queryKey: ["agency-users", agencySlug],
    queryFn: async (): Promise<AgencyUser[]> => {
      if (!agencySlug) return [];
      
      // Resolve slug → agency ID, then fetch profiles
      const agency = await agencyRepo.getAgencyBySlug(agencySlug);
      if (!agency) return [];
      
      const profiles = await listProfilesByAgency(agency.id);
      return profiles.map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        role_agence: p.role_agence,
        global_role: p.global_role,
        is_active: true, // profiles don't have is_active in select
      }));
    },
    enabled: !!agencySlug,
  });
}
