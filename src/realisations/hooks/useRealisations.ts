/**
 * Hook — List & single realisation
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import type { Realisation } from '../types';

const db = supabase as any;

export interface RealisationWithMeta extends Realisation {
  media_count: number;
}

export function useRealisations(search = '') {
  const { agencyId } = useEffectiveAuth();

  return useQuery({
    queryKey: ['realisations', agencyId, search],
    queryFn: async (): Promise<RealisationWithMeta[]> => {
      if (!agencyId) return [];

      let query = db
        .from('realisations')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = (data || []) as Realisation[];
      const ids = items.map(r => r.id);
      if (ids.length === 0) return [];

      const { data: mediaStats } = await db
        .from('realisation_media')
        .select('realisation_id')
        .in('realisation_id', ids);

      const countMap = new Map<string, number>();
      ((mediaStats || []) as any[]).forEach((m) => {
        countMap.set(m.realisation_id, (countMap.get(m.realisation_id) || 0) + 1);
      });

      return items.map((r) => ({
        ...r,
        media_count: countMap.get(r.id) || 0,
      }));
    },
    enabled: !!agencyId,
    staleTime: 1000 * 30,
  });
}

export function useRealisation(id: string | undefined) {
  return useQuery({
    queryKey: ['realisation', id],
    queryFn: async (): Promise<Realisation | null> => {
      if (!id) return null;
      const { data, error } = await db
        .from('realisations')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Realisation;
    },
    enabled: !!id,
  });
}
