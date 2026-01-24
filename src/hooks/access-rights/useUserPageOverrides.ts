/**
 * Hook pour gérer les overrides de pages individuelles par utilisateur
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PageOverride {
  id: string;
  user_id: string;
  page_path: string;
  granted_at: string;
  granted_by: string | null;
}

/**
 * Récupère les overrides de pages pour un utilisateur spécifique
 */
export function useUserPageOverrides(userId: string | null) {
  return useQuery({
    queryKey: ['userPageOverrides', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_page_overrides')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return (data as PageOverride[]) || [];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Récupère tous les overrides de pages (pour la liste admin)
 */
export function useAllPageOverrides() {
  return useQuery({
    queryKey: ['allPageOverrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_page_overrides')
        .select('*');
      
      if (error) throw error;
      return (data as PageOverride[]) || [];
    },
    staleTime: 30_000,
  });
}

/**
 * Mutation pour ajouter/supprimer un override de page
 */
export function usePageOverrideMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      pagePath, 
      enabled 
    }: { 
      userId: string; 
      pagePath: string; 
      enabled: boolean;
    }) => {
      if (enabled) {
        // Ajouter l'override
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('user_page_overrides')
          .upsert({
            user_id: userId,
            page_path: pagePath,
            granted_by: user?.id,
          }, {
            onConflict: 'user_id,page_path',
          });
        
        if (error) throw error;
      } else {
        // Supprimer l'override
        const { error } = await supabase
          .from('user_page_overrides')
          .delete()
          .eq('user_id', userId)
          .eq('page_path', pagePath);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { userId, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['userPageOverrides', userId] });
      queryClient.invalidateQueries({ queryKey: ['allPageOverrides'] });
      toast.success(enabled ? 'Accès ajouté' : 'Accès retiré');
    },
    onError: (error) => {
      console.error('Error toggling page override:', error);
      toast.error('Erreur lors de la modification de l\'accès');
    },
  });
}
