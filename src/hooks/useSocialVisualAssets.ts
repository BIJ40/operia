/**
 * useSocialVisualAssets — Hook React Query pour la gestion des visuels social.
 * Fetch, génération Canvas + upload Storage, persistance social_visual_assets.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { resolveSocialTemplate } from '@/components/commercial/social/templateResolver';
import type { SocialTemplateId } from '@/components/commercial/social/templateResolver';
import type { SocialSuggestion, SocialVariant } from './useSocialSuggestions';

export interface SocialVisualAsset {
  id: string;
  agency_id: string;
  suggestion_id: string;
  variant_id: string | null;
  visual_type: string;
  storage_path: string;
  mime_type: string;
  width: number;
  height: number;
  theme_key: string | null;
  generation_meta: Record<string, any> | null;
  created_at: string;
}

// ─── Fetch assets for a suggestion ──────────────────────────
export function useSocialVisualAssets(suggestionId: string | null) {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['social-visual-assets', agencyId, suggestionId],
    enabled: !!agencyId && !!suggestionId,
    staleTime: 30_000,
    queryFn: async (): Promise<SocialVisualAsset[]> => {
      if (!agencyId || !suggestionId) return [];

      const db = supabase as any;
      const { data, error } = await db
        .from('social_visual_assets')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('suggestion_id', suggestionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SocialVisualAsset[];
    },
  });
}

// ─── Generate + upload visual ───────────────────────────────
interface GenerateVisualParams {
  suggestion: SocialSuggestion;
  variant?: SocialVariant | null;
  mediaUrl?: string | null;
  canvas: HTMLCanvasElement;
}

export function useGenerateSocialVisual() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestion, variant, mediaUrl, canvas }: GenerateVisualParams) => {
      if (!agencyId) throw new Error('Agence non identifiée');

      // 1. Resolve template
      const templateId: SocialTemplateId = resolveSocialTemplate({
        topic_type: suggestion.topic_type,
        hasMedia: !!mediaUrl,
        hasRealisation: !!suggestion.realisation_id,
        universe: suggestion.universe,
        platform: variant?.platform || null,
      });

      // 2. Export canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Blob generation failed')),
          'image/png'
        );
      });

      // 3. Build storage path
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const platform = variant?.platform || 'base';
      const timestamp = Math.floor(now.getTime() / 1000);
      const filename = `${templateId}-${platform}-${timestamp}.png`;
      const storagePath = `${agencyId}/${year}/${month}/${suggestion.id}/${filename}`;

      // 4. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('social-visuals')
        .upload(storagePath, blob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      // 5. Persist in social_visual_assets
      const db = supabase as any;
      const { data: asset, error: insertError } = await db
        .from('social_visual_assets')
        .insert({
          agency_id: agencyId,
          suggestion_id: suggestion.id,
          variant_id: variant?.id || null,
          visual_type: templateId,
          storage_path: storagePath,
          mime_type: 'image/png',
          width: 1080,
          height: 1080,
          theme_key: suggestion.universe || 'general',
          generation_meta: {
            template_id: templateId,
            platform,
            universe: suggestion.universe || 'general',
            generated_at: now.toISOString(),
            source: 'canvas_v1',
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return asset as SocialVisualAsset;
    },
    onSuccess: (asset) => {
      queryClient.invalidateQueries({
        queryKey: ['social-visual-assets', agencyId, asset.suggestion_id],
      });
      toast.success('Visuel généré et sauvegardé');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la génération du visuel');
    },
  });
}

// ─── Download visual (signed URL) ───────────────────────────
export async function downloadSocialVisual(storagePath: string, filename?: string) {
  const { data, error } = await supabase.storage
    .from('social-visuals')
    .createSignedUrl(storagePath, 300);

  if (error || !data?.signedUrl) {
    toast.error('Impossible de télécharger le visuel');
    return;
  }

  const link = document.createElement('a');
  link.href = data.signedUrl;
  link.download = filename || storagePath.split('/').pop() || 'visual.png';
  link.click();
  toast.success('Téléchargement lancé');
}

// ─── Get signed URL for display ─────────────────────────────
export async function getSignedVisualUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('social-visuals')
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
