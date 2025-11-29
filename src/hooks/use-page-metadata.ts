import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PageMetadata {
  id: string;
  page_key: string;
  header_title: string | null;
  header_subtitle: string | null;
  menu_label: string | null;
  created_at: string;
  updated_at: string;
}

interface UpsertPageMetadataParams {
  page_key: string;
  header_title?: string | null;
  header_subtitle?: string | null;
  menu_label?: string | null;
}

/**
 * Hook pour récupérer les métadonnées d'une page
 */
export function usePageMetadata(pageKey: string) {
  return useQuery({
    queryKey: ['pageMetadata', pageKey],
    queryFn: async (): Promise<PageMetadata | null> => {
      const { data, error } = await supabase
        .from('page_metadata')
        .select('*')
        .eq('page_key', pageKey)
        .maybeSingle();

      if (error) {
        console.error('Error fetching page metadata:', error);
        return null;
      }

      return data as PageMetadata | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook pour créer ou mettre à jour les métadonnées d'une page
 */
export function useUpsertPageMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpsertPageMetadataParams) => {
      const { page_key, header_title, header_subtitle, menu_label } = params;

      // Vérifier si la page existe déjà
      const { data: existing } = await supabase
        .from('page_metadata')
        .select('id')
        .eq('page_key', page_key)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('page_metadata')
          .update({
            header_title,
            header_subtitle,
            menu_label,
            updated_at: new Date().toISOString(),
          })
          .eq('page_key', page_key)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('page_metadata')
          .insert({
            page_key,
            header_title,
            header_subtitle,
            menu_label,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pageMetadata', variables.page_key] });
    },
  });
}

/**
 * Hook pour récupérer toutes les métadonnées de pages (pour le menu)
 */
export function useAllPageMetadata() {
  return useQuery({
    queryKey: ['allPageMetadata'],
    queryFn: async (): Promise<PageMetadata[]> => {
      const { data, error } = await supabase
        .from('page_metadata')
        .select('*')
        .order('page_key');

      if (error) {
        console.error('Error fetching all page metadata:', error);
        return [];
      }

      return (data as PageMetadata[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pour récupérer un mapping des menu_labels par pageKey
 */
export function useMenuLabels() {
  const { data: allMetadata } = useAllPageMetadata();
  
  const menuLabels = new Map<string, string>();
  
  if (allMetadata) {
    allMetadata.forEach(meta => {
      if (meta.menu_label) {
        menuLabels.set(meta.page_key, meta.menu_label);
      }
    });
  }
  
  return menuLabels;
}
