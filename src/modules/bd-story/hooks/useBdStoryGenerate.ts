/**
 * Hook: generate BD stories and persist to Supabase
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateStory } from '../engine/storyOrchestrator';
import { BdStoryGenerationInput, BdStoryGenerationOutput, GeneratedStory } from '../types/bdStory.types';
import { Json } from '@/integrations/supabase/types';

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
      const { data: recentRows } = await (supabase as any)
        .from('bd_story_stories')
        .select('story_json')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(30);

      const recentStories: GeneratedStory[] = (recentRows || [])
        .map((r: { story_json: Json }) => r.story_json as unknown as GeneratedStory)
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

      // Persist with extracted columns
      const story = result.story;
      const bibleViolations = story.validation.issues.filter(
        (i: { severity: string }) => i.severity === 'blocking'
      ).length;

      const { error: insertError } = await (supabase as any)
        .from('bd_story_stories')
        .insert({
          agency_id: agencyId,
          story_key: story.storyKey,
          title: story.title,
          summary: story.summary,
          universe: story.universe,
          story_family: story.storyFamily,
          template_key: story.templateKey,
          problem_slug: story.problemSlug,
          technician_slug: story.assignedCharacters.technician,
          client_profile_slug: story.clientProfileSlug,
          tone: story.tone,
          cta_mode: story.ctaText ? 'general' : null,
          panels: JSON.parse(JSON.stringify(story.panels)),
          story_json: JSON.parse(JSON.stringify(story)),
          board_prompt_master: result.boardPromptMaster,
          diversity_score: story.diversityScore?.totalScore ?? 0,
          narrative_distance_score: story.diversityScore?.narrativeDistance ?? 0,
          validation_is_valid: story.validation.isValid,
          validation_issue_count: story.validation.issues.length,
          bible_violation_count: bibleViolations,
        });

      if (insertError) throw insertError;

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de génération';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [agencyId]);

  return { generate, isGenerating, lastResult, error };
}
