/**
 * Hook: generate BD stories and persist to Supabase
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateStory } from '../engine/storyOrchestrator';
import { BdStoryGenerationInput, BdStoryGenerationOutput, GeneratedStory } from '../types/bdStory.types';

interface UseGenerateOptions {
  agencyId: string;
}

export function useBdStoryGenerate({ agencyId }: UseGenerateOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<BdStoryGenerationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: Partial<BdStoryGenerationInput>) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Fetch recent stories for diversity
      const { data: recentRows } = await supabase
        .from('bd_story_stories')
        .select('story_json')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(30);

      const recentStories: GeneratedStory[] = (recentRows || [])
        .map(r => r.story_json as unknown as GeneratedStory)
        .filter(Boolean);

      const input: BdStoryGenerationInput = {
        agencyId,
        ...params,
        avoidRecentStoryKeys: recentStories.map(s => s.storyKey).slice(0, 20),
        avoidRecentProblemSlugs: recentStories.map(s => s.problemSlug).slice(0, 10),
        avoidRecentTechnicianSlugs: recentStories.map(s => s.assignedCharacters.technician).slice(0, 5),
      };

      const result = generateStory(input, recentStories);
      setLastResult(result);

      // Persist
      const { error: insertError } = await supabase
        .from('bd_story_stories')
        .insert({
          agency_id: agencyId,
          story_key: result.story.storyKey,
          title: result.story.title,
          summary: result.story.summary,
          universe: result.story.universe,
          story_family: result.story.storyFamily,
          template_key: result.story.templateKey,
          problem_slug: result.story.problemSlug,
          technician_slug: result.story.assignedCharacters.technician,
          client_profile_slug: result.story.clientProfileSlug,
          tone: result.story.tone,
          panels: result.story.panels as any,
          story_json: result.story as any,
          board_prompt_master: result.boardPromptMaster,
          diversity_score: result.story.diversityScore.totalScore,
          coupling_score: result.story.validation.isValid ? 1 : 0,
        });

      if (insertError) throw insertError;

      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur de génération');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [agencyId]);

  return { generate, isGenerating, lastResult, error };
}
