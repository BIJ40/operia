/**
 * BdStoryPage — Page principale du module BD Story
 * Génération narrative + rendu visuel BD complet
 */
import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/contexts/ProfileContext';
import { useBdStoryGenerate } from '@/modules/bd-story/hooks/useBdStoryGenerate';
import { useBdStoryHistory, BdStoryRow } from '@/modules/bd-story/hooks/useBdStoryHistory';
import { useBdStoryRender } from '@/modules/bd-story/hooks/useBdStoryRender';
import { BdStoryGeneratorForm } from '@/modules/bd-story/ui/BdStoryGeneratorForm';
import { BdStoryBoardPreview } from '@/modules/bd-story/ui/BdStoryBoardPreview';
import { BdStoryHistoryList } from '@/modules/bd-story/ui/BdStoryHistoryList';
import { BdStoryStoryDetail } from '@/modules/bd-story/ui/BdStoryStoryDetail';
import { BdStoryVisualBoard } from '@/modules/bd-story/ui/BdStoryVisualBoard';
import { BdStoryCharacterLibrary } from '@/modules/bd-story/ui/BdStoryCharacterLibrary';
import { BdStoryGenerationInput, GeneratedStory } from '@/modules/bd-story/types/bdStory.types';
import { StylePreset, STYLE_PRESETS } from '@/modules/bd-story/engine/imageRenderService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Image, FileJson, Users, Sparkles, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useQueryClient } from '@tanstack/react-query';

const STYLE_LABELS: Record<StylePreset, string> = {
  cartoon_premium: '🎨 Cartoon Premium',
  franco_belge: '📖 Franco-Belge',
  semi_realiste: '🖼️ Semi-réaliste',
  comic_chantier: '🔧 Comic Chantier',
};

export default function BdStoryPage() {
  const { agencyId } = useProfile();
  const queryClient = useQueryClient();
  const { generate, isGenerating, lastResult, error } = useBdStoryGenerate({ agencyId: agencyId || '' });
  const { data: stories = [], isLoading: isLoadingHistory } = useBdStoryHistory(agencyId);
  const render = useBdStoryRender(agencyId || '');

  const [selectedStory, setSelectedStory] = useState<GeneratedStory | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('bd');

  const handleGenerate = useCallback(async (params: Partial<BdStoryGenerationInput>) => {
    const result = await generate(params);
    if (result) {
      setSelectedStory(result.story);
      setSelectedPrompt(result.boardPromptMaster);
      queryClient.invalidateQueries({ queryKey: ['bd-story-history'] });
    }
  }, [generate, queryClient]);

  const handleGenerateAndRender = useCallback(async (params: Partial<BdStoryGenerationInput>) => {
    const result = await generate(params);
    if (result) {
      setSelectedStory(result.story);
      setSelectedPrompt(result.boardPromptMaster);
      setActiveTab('bd');
      queryClient.invalidateQueries({ queryKey: ['bd-story-history'] });
      // Start visual rendering
      await render.renderStory(result.story);
    }
  }, [generate, queryClient, render]);

  const handleSelectFromHistory = useCallback((row: BdStoryRow) => {
    const storyJson = row.story_json as unknown as GeneratedStory;
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
      {/* Generator with style selector */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <BdStoryGeneratorForm onGenerate={handleGenerate} isGenerating={isGenerating} />
        
        <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-border/30">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Style visuel BD</Label>
            <Select value={render.stylePreset} onValueChange={(v) => render.setStylePreset(v as StylePreset)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STYLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => selectedStory && render.renderStory(selectedStory)}
            disabled={!selectedStory || render.isRendering}
            variant="default"
            size="sm"
            className="gap-2"
          >
            {render.isRendering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rendu en cours ({render.renderProgress}/12)
              </>
            ) : (
              <>
                <Image className="w-4 h-4" />
                Générer la BD visuelle
              </>
            )}
          </Button>

          <Button
            onClick={() => handleGenerateAndRender({})}
            disabled={isGenerating || render.isRendering}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Histoire + BD en un clic
          </Button>
        </div>

        {/* Progress bar during render */}
        {render.isRendering && (
          <div className="space-y-1">
            <Progress value={(render.renderProgress / 12) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Génération du panel {render.renderProgress}/12…
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Main content: tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="bd" className="gap-1.5 text-xs">
                <Image className="w-3.5 h-3.5" />
                BD visuelle
              </TabsTrigger>
              <TabsTrigger value="script" className="gap-1.5 text-xs">
                <FileJson className="w-3.5 h-3.5" />
                Script
              </TabsTrigger>
              <TabsTrigger value="personnages" className="gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5" />
                Personnages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bd">
              {render.panelStates.length > 0 ? (
                <BdStoryVisualBoard
                  title={selectedStory?.title || 'BD Story'}
                  panels={render.panelStates}
                  onRegeneratePanel={render.regeneratePanel}
                  onRegenerateAll={render.regenerateAll}
                  isGenerating={render.isRendering}
                />
              ) : selectedStory ? (
                <div className="rounded-xl border bg-card/50 flex flex-col items-center justify-center py-16 gap-3 text-sm text-muted-foreground">
                  <Image className="w-8 h-8 text-muted-foreground/30" />
                  <p>Cliquez sur « Générer la BD visuelle » pour créer la planche illustrée.</p>
                </div>
              ) : (
                <div className="rounded-xl border bg-card/50 flex items-center justify-center py-20 text-sm text-muted-foreground">
                  Générez une histoire pour voir la BD ici.
                </div>
              )}
            </TabsContent>

            <TabsContent value="script">
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
                  Générez une histoire pour voir le script ici.
                </div>
              )}
            </TabsContent>

            <TabsContent value="personnages">
              <BdStoryCharacterLibrary />
            </TabsContent>
          </Tabs>
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
