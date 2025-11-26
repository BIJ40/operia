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
      // Get all users with franchiseur role = animateur
      const { data: franchiseurRoles, error: rolesError } = await supabase
        .from('franchiseur_roles')
        .select('user_id')
        .eq('franchiseur_role', 'animateur');

      if (rolesError) throw rolesError;

      if (!franchiseurRoles || franchiseurRoles.length === 0) {
        return [];
      }

      const animatorIds = franchiseurRoles.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, agence')
        .in('id', animatorIds)
        .order('first_name');

      if (profilesError) throw profilesError;

      return profiles as Animator[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
