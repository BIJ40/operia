/**
 * useSocialVisualAssets — Hook React Query pour la gestion des visuels social.
 * V2 : Génération via edge function AI (Nano Banana) au lieu du canvas client.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

// ─── Generate visual via AI edge function ───────────────────
export function useGenerateSocialVisual() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionId, visualCustomization, editExisting }: {
      suggestionId: string;
      visualCustomization?: {
        freePrompt?: string;
        keywords?: string;
        includeVan?: boolean;
        universeOverride?: string;
        tone?: string;
        audience?: string;
        imageModel?: string;
      };
      editExisting?: {
        sourceStoragePath: string;
        editInstruction: string;
      };
    }) => {
      if (!agencyId) throw new Error('Agence non identifiée');

      const { data, error } = await supabase.functions.invoke('social-visual-generate', {
        body: {
          suggestion_id: suggestionId,
          agency_id: agencyId,
          ...(visualCustomization ? { visual_customization: visualCustomization } : {}),
          ...(editExisting ? { edit_existing: editExisting } : {}),
        },
      });

      if (error) {
        const status = (error as any)?.context?.status;
        if (status === 429) throw new Error('Trop de requêtes — attendez 1-2 minutes puis réessayez.');
        if (status === 402) throw new Error('Crédits IA insuffisants. Rechargez votre solde dans les paramètres.');
        throw error;
      }
      if (data?.error) {
        if (data.error.includes('requêtes')) throw new Error('Trop de requêtes — attendez 1-2 minutes puis réessayez.');
        if (data.error.includes('Crédits')) throw new Error('Crédits IA insuffisants. Rechargez votre solde.');
        throw new Error(data.error);
      }
      return data as { success: boolean; asset_id: string; storage_path: string; signed_url: string | null };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['social-visual-assets', agencyId, variables.suggestionId],
      });
      toast.success('Visuel IA généré et sauvegardé');
    },
    onError: (err: any) => {
      const msg = err?.message || 'Erreur lors de la génération du visuel';
      toast.error(msg);
    },
  });
}

// ─── Upload canvas-rendered visual to storage ──────────────
export async function uploadCanvasVisual(
  blob: Blob,
  agencyId: string,
  suggestionId: string,
): Promise<{ storagePath: string; signedUrl: string | null } | null> {
  const timestamp = Date.now();
  const storagePath = `${agencyId}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${suggestionId}/canvas-team-${timestamp}.png`;

  const { error: uploadError } = await supabase.storage
    .from('social-visuals')
    .upload(storagePath, blob, { contentType: 'image/png', upsert: true });

  if (uploadError) {
    console.error('Canvas upload error:', uploadError);
    return null;
  }

  // Insert asset record
  const db = supabase as any;
  const { error: insertError } = await db
    .from('social_visual_assets')
    .insert({
      agency_id: agencyId,
      suggestion_id: suggestionId,
      visual_type: 'illustration_generee',
      storage_path: storagePath,
      mime_type: 'image/png',
      width: 1080,
      height: 1080,
      theme_key: 'general',
      generation_meta: {
        mode: 'canvas_team',
        source: 'canvas_brand_card',
        composition_mode: 'composed',
        generated_at: new Date().toISOString(),
      },
    });

  if (insertError) {
    console.error('Canvas asset insert error:', insertError);
    return null;
  }

  const { data: signedData } = await supabase.storage
    .from('social-visuals')
    .createSignedUrl(storagePath, 3600);

  return { storagePath, signedUrl: signedData?.signedUrl || null };
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

  try {
    const response = await fetch(data.signedUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || storagePath.split('/').pop() || 'visual.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    toast.success('Téléchargement lancé');
  } catch {
    toast.error('Erreur lors du téléchargement');
  }
}

// ─── Get signed URL for display ─────────────────────────────
export async function getSignedVisualUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('social-visuals')
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
