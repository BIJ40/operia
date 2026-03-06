/**
 * Hook pour récupérer le catalogue des univers Apogée
 * Source de vérité unique pour les compétences techniques
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UniversCatalogItem {
  id: string;
  code: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export function useUniversCatalog() {
  return useQuery({
    queryKey: ['univers-catalog'],
    queryFn: async (): Promise<UniversCatalogItem[]> => {
      const { data, error } = await supabase
        .from('univers_catalog')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as UniversCatalogItem[];
    },
    staleTime: 10 * 60 * 1000, // 10min cache
  });
}
