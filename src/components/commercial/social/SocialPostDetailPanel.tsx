/**
 * SocialPostDetailPanel — Panneau latéral droit.
 * Affiche le détail complet du post sélectionné avec variantes, hashtags, actions.
 */

import { useState } from 'react';
import { Share2, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SocialPostCard } from './SocialPostCard';
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions';

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📷',
  google_business: '📍',
  linkedin: '💼',
};

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
          Le détail du post s'affichera ici avec les variantes par plateforme.
        </p>
      </div>
    );
  }

  const hasVariants = suggestion.variants && suggestion.variants.length > 0;

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)]">
      {/* Main card */}
      <SocialPostCard
        suggestion={suggestion}
        onApprove={onApprove}
        onReject={onReject}
        onRegenerate={onRegenerate}
        isRegenerating={isRegenerating}
      />

      {/* Platform variants detail */}
      {hasVariants && (
        <div className="border-t border-border pt-3">
          <Tabs defaultValue={suggestion.variants![0].platform}>
            <TabsList className="h-7 w-full justify-start">
              {suggestion.variants!.map(v => (
                <TabsTrigger key={v.platform} value={v.platform} className="text-[10px] h-6 gap-1">
                  <span>{PLATFORM_ICONS[v.platform] || '📱'}</span>
                  <span className="capitalize hidden sm:inline">{v.platform.replace('_', ' ')}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {suggestion.variants!.map(v => (
              <TabsContent key={v.platform} value={v.platform} className="mt-2">
                <div className="space-y-2">
                  <div className="bg-muted/30 rounded p-2 border border-border/50">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {v.caption_fr}
                    </p>
                  </div>
                  {v.cta && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <ExternalLink className="w-3 h-3" />
                      <span>{v.cta}</span>
                    </div>
                  )}
                  {v.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {v.hashtags.map(h => (
                        <span key={h} className="text-[10px] text-primary/70">#{h}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[9px]">{v.format || '1080x1080'}</Badge>
                    <Badge variant="secondary" className="text-[9px] capitalize">{v.status}</Badge>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
