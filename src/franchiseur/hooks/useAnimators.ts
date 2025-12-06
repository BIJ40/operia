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
  
  // Fallback pour legacy role_agence = 'tete_de_reseau' sans global_role
  return 'animateur';
}

export function useAnimators() {
  return useQuery({
    queryKey: ['animators'],
    queryFn: async () => {
      // Get users with global_role N3 (franchisor_user) or N4 (franchisor_admin) ONLY
      // N5/N6 (platform_admin, superadmin) are platform admins, NOT franchiseur network staff
      // Also include legacy role_agence = 'tete_de_reseau'
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, agence, global_role')
        .or('global_role.in.(franchisor_user,franchisor_admin),role_agence.eq.tete_de_reseau')
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
