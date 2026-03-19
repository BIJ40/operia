/**
 * SocialPostCard — Carte de suggestion dans le panneau détail.
 * Actions : approuver, rejeter, régénérer (avec prompt personnalisé), copier le texte.
 */

import { Check, X, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions';
import { RegenerationPromptPanel, type RegenerationPrompt } from './RegenerationPromptPanel';

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  draft: { label: 'Brouillon', variant: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approuvé', variant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Rejeté', variant: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  archived: { label: 'Archivé', variant: 'bg-gray-100 text-gray-500' },
};

const TOPIC_LABELS: Record<string, string> = {
  awareness_day: 'Journée thématique',
  seasonal_tip: 'Conseil saisonnier',
  realisation: 'Réalisation',
  local_branding: 'Marque & confiance',
};

interface SocialPostCardProps {
  suggestion: SocialSuggestion;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRegenerate: (id: string, prompt?: RegenerationPrompt) => void;
  isRegenerating?: boolean;
}

export function SocialPostCard({ suggestion, onApprove, onReject, onRegenerate, isRegenerating }: SocialPostCardProps) {
  const statusInfo = STATUS_LABELS[suggestion.status] || STATUS_LABELS.draft;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestion.caption_base_fr);
      toast.success('Texte copié');
    } catch {
      toast.error('Impossible de copier');
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground leading-tight">{suggestion.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {suggestion.suggestion_date} • {TOPIC_LABELS[suggestion.topic_type] || suggestion.topic_type}
          </p>
        </div>
        <Badge className={cn('text-[10px] shrink-0', statusInfo.variant)}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Content angle */}
      {suggestion.content_angle && (
        <div className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
          {suggestion.content_angle}
        </div>
      )}

      {/* Caption */}
      <div className="bg-muted/50 rounded-md p-3 border border-border">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {suggestion.caption_base_fr}
        </p>
      </div>

      {/* Hashtags */}
      {suggestion.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestion.hashtags.map(h => (
            <span key={h} className="text-[10px] text-primary">#{h}</span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-1.5">
        {suggestion.universe && suggestion.universe !== 'general' && (
          <Badge variant="outline" className="text-[10px] capitalize">{suggestion.universe}</Badge>
        )}
        {suggestion.is_user_edited && (
          <Badge variant="outline" className="text-[10px]">Modifié</Badge>
        )}
        {suggestion.visual_type && (
          <Badge variant="secondary" className="text-[10px]">{suggestion.visual_type}</Badge>
        )}
      </div>

      {/* Platform variants preview */}
      {suggestion.variants && suggestion.variants.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Variantes plateforme
          </p>
          <div className="flex gap-1">
            {suggestion.variants.map(v => (
              <Badge key={v.id} variant="outline" className="text-[10px] capitalize">
                {v.platform.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 pt-1 border-t border-border">
        {suggestion.status === 'draft' && (
          <>
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => onApprove(suggestion.id)}>
              <Check className="w-3 h-3" /> Approuver
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => onReject(suggestion.id)}>
              <X className="w-3 h-3" /> Rejeter
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCopy}>
          <Copy className="w-3 h-3" /> Copier
        </Button>
      </div>

      {/* Regeneration prompt panel */}
      <RegenerationPromptPanel
        onRegenerate={(prompt) => onRegenerate(suggestion.id, prompt)}
        isRegenerating={isRegenerating}
        disabled={suggestion.status === 'approved'}
      />
    </div>
  );
}
