import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    queryFn: async () => {
      if (!agencySlug) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role_agence, global_role, is_active")
        .eq("agence", agencySlug)
        .order("last_name", { ascending: true });
      
      if (error) throw error;
      return (data || []) as AgencyUser[];
    },
    enabled: !!agencySlug,
  });
}
