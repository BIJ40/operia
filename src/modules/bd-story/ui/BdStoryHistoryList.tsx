/**
 * BdStoryHistoryList — Liste des histoires générées
 */
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BookImage, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoryRow {
  id: string;
  title: string;
  summary: string | null;
  universe: string;
  technician_slug: string;
  tone: string | null;
  status: string;
  created_at: string;
}

const UNIVERSE_LABELS: Record<string, string> = {
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  serrurerie: 'Serrurerie',
  vitrerie: 'Vitrerie',
  menuiserie: 'Menuiserie',
  peinture_renovation: 'Peinture',
};

const UNIVERSE_COLORS: Record<string, string> = {
  plomberie: 'bg-blue-100 text-blue-700',
  electricite: 'bg-amber-100 text-amber-700',
  serrurerie: 'bg-red-100 text-red-700',
  vitrerie: 'bg-cyan-100 text-cyan-700',
  menuiserie: 'bg-emerald-100 text-emerald-700',
  peinture_renovation: 'bg-violet-100 text-violet-700',
};

interface Props {
  stories: StoryRow[];
  selectedId?: string | null;
  onSelect: (story: StoryRow) => void;
  isLoading?: boolean;
}

export function BdStoryHistoryList({ stories, selectedId, onSelect, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
          <BookImage className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Aucune histoire générée.</p>
        <p className="text-xs text-muted-foreground/60">Utilisez le formulaire ci-dessus pour créer votre première BD.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {stories.map(story => (
        <button
          key={story.id}
          onClick={() => onSelect(story)}
          className={cn(
            'w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-all',
            'hover:bg-accent/50 hover:shadow-sm active:scale-[0.99]',
            selectedId === story.id && 'ring-2 ring-primary/30 bg-primary/5 border-primary/20'
          )}
        >
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground truncate">{story.title}</p>
            <div className="flex items-center gap-2">
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', UNIVERSE_COLORS[story.universe] || 'bg-muted text-muted-foreground')}>
                {UNIVERSE_LABELS[story.universe] || story.universe}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(story.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        </button>
      ))}
    </div>
  );
}
