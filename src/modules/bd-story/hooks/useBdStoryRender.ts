/**
 * Hook: BD Story Render Pipeline
 * Orchestrates panel render plan → image generation → board assembly
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeneratedStory } from '../types/bdStory.types';
import { generateFullRenderPlan, PanelRenderPlan } from '../engine/panelRenderPlan';
import { 
  generateAllPanelImages, 
  generatePanelImage,
  PanelRenderResult, 
  StylePreset,
  STYLE_PRESETS,
} from '../engine/imageRenderService';

export interface BoardPanelState {
  number: number;
  text: string;
  imageUrl?: string;
  status: 'idle' | 'pending' | 'success' | 'error';
}

export function useBdStoryRender(agencyId: string) {
  const [panelStates, setPanelStates] = useState<BoardPanelState[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [stylePreset, setStylePreset] = useState<StylePreset>('cartoon_premium');
  const [currentPlans, setCurrentPlans] = useState<PanelRenderPlan[]>([]);
  const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(null);

  /**
   * Start full render pipeline for a story
   */
  const renderStory = useCallback(async (story: GeneratedStory) => {
    setIsRendering(true);
    setRenderProgress(0);
    setCurrentStory(story);

    // Step 1: Generate render plans
    const plans = generateFullRenderPlan(story);
    setCurrentPlans(plans);

    // Step 2: Initialize panel states
    const initialStates: BoardPanelState[] = plans.map(p => ({
      number: p.panelNumber,
      text: p.speechBubbleText,
      imageUrl: undefined,
      status: 'pending' as const,
    }));
    setPanelStates(initialStates);

    // Step 3: Generate images one by one
    const results = await generateAllPanelImages(
      plans,
      stylePreset,
      agencyId,
      (panelNumber, result) => {
        setRenderProgress(panelNumber);
        setPanelStates(prev => prev.map(s =>
          s.number === panelNumber
            ? { ...s, imageUrl: result.imageUrl || undefined, status: result.status === 'success' ? 'success' : 'error' }
            : s
        ));
      }
    );

    // Step 4: Persist render to DB
    try {
      const successCount = results.filter(r => r.status === 'success').length;
      await (supabase as any).from('bd_story_renders').insert({
        agency_id: agencyId,
        story_id: story.id || null,
        status: successCount === 12 ? 'complete' : successCount > 0 ? 'partial' : 'error',
        render_provider: 'gemini',
        style_preset: stylePreset,
        panels_render: JSON.parse(JSON.stringify(results)),
        render_debug: JSON.parse(JSON.stringify({
          plans: plans.map(p => ({ panelNumber: p.panelNumber, prompt: p.imagePrompt.substring(0, 200) })),
          style: stylePreset,
          generatedAt: new Date().toISOString(),
        })),
      });
    } catch (err) {
      console.error('Failed to persist render:', err);
    }

    setIsRendering(false);
    return results;
  }, [agencyId, stylePreset]);

  /**
   * Regenerate a single panel
   */
  const regeneratePanel = useCallback(async (panelNumber: number) => {
    const plan = currentPlans.find(p => p.panelNumber === panelNumber);
    if (!plan) return;

    setPanelStates(prev => prev.map(s =>
      s.number === panelNumber ? { ...s, status: 'pending' as const } : s
    ));

    const result = await generatePanelImage(plan, stylePreset, agencyId);
    
    setPanelStates(prev => prev.map(s =>
      s.number === panelNumber
        ? { ...s, imageUrl: result.imageUrl || undefined, status: result.status === 'success' ? 'success' : 'error' }
        : s
    ));
  }, [currentPlans, stylePreset, agencyId]);

  /**
   * Regenerate all panels
   */
  const regenerateAll = useCallback(async () => {
    if (!currentStory) return;
    await renderStory(currentStory);
  }, [currentStory, renderStory]);

  return {
    panelStates,
    isRendering,
    renderProgress,
    stylePreset,
    setStylePreset,
    renderStory,
    regeneratePanel,
    regenerateAll,
    availableStyles: STYLE_PRESETS,
  };
}
