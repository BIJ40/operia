/**
 * useApporteurCheck - Vérifie si l'utilisateur connecté est un apporteur
 * 
 * Retourne true si le user_id existe dans apporteur_users avec is_active=true
 * Utilisé par AuthRouter pour rediriger automatiquement vers l'espace apporteur
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logError } from "@/lib/logger";

export function useApporteurCheck() {
  const { user } = useAuth();

  const { data: isApporteur, isLoading } = useQuery({
    queryKey: ['is-apporteur-user', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('apporteur_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('[useApporteurCheck] Error checking apporteur status:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Ne change pas pendant la session
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return { 
    isApporteur: isApporteur ?? false, 
    isLoading: !!user?.id && isLoading 
  };
}
