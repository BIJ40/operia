/**
 * BD Story — Image Render Service
 * Provider-based image generation abstraction for panel rendering
 */

import { supabase } from '@/integrations/supabase/client';
import { PanelRenderPlan } from './panelRenderPlan';

// ============================================================================
// TYPES
// ============================================================================

export interface PanelRenderResult {
  panelNumber: number;
  imageUrl: string;
  status: 'success' | 'error' | 'pending';
  error?: string;
  generatedAt: string;
}

export interface BoardRenderResult {
  renderId: string;
  storyId: string;
  status: 'complete' | 'partial' | 'error';
  panels: PanelRenderResult[];
  provider: string;
  stylePreset: string;
}

export type StylePreset = 
  | 'cartoon_premium'
  | 'franco_belge'
  | 'semi_realiste'
  | 'comic_chantier';

export const STYLE_PRESETS: Record<StylePreset, string> = {
  cartoon_premium: 'Premium cartoon style, warm colors, clean professional lines, Franco-Belgian comic influence, expressive characters, soft shading, high readability',
  franco_belge: 'Classic Franco-Belgian comic book style like Tintin or Spirou, ligne claire, flat colors, precise linework, adventurous feel',
  semi_realiste: 'Semi-realistic illustration style, detailed environments, proportional characters, muted professional palette, advertising quality',
  comic_chantier: 'Fun construction/repair themed comic style, bold outlines, bright colors, dynamic poses, slightly exaggerated expressions, energetic',
};

// ============================================================================
// PANEL IMAGE GENERATION via Edge Function
// ============================================================================

export async function generatePanelImage(
  plan: PanelRenderPlan,
  stylePreset: StylePreset = 'cartoon_premium',
  agencyId: string,
): Promise<PanelRenderResult> {
  try {
    const stylePrompt = STYLE_PRESETS[stylePreset];
    const fullPrompt = `${plan.imagePrompt}\n\nArt style: ${stylePrompt}`;

    const { data, error } = await supabase.functions.invoke('bd-story-generate-panel', {
      body: {
        prompt: fullPrompt,
        panelNumber: plan.panelNumber,
        agencyId,
        stylePreset,
      },
    });

    if (error) throw error;

    return {
      panelNumber: plan.panelNumber,
      imageUrl: data?.imageUrl || '',
      status: data?.imageUrl ? 'success' : 'error',
      error: data?.error,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      panelNumber: plan.panelNumber,
      imageUrl: '',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate all 12 panel images sequentially (to avoid rate limits)
 */
export async function generateAllPanelImages(
  plans: PanelRenderPlan[],
  stylePreset: StylePreset,
  agencyId: string,
  onProgress?: (panelNumber: number, result: PanelRenderResult) => void,
): Promise<PanelRenderResult[]> {
  const results: PanelRenderResult[] = [];

  for (const plan of plans) {
    const result = await generatePanelImage(plan, stylePreset, agencyId);
    results.push(result);
    onProgress?.(plan.panelNumber, result);
    
    // Small delay between requests to avoid rate limiting
    if (plan.panelNumber < plans.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  return results;
}
