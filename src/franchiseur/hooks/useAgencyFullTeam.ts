/**
 * useAgencyFullTeam — Récupère l'équipe complète d'une agence :
 * - Profils (utilisateurs inscrits)  
 * - Collaborateurs non inscrits (salariés sans compte)
 * Déduplique par user_id pour éviter les doublons.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgencyTeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string | null;
  type: string | null;
  is_registered: boolean;
  is_active: boolean;
  global_role: string | null;
  /** Profile id if registered, null otherwise */
  profile_id: string | null;
  /** Collaborator id if exists */
  collaborator_id: string | null;
}

export function useAgencyFullTeam(agencyId: string | null) {
  return useQuery({
    queryKey: ["agency-full-team", agencyId],
    queryFn: async (): Promise<AgencyTeamMember[]> => {
      if (!agencyId) return [];

      // Fetch both in parallel
      const [profilesRes, collabsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role_agence, global_role, is_active")
          .eq("agency_id", agencyId)
          .order("last_name"),
        supabase
          .from("collaborators")
          .select("id, user_id, first_name, last_name, email, role, type, leaving_date, is_registered_user")
          .eq("agency_id", agencyId)
          .order("last_name"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (collabsRes.error) throw collabsRes.error;

      const profiles = profilesRes.data ?? [];
      const collaborators = collabsRes.data ?? [];

      // Set of profile IDs (registered users)
      const profileIds = new Set(profiles.map(p => p.id));
      // Set of collaborator user_ids already matched to a profile
      const matchedCollabUserIds = new Set<string>();

      const members: AgencyTeamMember[] = [];

      // 1) All profiles = registered users
      for (const p of profiles) {
        // Find linked collaborator for extra info (type)
        const linkedCollab = collaborators.find(c => c.user_id === p.id);
        if (linkedCollab?.user_id) matchedCollabUserIds.add(linkedCollab.user_id);

        members.push({
          id: p.id,
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          email: p.email,
          role: p.role_agence || linkedCollab?.role || null,
          type: linkedCollab?.type || null,
          is_registered: true,
          is_active: p.is_active !== false,
          global_role: p.global_role,
          profile_id: p.id,
          collaborator_id: linkedCollab?.id || null,
        });
      }

      // 2) Collaborators NOT linked to any profile = non-registered
      for (const c of collaborators) {
        if (c.user_id && matchedCollabUserIds.has(c.user_id)) continue;
        if (c.user_id && profileIds.has(c.user_id)) continue;

        members.push({
          id: c.id,
          first_name: c.first_name || "",
          last_name: c.last_name || "",
          email: c.email,
          role: c.role || null,
          type: c.type || null,
          is_registered: false,
          is_active: !c.leaving_date,
          global_role: null,
          profile_id: null,
          collaborator_id: c.id,
        });
      }

      // Sort: registered first, then alphabetical
      members.sort((a, b) => {
        if (a.is_registered !== b.is_registered) return a.is_registered ? -1 : 1;
        return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
      });

      return members;
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
  });
}
