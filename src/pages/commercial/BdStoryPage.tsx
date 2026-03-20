/**
 * BdStoryPage — Page principale du module BD Story
 * Génération, aperçu planche, historique
 */
import { useState, useCallback } from 'react';
import { useAgencyId } from '@/hooks/useAgencyId';
import { useBdStoryGenerate } from '@/modules/bd-story/hooks/useBdStoryGenerate';
import { useBdStoryHistory } from '@/modules/bd-story/hooks/useBdStoryHistory';
import { BdStoryGeneratorForm } from '@/modules/bd-story/ui/BdStoryGeneratorForm';
import { BdStoryBoardPreview } from '@/modules/bd-story/ui/BdStoryBoardPreview';
import { BdStoryHistoryList } from '@/modules/bd-story/ui/BdStoryHistoryList';
import { BdStoryStoryDetail } from '@/modules/bd-story/ui/BdStoryStoryDetail';
import { GeneratedStory } from '@/modules/bd-story/types/bdStory.types';
import { useQueryClient } from '@tanstack/react-query';

export default function BdStoryPage() {
  const agencyId = useAgencyId();
  const queryClient = useQueryClient();
  const { generate, isGenerating, lastResult, error } = useBdStoryGenerate({ agencyId: agencyId || '' });
  const { data: stories = [], isLoading: isLoadingHistory } = useBdStoryHistory(agencyId);

  const [selectedStory, setSelectedStory] = useState<GeneratedStory | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const handleGenerate = useCallback(async (params: any) => {
    const result = await generate(params);
    if (result) {
      setSelectedStory(result.story);
      setSelectedPrompt(result.boardPromptMaster);
      queryClient.invalidateQueries({ queryKey: ['bd-story-history'] });
    }
  }, [generate, queryClient]);

  const handleSelectFromHistory = useCallback((row: any) => {
    const storyJson = row.story_json as GeneratedStory;
    setSelectedStory(storyJson);
    setSelectedPrompt(row.board_prompt_master);
  }, []);

  if (!agencyId) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Aucune agence associée.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Generator */}
      <BdStoryGeneratorForm onGenerate={handleGenerate} isGenerating={isGenerating} />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Content: detail + history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: story detail or last result */}
        <div className="lg:col-span-2">
          {selectedStory ? (
            <div className="rounded-xl border bg-card p-5">
              <BdStoryStoryDetail story={selectedStory} boardPrompt={selectedPrompt} />
            </div>
          ) : lastResult ? (
            <div className="rounded-xl border bg-card p-5">
              <BdStoryBoardPreview panels={lastResult.story.panels} title={lastResult.story.title} />
            </div>
          ) : (
            <div className="rounded-xl border bg-card/50 flex items-center justify-center py-20 text-sm text-muted-foreground">
              Générez une histoire pour voir l'aperçu ici.
            </div>
          )}
        </div>

        {/* Sidebar: history */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Historique</h3>
          <BdStoryHistoryList
            stories={stories}
            selectedId={selectedStory?.id || null}
            onSelect={handleSelectFromHistory}
            isLoading={isLoadingHistory}
          />
        </div>
      </div>
    </div>
  );
}
