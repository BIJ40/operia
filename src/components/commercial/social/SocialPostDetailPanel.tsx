/**
 * SocialPostDetailPanel — Panneau latéral droit.
 * Affiche le détail complet du post : texte, visuel IA, actions.
 * Simplifié : pas de variantes plateforme, pas de customization panel.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Share2, ImagePlus, Download, RefreshCw, Loader2, Sparkles, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SocialPostCard } from './SocialPostCard';
import { SocialVisualCanvas, canvasToBlob, type SocialTemplatePayload } from './SocialVisualCanvas';
import { resolveSocialTemplate } from './templateResolver';
import { useSocialVisualAssets, useGenerateSocialVisual, downloadSocialVisual, getSignedVisualUrl } from '@/hooks/useSocialVisualAssets';
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions';

interface SocialPostDetailPanelProps {
  suggestion: SocialSuggestion | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRegenerate: (id: string) => void;
  isRegenerating?: boolean;
}

export function SocialPostDetailPanel({ suggestion, onApprove, onReject, onRegenerate, isRegenerating }: SocialPostDetailPanelProps) {
  if (!suggestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
        <Share2 className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Sélectionnez un post</p>
        <p className="text-xs text-muted-foreground/50 max-w-[200px]">
          Le détail du post s'affichera ici avec le visuel et les actions.
        </p>
      </div>
    );
  }

  return <DetailContent
    suggestion={suggestion}
    onApprove={onApprove}
    onReject={onReject}
    onRegenerate={onRegenerate}
    isRegenerating={isRegenerating}
  />;
}

function DetailContent({ suggestion, onApprove, onReject, onRegenerate, isRegenerating }: {
  suggestion: SocialSuggestion;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRegenerate: (id: string) => void;
  isRegenerating?: boolean;
}) {
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);
  const [composedPreviewUrl, setComposedPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [renderModeOverride, setRenderModeOverride] = useState<'canvas' | 'image' | null>(null);

  // Visual assets
  const { data: assets = [], isLoading: assetsLoading } = useSocialVisualAssets(suggestion.id);
  const generateMutation = useGenerateSocialVisual();

  const rawAsset = useMemo(
    () => assets.find((asset) => asset.generation_meta?.composition_mode === 'bg_only') || null,
    [assets],
  );
  const composedAsset = useMemo(
    () => assets.find((asset) => asset.generation_meta?.composition_mode === 'composed') || assets[0] || null,
    [assets],
  );
  const badgeAsset = composedAsset || rawAsset;
  const renderMode = renderModeOverride ?? (rawAsset ? 'canvas' : composedAsset ? 'image' : 'canvas');
  const setRenderMode = setRenderModeOverride;
  const hasPreview = Boolean(rawPreviewUrl || composedPreviewUrl);
  const showPreviewSkeleton = (assetsLoading || loadingPreview) && !hasPreview;

  // Build canvas payload
  const aiPayload = (suggestion as any).ai_payload || {};
  const generatedCopy = (rawAsset?.generation_meta?.generated_copy || composedAsset?.generation_meta?.generated_copy || null) as {
    hook?: string;
    subtext?: string;
    cta?: string;
  } | null;
  const canvasPayload: SocialTemplatePayload = useMemo(() => ({
    title: suggestion.title,
    caption: generatedCopy?.subtext || suggestion.caption_base_fr || '',
    universe: suggestion.universe,
    platform: suggestion.platform_targets?.[0] || null,
    date: suggestion.suggestion_date,
    mediaUrl: rawPreviewUrl || null,
    hook: generatedCopy?.hook || aiPayload.hook || suggestion.title,
    cta: generatedCopy?.cta || aiPayload.cta || null,
    topicType: suggestion.topic_type,
  }), [suggestion, rawPreviewUrl, aiPayload, generatedCopy]);

  const templateId = useMemo(() => resolveSocialTemplate({
    topic_type: suggestion.topic_type,
    hasMedia: !!rawPreviewUrl,
    universe: suggestion.universe,
  }), [suggestion.topic_type, rawPreviewUrl, suggestion.universe]);

  // Load signed URLs
  useEffect(() => {
    if (!rawAsset && !composedAsset) {
      setRawPreviewUrl(null);
      setComposedPreviewUrl(null);
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);

    Promise.all([
      rawAsset ? getSignedVisualUrl(rawAsset.storage_path) : Promise.resolve(null),
      composedAsset ? getSignedVisualUrl(composedAsset.storage_path) : Promise.resolve(null),
    ])
      .then(([rawUrl, composedUrl]) => {
        if (!cancelled) {
          setRawPreviewUrl(rawUrl);
          setComposedPreviewUrl(composedUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRawPreviewUrl((current) => current);
          setComposedPreviewUrl((current) => current);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => { cancelled = true; };
  }, [rawAsset?.id, rawAsset?.storage_path, composedAsset?.id, composedAsset?.storage_path]);

  const handleGenerate = useCallback(() => {
    setLoadingPreview(true);
    generateMutation.mutate(
      { suggestionId: suggestion.id },
      {
        onSuccess: (data) => {
          if (data?.signed_url) setComposedPreviewUrl(data.signed_url);
          setLoadingPreview(false);
        },
        onError: () => {
          setLoadingPreview(false);
        },
      }
    );
  }, [suggestion.id, generateMutation]);

  const handleDownload = useCallback(() => {
    const assetToDownload = renderMode === 'image'
      ? (rawAsset || composedAsset)
      : (composedAsset || rawAsset);
    if (assetToDownload) downloadSocialVisual(assetToDownload.storage_path);
  }, [renderMode, rawAsset, composedAsset]);

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
      {/* Main card */}
      <SocialPostCard
        suggestion={suggestion}
        onApprove={onApprove}
        onReject={onReject}
        onRegenerate={onRegenerate}
        isRegenerating={isRegenerating}
      />

      {/* ─── Visual preview section ─── */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Aperçu visuel
          </p>
          {badgeAsset?.generation_meta?.source && (
            <Badge variant="outline" className="text-[9px]">
              {badgeAsset.generation_meta.source === 'ai_nanobana_v1' ? '✨ IA' : 'Canvas'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 mb-1">
          <Button
            size="sm"
            variant={renderMode === 'canvas' ? 'default' : 'ghost'}
            className="h-5 text-[10px] px-2"
            onClick={() => setRenderMode('canvas')}
          >
            Canvas
          </Button>
          <Button
            size="sm"
            variant={renderMode === 'image' ? 'default' : 'ghost'}
            className="h-5 text-[10px] px-2"
            onClick={() => setRenderMode('image')}
          >
            Image brute
          </Button>
        </div>

        {/* Preview */}
        {showPreviewSkeleton ? (
          <Skeleton className="w-full aspect-square rounded-lg" />
        ) : renderMode === 'canvas' ? (
          rawPreviewUrl ? (
            <SocialVisualCanvas payload={canvasPayload} templateId={templateId} />
          ) : composedPreviewUrl ? (
            <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed border-border text-center px-4">
              <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Canvas indisponible sur cet ancien visuel</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Régénérez pour obtenir un fond brut sans texte.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
              <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Aucun visuel généré</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Cliquez pour générer un visuel IA</p>
            </div>
          )
        ) : rawPreviewUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img src={rawPreviewUrl} alt="Aperçu image brute" className="w-full h-auto" data-no-modal />
          </div>
        ) : composedPreviewUrl ? (
          <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed border-border text-center px-4">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Image brute indisponible sur cet ancien visuel</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">Régénérez pour obtenir le fond sans texte.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Aucun visuel généré</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">Cliquez pour générer un visuel IA</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={composedAsset || rawAsset ? 'outline' : 'default'}
            className="h-7 text-xs gap-1 flex-1"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Génération IA…
              </>
            ) : composedAsset || rawAsset ? (
              <>
                <RefreshCw className="w-3 h-3" />
                Régénérer
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Générer le visuel IA
              </>
            )}
          </Button>
          {(composedAsset || rawAsset) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={handleDownload}
            >
              <Download className="w-3 h-3" />
              Télécharger
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
