/**
 * Hook — Fetch all generated before/after visuals (cards) across realisations
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';

const db = supabase as any;

export interface GeneratedVisual {
  id: string;
  realisation_id: string;
  realisation_title: string;
  storage_path: string;
  file_name: string;
  created_at: string;
  signedUrl: string;
}

export function useGeneratedVisuals() {
  const { agencyId } = useEffectiveAuth();

  return useQuery({
    queryKey: ['generated-visuals', agencyId],
    queryFn: async (): Promise<GeneratedVisual[]> => {
      if (!agencyId) return [];

      // Fetch cover media that are generated cards (stored in /cards/ path)
      const { data: media, error } = await db
        .from('realisation_media')
        .select('id, realisation_id, storage_path, file_name, created_at')
        .eq('agency_id', agencyId)
        .eq('media_role', 'cover')
        .like('file_name', 'avant-apres-%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!media || media.length === 0) return [];

      // Get realisation titles
      const realisationIds = [...new Set((media as any[]).map((m: any) => m.realisation_id))];
      const { data: realisations } = await db
        .from('realisations')
        .select('id, title')
        .in('id', realisationIds);

      const titleMap = new Map<string, string>();
      ((realisations || []) as any[]).forEach((r: any) => titleMap.set(r.id, r.title));

      // Generate signed URLs in batch
      const paths = (media as any[]).map((m: any) => m.storage_path);
      const { data: signedData } = await supabase.storage
        .from('realisations-private')
        .createSignedUrls(paths, 3600);

      return (media as any[]).map((m: any, idx: number) => ({
        id: m.id,
        realisation_id: m.realisation_id,
        realisation_title: titleMap.get(m.realisation_id) || 'Sans titre',
        storage_path: m.storage_path,
        file_name: m.file_name,
        created_at: m.created_at,
        signedUrl: signedData?.[idx]?.signedUrl || '',
      }));
    },
    enabled: !!agencyId,
    staleTime: 1000 * 60,
  });
}
