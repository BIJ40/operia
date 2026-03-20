/**
 * Hook: fetch BD story history from Supabase
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StoryRow {
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
  panels: any;
  story_json: any;
  board_prompt_master: string | null;
  created_at: string;
}

export function useBdStoryHistory(agencyId: string | undefined) {
  return useQuery({
    queryKey: ['bd-story-history', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('bd_story_stories')
        .select('id, title, summary, universe, story_family, template_key, technician_slug, tone, status, is_favorite, diversity_score, panels, story_json, board_prompt_master, created_at')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as StoryRow[];
    },
    enabled: !!agencyId,
  });
}
