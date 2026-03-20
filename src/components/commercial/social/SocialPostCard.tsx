/**
 * SocialPostCard — Carte de suggestion dans le panneau détail.
 * Actions : approuver, rejeter, copier le texte, reformuler, renvoyer webhook.
 */

import { useState } from 'react';
import { Check, X, Copy, Loader2, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions';

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  draft: { label: 'Brouillon', variant: 'bg-muted text-muted-foreground' },
  approved: { label: 'Approuvé', variant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Rejeté', variant: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  archived: { label: 'Archivé', variant: 'bg-gray-100 text-gray-500' },
};

const TOPIC_LABELS: Record<string, string> = {
  urgence: 'Urgence',
  prevention: 'Prévention',
  amelioration: 'Amélioration',
  conseil: 'Conseil pratique',
  preuve: 'Preuve & réassurance',
  saisonnier: 'Saisonnier',
  contre_exemple: 'Contre-exemple',
  pedagogique: 'Pédagogique',
  prospection: 'Prospection & Marque',
};

interface SocialPostCardProps {
  suggestion: SocialSuggestion;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRegenerate: (id: string) => void;
  isRegenerating?: boolean;
}

export function SocialPostCard({ suggestion, onApprove, onReject, onRegenerate, isRegenerating }: SocialPostCardProps) {
  const statusInfo = STATUS_LABELS[suggestion.status] || STATUS_LABELS.draft;
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // Normalize hashtags: strip any leading #/## and re-add single #
  const normalizeTag = (h: string) => `#${h.replace(/^#+/, '')}`;

  const fullCopyText = [
    suggestion.caption_base_fr,
    suggestion.hashtags?.length > 0 ? suggestion.hashtags.map(normalizeTag).join(' ') : '',
  ].filter(Boolean).join('\n\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCopyText);
      toast.success('Texte + hashtags copiés');
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const handleResendWebhook = async () => {
    setIsSendingWebhook(true);
    try {
      const { error, data } = await supabase.functions.invoke('dispatch-social-webhook', {
        body: { suggestion_id: suggestion.id, agency_id: suggestion.agency_id },
      });
      if (error || data?.error) {
        toast.error('Échec de l\'envoi webhook : ' + (error?.message || data?.error));
      } else {
        toast.success('Webhook renvoyé avec succès (PUBLI)');
      }
    } catch (err: any) {
      toast.error('Erreur webhook : ' + err.message);
    } finally {
      setIsSendingWebhook(false);
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

      {/* Caption + hashtags with copy icon */}
      <div className="relative group bg-muted/50 rounded-md p-3 pr-9 border border-border">
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Copier texte + hashtags"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {suggestion.caption_base_fr}
        </p>
        {suggestion.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
            {suggestion.hashtags.map(h => (
              <span key={h} className="text-[10px] text-primary">#{h}</span>
            ))}
          </div>
        )}
      </div>

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

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
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
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => onRegenerate(suggestion.id)}
          disabled={isRegenerating || suggestion.status === 'approved'}
        >
          {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Reformuler
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCopy}>
          <Copy className="w-3 h-3" /> Copier
        </Button>
        {suggestion.status === 'approved' && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleResendWebhook}
            disabled={isSendingWebhook}
          >
            {isSendingWebhook ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Renvoyer webhook
          </Button>
        )}
      </div>
    </div>
  );
}
