import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
  date_ouverture: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  animateur_id: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  created_at: string;
  updated_at: string;
  animateur_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
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

      // Fetch animator profiles separately
      const animatorIds = agencies
        .map(a => a.animateur_id)
        .filter(Boolean) as string[];

      let animatorProfiles: any[] = [];
      if (animatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', animatorIds);
        
        animatorProfiles = profiles || [];
      }

      // Merge data
      const enrichedAgencies = agencies.map(agency => ({
        ...agency,
        animateur_profile: agency.animateur_id
          ? animatorProfiles.find(p => p.id === agency.animateur_id)
          : null,
      }));

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

      // Fetch animator profile if exists
      let animateur_profile = null;
      if (agency.animateur_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('id', agency.animateur_id)
          .single();
        
        animateur_profile = profile;
      }

      return {
        ...agency,
        animateur_profile,
      } as Agency;
    },
    enabled: !!agencyId,
  });
}
