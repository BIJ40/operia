import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Animator {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  agence: string | null;
}

export function useAnimators() {
  return useQuery({
    queryKey: ['animators'],
    queryFn: async () => {
      // Get all users with any franchiseur role
      const { data: franchiseurRoles, error: rolesError } = await supabase
        .from('franchiseur_roles')
        .select('user_id, franchiseur_role');

      if (rolesError) throw rolesError;

      // Get all users with role_agence = 'tete_de_reseau' (including unconfirmed users)
      const { data: teteDeReseauProfiles, error: tdrError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, agence')
        .eq('role_agence', 'tete_de_reseau');

      if (tdrError) throw tdrError;

      // Combine user IDs from both sources
      const franchiseurUserIds = (franchiseurRoles || []).map(r => r.user_id);
      const tdrUserIds = (teteDeReseauProfiles || []).map(p => p.id);
      const allUserIds = [...new Set([...franchiseurUserIds, ...tdrUserIds])];

      if (allUserIds.length === 0) {
        return [];
      }

      // Get profiles for all these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, agence')
        .in('id', allUserIds)
        .order('first_name');

      if (profilesError) throw profilesError;

      // Enrich with role info
      return (profiles || []).map(p => {
        const roleInfo = franchiseurRoles?.find(r => r.user_id === p.id);
        return {
          ...p,
          franchiseur_role: roleInfo?.franchiseur_role || 'animateur' // Default to animateur if no role yet
        };
      }) as (Animator & { franchiseur_role: string })[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
