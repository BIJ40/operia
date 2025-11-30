import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';

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

export function useAgencies() {
  return useQuery({
    queryKey: ['franchiseur-agencies'],
    queryFn: async (): Promise<Agency[]> => {
      const agenciesResult = await safeQuery<any[]>(
        supabase
          .from('apogee_agencies')
          .select('*')
          .order('label'),
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

      const assignments = assignmentsResult.data || [];
      const userIds = [...new Set(assignments.map(a => a.user_id))];
      
      let animatorProfiles: any[] = [];
      let franchiseurRoles: any[] = [];
      
      if (userIds.length > 0) {
        const [profilesResult, rolesResult] = await Promise.all([
          safeQuery<any[]>(
            supabase
              .from('profiles')
              .select('id, first_name, last_name, email')
              .in('id', userIds),
            'FRANCHISEUR_ANIMATOR_PROFILES_LOAD'
          ),
          safeQuery<any[]>(
            supabase
              .from('franchiseur_roles')
              .select('user_id, franchiseur_role')
              .in('id', userIds),
            'FRANCHISEUR_ANIMATOR_ROLES_LOAD'
          )
        ]);
        
        animatorProfiles = profilesResult.data || [];
        franchiseurRoles = rolesResult.data || [];
      }

      // Merge data - each agency gets an array of animators
      const enrichedAgencies = agencies.map(agency => {
        const agencyAssignments = assignments.filter(a => a.agency_id === agency.id);
        const animateurs = agencyAssignments.map(assignment => {
          const profile = animatorProfiles.find(p => p.id === assignment.user_id);
          const role = franchiseurRoles.find(r => r.user_id === assignment.user_id);
          return profile ? {
            ...profile,
            franchiseur_role: role?.franchiseur_role || 'animateur'
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
      
      const agencyResult = await safeQuery<any>(
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
      
      if (userIds.length > 0) {
        const [profilesResult, rolesResult] = await Promise.all([
          safeQuery<any[]>(
            supabase
              .from('profiles')
              .select('id, first_name, last_name, email')
              .in('id', userIds),
            'FRANCHISEUR_AGENCY_ANIMATOR_PROFILES_LOAD'
          ),
          safeQuery<any[]>(
            supabase
              .from('franchiseur_roles')
              .select('user_id, franchiseur_role')
              .in('user_id', userIds),
            'FRANCHISEUR_AGENCY_ANIMATOR_ROLES_LOAD'
          )
        ]);
        
        animateurs = (profilesResult.data || []).map(profile => {
          const role = rolesResult.data?.find(r => r.user_id === profile.id);
          return {
            ...profile,
            franchiseur_role: role?.franchiseur_role || 'animateur'
          };
        });
      }

      return {
        ...agency,
        animateurs,
      } as Agency;
    },
    enabled: !!agencyId,
  });
}
