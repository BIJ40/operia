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
  cover_url: string | null;
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

      // Fetch all media for counts + first image per realisation
      const { data: allMedia } = await db
        .from('realisation_media')
        .select('realisation_id, storage_path, sequence_order, media_role')
        .in('realisation_id', ids)
        .order('sequence_order', { ascending: true });

      const countMap = new Map<string, number>();
      const coverPathMap = new Map<string, string>();

      ((allMedia || []) as any[]).forEach((m) => {
        countMap.set(m.realisation_id, (countMap.get(m.realisation_id) || 0) + 1);
        // Keep first image as cover (priority: cover role, then first by order)
        if (!coverPathMap.has(m.realisation_id)) {
          coverPathMap.set(m.realisation_id, m.storage_path);
        } else if (m.media_role === 'cover') {
          coverPathMap.set(m.realisation_id, m.storage_path);
        }
      });

      // Generate signed URLs for covers
      const coverEntries = Array.from(coverPathMap.entries());
      const coverUrlMap = new Map<string, string>();

      if (coverEntries.length > 0) {
        const paths = coverEntries.map(([, path]) => path);
        const { data: signedData } = await supabase.storage
          .from('realisation-media')
          .createSignedUrls(paths, 3600);

        if (signedData) {
          signedData.forEach((item: any, idx: number) => {
            if (item.signedUrl) {
              coverUrlMap.set(coverEntries[idx][0], item.signedUrl);
            }
          });
        }
      }

      return items.map((r) => ({
        ...r,
        media_count: countMap.get(r.id) || 0,
        cover_url: coverUrlMap.get(r.id) || null,
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
