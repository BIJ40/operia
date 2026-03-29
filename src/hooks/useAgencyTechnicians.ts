/**
 * Hook unifié pour récupérer les techniciens/collaborateurs d'une agence
 * SOURCE DE VÉRITÉ: profiles (comptes utilisateurs)
 * 
 * Règle métier : seuls les utilisateurs avec un compte (profil) apparaissent
 * dans les listes EPI, RH, etc.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgencyTechnician {
  id: string;  // profile.id = user id
  first_name: string;
  last_name: string;
  email: string | null;
  role_agence: string | null;
  global_role: string | null;
  is_active: boolean;
  // Optional collaborator link
  collaborator_id?: string;
}

interface UseAgencyTechniciansOptions {
  agencyId?: string;
  agencySlug?: string;
  includeInactive?: boolean;
}

export function useAgencyTechnicians(options: UseAgencyTechniciansOptions) {
  const { agencyId, agencySlug, includeInactive = false } = options;

  return useQuery({
    queryKey: ["agency-technicians", agencyId, agencySlug, includeInactive],
    queryFn: async (): Promise<AgencyTechnician[]> => {
      // Build query on profiles
      let query = supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          email,
          role_agence,
          global_role,
          is_active,
          agency_id
        `)
        .order("last_name", { ascending: true });

      // Filter by agency (slug or id)
      if (agencySlug) {
        // Resolve slug to id first
        const { data: ag } = await supabase.from('apogee_agencies').select('id').eq('slug', agencySlug).single();
        if (ag) query = query.eq("agency_id", ag.id);
        else return [];
      } else if (agencyId) {
        query = query.eq("agency_id", agencyId);
      } else {
        return [];
      }

      // Filter active if requested
      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        return [];
      }

      // Get collaborator links for these profiles
      const userIds = profiles.map(p => p.id);
      const { data: collaborators } = await supabase
        .from("collaborators")
        .select("id, user_id")
        .in("user_id", userIds);

      // Build collaborator map
      const collabMap = new Map<string, string>();
      collaborators?.forEach(c => {
        if (c.user_id) {
          collabMap.set(c.user_id, c.id);
        }
      });

      // Map profiles to technicians
      return profiles.map(p => ({
        id: p.id,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        email: p.email,
        role_agence: p.role_agence,
        global_role: p.global_role,
        is_active: p.is_active ?? true,
        collaborator_id: collabMap.get(p.id),
      }));
    },
    enabled: !!(agencyId || agencySlug),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
