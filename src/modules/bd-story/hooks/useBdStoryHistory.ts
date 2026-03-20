/**
 * Hook: fetch BD story history from Supabase
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface BdStoryRow {
  id: string;
  title: string;
  summary: string | null;
  universe: string;
  story_family: string;
  template_key: string;
  technician_slug: string;
  tone: string | null;
  status: string;
  is_favorite: boolean | null;
  diversity_score: number | null;
  validation_is_valid: boolean;
  panels: Json;
  story_json: Json;
  board_prompt_master: string | null;
  created_at: string;
}

export function useBdStoryHistory(agencyId: string | undefined) {
  return useQuery({
    queryKey: ['bd-story-history', agencyId],
    queryFn: async (): Promise<BdStoryRow[]> => {
      if (!agencyId) return [];
      const { data, error } = await (supabase as any)
        .from('bd_story_stories')
        .select('id, title, summary, universe, story_family, template_key, technician_slug, tone, status, is_favorite, diversity_score, validation_is_valid, panels, story_json, board_prompt_master, created_at')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as BdStoryRow[];
    },
    enabled: !!agencyId,
  });
}
