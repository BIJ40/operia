import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';

export interface Animator {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  agence: string | null;
  global_role: GlobalRole | null;
}

/**
 * Dérive le rôle franchiseur depuis global_role
 * N3 (franchisor_user) = animateur
 * N4 (franchisor_admin) = directeur
 * N5/N6 (platform_admin, superadmin) = dg (admins plateforme ont accès DG)
 */
function deriveFranchiseurRole(globalRole: GlobalRole | null): 'animateur' | 'directeur' | 'dg' {
  if (!globalRole) return 'animateur';
  
  // N3 = Animateur réseau
  if (globalRole === 'franchisor_user') return 'animateur';
  
  // N4 = Directeur réseau
  if (globalRole === 'franchisor_admin') return 'directeur';
  
  // N5/N6 = DG / Admin plateforme
  if (globalRole === 'platform_admin' || globalRole === 'superadmin') return 'dg';
  
  return 'animateur';
}

export function useAnimators() {
  return useQuery({
    queryKey: ['animators'],
    queryFn: async () => {
      // Get users with global_role N3 (franchisor_user) or N4 (franchisor_admin)
      // N5/N6 (platform_admin, superadmin) are platform admins, NOT franchiseur network staff
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, agence, global_role')
        .in('global_role', ['franchisor_user', 'franchisor_admin'])
        .order('first_name');

      if (error) throw error;

      // Enrich with derived franchiseur_role
      return (profiles || []).map(p => ({
        ...p,
        franchiseur_role: deriveFranchiseurRole(p.global_role as GlobalRole | null)
      })) as (Animator & { franchiseur_role: string })[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
