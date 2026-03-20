/**
 * SocialListView — Vue pipeline éditorial (alternative au calendrier).
 * Colonnes : Brouillons | Approuvés | Planifiés | Publiés
 *
 * La colonne "Planifiés" regroupe les suggestions approved ayant au moins
 * une variante scheduled. "Publiés" = au moins une variante published.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SocialSuggestion } from '@/hooks/useSocialSuggestions';

const STATUS_COLUMNS = [
  { key: 'draft', label: 'Brouillons', color: 'bg-muted' },
  { key: 'approved', label: 'Approuvés', color: 'bg-emerald-50 dark:bg-emerald-950/20' },
  { key: 'scheduled', label: 'Planifiés', color: 'bg-amber-50 dark:bg-amber-950/20' },
  { key: 'published', label: 'Publiés', color: 'bg-sky-50 dark:bg-sky-950/20' },
] as const;

const TOPIC_BADGE_VARIANTS: Record<string, string> = {
  urgence: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  prevention: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  amelioration: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  conseil: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  preuve: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  saisonnier: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  contre_exemple: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  pedagogique: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  prospection: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const TOPIC_LABELS: Record<string, string> = {
  urgence: 'Urgence',
  prevention: 'Prévention',
  amelioration: 'Amélioration',
  conseil: 'Conseil',
  preuve: 'Preuve',
  saisonnier: 'Saison',
  contre_exemple: 'Contre-ex.',
  pedagogique: 'Pédago.',
  prospection: 'Prospection',
};

interface SocialListViewProps {
  suggestions: SocialSuggestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Derive pipeline column from suggestion + variant statuses.
 * Priority: published > scheduled > suggestion.status
 */
function derivePipelineColumn(s: SocialSuggestion): string {
  const variants = s.variants || [];
  if (variants.some(v => v.status === 'published')) return 'published';
  if (variants.some(v => v.status === 'scheduled')) return 'scheduled';
  if (s.status === 'approved') return 'approved';
  return 'draft'; // draft + rejected both go here
}

export function SocialListView({ suggestions, selectedId, onSelect }: SocialListViewProps) {
  const grouped = useMemo(() => {
    const map: Record<string, SocialSuggestion[]> = {
      draft: [], approved: [], scheduled: [], published: [],
    };
    for (const s of suggestions) {
      // Skip rejected in pipeline view (they're archived conceptually)
      if (s.status === 'rejected') continue;
      const col = derivePipelineColumn(s);
      if (map[col]) map[col].push(s);
    }
    return map;
  }, [suggestions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-full">
      {STATUS_COLUMNS.map(col => (
        <div key={col.key} className={cn('rounded-lg p-2', col.color)}>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-foreground">{col.label}</span>
            <Badge variant="secondary" className="text-[10px] h-5">
              {grouped[col.key]?.length || 0}
            </Badge>
          </div>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {(grouped[col.key] || []).map(s => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  'w-full text-left p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors',
                  selectedId === s.id && 'ring-2 ring-primary border-primary',
                )}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                    {s.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={cn(
                    'inline-flex text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                    TOPIC_BADGE_VARIANTS[s.topic_type] || TOPIC_BADGE_VARIANTS.conseil,
                  )}>
                    {TOPIC_LABELS[s.topic_type] || s.topic_type}
                  </span>
                  {s.universe && s.universe !== 'general' && (
                    <span className="text-[9px] text-muted-foreground capitalize">
                      {s.universe}
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground ml-auto">
                    {s.suggestion_date.split('-').slice(1).join('/')}
                  </span>
                </div>
              </button>
            ))}

            {(!grouped[col.key] || grouped[col.key].length === 0) && (
              <div className="text-center text-[10px] text-muted-foreground/50 py-6">
                Aucun post
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
