/**
 * Hook unifié pour récupérer les membres de l'équipe (collaborateurs avec compte)
 * SOURCE DE VÉRITÉ: profiles (comptes utilisateurs)
 * 
 * Ce hook retourne des données au format Collaborator pour compatibilité
 * avec les composants existants (CollaboratorList, etc.)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHasMinLevel } from "@/hooks/useHasGlobalRole";
import { Collaborator, CollaboratorType } from "@/types/collaborator";

// Mapping from role_agence to CollaboratorType
function mapRoleToType(roleAgence: string | null, globalRole: string | null): CollaboratorType {
  // Priority to role_agence
  if (roleAgence) {
    const role = roleAgence.toLowerCase();
    if (role.includes("technicien") || role === "technicien") return "TECHNICIEN";
    if (role.includes("assistant") || role === "administratif") return "ADMINISTRATIF";
    if (role.includes("dirigeant") || role === "directeur" || role === "gérant") return "DIRIGEANT";
    if (role.includes("commercial")) return "COMMERCIAL";
  }
  
  // Fallback to global_role
  if (globalRole) {
    if (globalRole.includes("franchisee_admin") || globalRole === "franchisee_admin") return "DIRIGEANT";
    if (globalRole.includes("franchisee_user") || globalRole === "franchisee_user") return "TECHNICIEN";
  }
  
  return "AUTRE"; // Default
}

export interface TeamMemberStats {
  total: number;
  active: number;
  byType: Record<string, number>;
}

export function useAgencyTeamMembers(agencyId?: string) {
  const { agencyId: userAgencyId, agence } = useAuth();
  const canManage = useHasMinLevel(2); // N2+
  const effectiveAgencyId = agencyId || userAgencyId;

  const query = useQuery({
    queryKey: ["agency-team-members", effectiveAgencyId, agence],
    queryFn: async (): Promise<Collaborator[]> => {
      if (!effectiveAgencyId && !agence) return [];

      // Fetch profiles (source of truth for accounts)
      let profilesQuery = supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          role_agence,
          global_role,
          is_active,
          avatar_url,
          created_at,
          updated_at,
          agence,
          agency_id
        `)
        .order("last_name", { ascending: true });

      // Filter by agency
      if (effectiveAgencyId) {
        profilesQuery = profilesQuery.eq("agency_id", effectiveAgencyId);
      } else if (agence) {
        profilesQuery = profilesQuery.eq("agence", agence);
      }

      const { data: profiles, error } = await profilesQuery;
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      // Get linked collaborators for additional data (hiring_date, etc.)
      const userIds = profiles.map(p => p.id);
      const { data: collaborators } = await supabase
        .from("collaborators")
        .select("*")
        .in("user_id", userIds);

      // Build map user_id -> collaborator
      const collabMap = new Map<string, any>();
      collaborators?.forEach(c => {
        if (c.user_id) {
          collabMap.set(c.user_id, c);
        }
      });

      // Map profiles to Collaborator type
      return profiles.map((p): Collaborator => {
        const linkedCollab = collabMap.get(p.id);
        const type = mapRoleToType(p.role_agence, p.global_role);

        return {
          id: linkedCollab?.id || p.id, // Use collaborator id if exists, else profile id
          user_id: p.id,
          is_registered_user: true, // Always true - this hook returns only users with accounts
          agency_id: p.agency_id || effectiveAgencyId || "",
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          email: p.email,
          phone: p.phone,
          type,
          role: p.role_agence || type,
          notes: linkedCollab?.notes || null,
          hiring_date: linkedCollab?.hiring_date || null,
          leaving_date: linkedCollab?.leaving_date || null,
          address: linkedCollab?.street ? `${linkedCollab.street}, ${linkedCollab.postal_code} ${linkedCollab.city}` : null,
          street: linkedCollab?.street || null,
          postal_code: linkedCollab?.postal_code || null,
          city: linkedCollab?.city || null,
          birth_place: linkedCollab?.birth_place || null,
          apogee_user_id: linkedCollab?.apogee_user_id || null,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
          created_by: null,
        };
      });
    },
    enabled: !!(effectiveAgencyId || agence),
    staleTime: 2 * 60 * 1000,
  });

  // Compute stats
  const collaborators = query.data || [];
  const activeCollaborators = collaborators.filter(c => !c.leaving_date);
  const byType = collaborators.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    collaborators,
    activeCollaborators,
    byType,
    isLoading: query.isLoading,
    error: query.error,
    canManage,
    refetch: query.refetch,
  };
}
