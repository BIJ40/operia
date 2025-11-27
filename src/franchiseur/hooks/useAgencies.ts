import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export function useAgencies() {
  return useQuery({
    queryKey: ['franchiseur-agencies'],
    queryFn: async () => {
      const { data: agencies, error } = await supabase
        .from('apogee_agencies')
        .select('*')
        .order('label');

      if (error) throw error;

      // Fetch all agency assignments
      const { data: assignments } = await supabase
        .from('franchiseur_agency_assignments')
        .select('agency_id, user_id');

      // Fetch animator profiles with their franchiseur roles
      const userIds = [...new Set(assignments?.map(a => a.user_id) || [])];
      
      let animatorProfiles: any[] = [];
      let franchiseurRoles: any[] = [];
      
      if (userIds.length > 0) {
        const [profilesResult, rolesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds),
          supabase
            .from('franchiseur_roles')
            .select('user_id, franchiseur_role')
            .in('user_id', userIds)
        ]);
        
        animatorProfiles = profilesResult.data || [];
        franchiseurRoles = rolesResult.data || [];
      }

      // Merge data - each agency gets an array of animators
      const enrichedAgencies = agencies.map(agency => {
        const agencyAssignments = assignments?.filter(a => a.agency_id === agency.id) || [];
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
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAgency(agencyId: string | null) {
  return useQuery({
    queryKey: ['franchiseur-agency', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      
      const { data: agency, error } = await supabase
        .from('apogee_agencies')
        .select('*')
        .eq('id', agencyId)
        .single();

      if (error) throw error;

      // Fetch assignments for this agency
      const { data: assignments } = await supabase
        .from('franchiseur_agency_assignments')
        .select('user_id')
        .eq('agency_id', agencyId);

      const userIds = assignments?.map(a => a.user_id) || [];
      
      let animateurs: AgencyAnimator[] = [];
      
      if (userIds.length > 0) {
        const [profilesResult, rolesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds),
          supabase
            .from('franchiseur_roles')
            .select('user_id, franchiseur_role')
            .in('user_id', userIds)
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
