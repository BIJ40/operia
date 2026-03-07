import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';

export interface AgencyAnimator {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  franchiseur_role?: string;
}

export interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
  date_ouverture: string | null;
  date_cloture_bilan: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  created_at: string;
  updated_at: string;
  animateurs: AgencyAnimator[];
}

const DEFAULT_AGENCIES: Agency[] = [];

/**
 * Dérive le rôle franchiseur depuis global_role
 * N3 = animateur, N4 = directeur, N5+ = dg
 */
function deriveFranchiseurRole(globalRole: GlobalRole | null): string {
  if (!globalRole) return 'animateur';
  const level = GLOBAL_ROLES[globalRole] ?? 0;
  if (level >= 5) return 'dg';
  if (level >= 4) return 'directeur';
  return 'animateur';
}

export function useAgencies() {
  return useQuery({
    queryKey: ['franchiseur-agencies'],
    queryFn: async (): Promise<Agency[]> => {
      interface AgencyRow {
        id: string;
        slug: string;
        label: string;
        is_active: boolean;
        date_ouverture: string | null;
        date_cloture_bilan: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        adresse: string | null;
        ville: string | null;
        code_postal: string | null;
        created_at: string;
        updated_at: string;
      }
      
      const agenciesResult = await safeQuery<AgencyRow[]>(
        supabase
          .from('apogee_agencies')
          .select('id, label, slug, is_active, contact_email, contact_phone, adresse, ville, code_postal, date_ouverture, date_cloture_bilan, created_at, updated_at')
          .order('label')
          .limit(500),
        'FRANCHISEUR_AGENCIES_LOAD'
      );

      if (!agenciesResult.success || !agenciesResult.data) {
        logError('useAgencies', 'Failed to load agencies', agenciesResult.error);
        return DEFAULT_AGENCIES;
      }

      const agencies = agenciesResult.data;

      // Fetch all agency assignments
      const assignmentsResult = await safeQuery<{ agency_id: string; user_id: string }[]>(
        supabase
          .from('franchiseur_agency_assignments')
          .select('agency_id, user_id'),
        'FRANCHISEUR_ASSIGNMENTS_LOAD'
      );

      interface ProfileRow {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        global_role: GlobalRole | null;
      }
      
      const assignments = assignmentsResult.data || [];
      const userIds = [...new Set(assignments.map(a => a.user_id))];
      
      let animatorProfiles: ProfileRow[] = [];
      
      if (userIds.length > 0) {
        const profilesResult = await safeQuery<ProfileRow[]>(
          supabase
            .from('profiles')
            .select('id, first_name, last_name, email, global_role')
            .in('id', userIds),
          'FRANCHISEUR_ANIMATOR_PROFILES_LOAD'
        );
        
        animatorProfiles = profilesResult.data || [];
      }

      // Merge data - each agency gets an array of animators
      const enrichedAgencies = agencies.map(agency => {
        const agencyAssignments = assignments.filter(a => a.agency_id === agency.id);
        const animateurs = agencyAssignments.map(assignment => {
          const profile = animatorProfiles.find(p => p.id === assignment.user_id);
          return profile ? {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            franchiseur_role: deriveFranchiseurRole(profile.global_role)
          } : null;
        }).filter(Boolean) as AgencyAnimator[];

        return {
          ...agency,
          animateurs,
        };
      });

      return enrichedAgencies as Agency[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAgency(agencyId: string | null) {
  return useQuery({
    queryKey: ['franchiseur-agency', agencyId],
    queryFn: async (): Promise<Agency | null> => {
      if (!agencyId) return null;
      
      interface AgencyRow {
        id: string;
        slug: string;
        label: string;
        is_active: boolean;
        date_ouverture: string | null;
        date_cloture_bilan: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        adresse: string | null;
        ville: string | null;
        code_postal: string | null;
        created_at: string;
        updated_at: string;
      }
      
      const agencyResult = await safeQuery<AgencyRow>(
        supabase
          .from('apogee_agencies')
          .select('*')
          .eq('id', agencyId)
          .maybeSingle(),
        'FRANCHISEUR_AGENCY_LOAD'
      );

      if (!agencyResult.success || !agencyResult.data) {
        logError('useAgency', 'Failed to load agency', agencyResult.error);
        return null;
      }

      const agency = agencyResult.data;

      // Fetch assignments for this agency
      const assignmentsResult = await safeQuery<{ user_id: string }[]>(
        supabase
          .from('franchiseur_agency_assignments')
          .select('user_id')
          .eq('agency_id', agencyId),
        'FRANCHISEUR_AGENCY_ASSIGNMENTS_LOAD'
      );

      const userIds = assignmentsResult.data?.map(a => a.user_id) || [];
      
      let animateurs: AgencyAnimator[] = [];
      
      interface ProfileRow {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        global_role: GlobalRole | null;
      }
      
      if (userIds.length > 0) {
        const profilesResult = await safeQuery<ProfileRow[]>(
          supabase
            .from('profiles')
            .select('id, first_name, last_name, email, global_role')
            .in('id', userIds),
          'FRANCHISEUR_AGENCY_ANIMATOR_PROFILES_LOAD'
        );
        
        animateurs = (profilesResult.data || []).map(profile => ({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          franchiseur_role: deriveFranchiseurRole(profile.global_role)
        }));
      }

      return {
        ...agency,
        animateurs,
      } as Agency;
    },
    enabled: !!agencyId,
  });
}
