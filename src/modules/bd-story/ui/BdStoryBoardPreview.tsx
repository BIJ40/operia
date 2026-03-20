/**
 * BdStoryBoardPreview — Aperçu grille 3x4 d'une histoire BD
 */
import { GeneratedPanel } from '../types/bdStory.types';
import { BD_STORY_CHARACTERS } from '../data/characters';
import { cn } from '@/lib/utils';

interface Props {
  panels: GeneratedPanel[];
  title?: string;
  className?: string;
}

const FUNCTION_COLORS: Record<string, string> = {
  client_setup: 'bg-blue-50 border-blue-200',
  client_context: 'bg-blue-50 border-blue-200',
  problem_appears: 'bg-amber-50 border-amber-200',
  problem_worsens: 'bg-orange-50 border-orange-300',
  decision_to_call: 'bg-violet-50 border-violet-200',
  call_received: 'bg-green-50 border-green-200',
  scheduling: 'bg-green-50 border-green-200',
  technician_arrival: 'bg-emerald-50 border-emerald-200',
  inspection_diagnosis: 'bg-cyan-50 border-cyan-200',
  repair_action: 'bg-teal-50 border-teal-200',
  result_visible: 'bg-lime-50 border-lime-200',
  cta_moral: 'bg-primary/5 border-primary/20',
};

function getActorLabel(slug: string): string {
  if (slug === 'client') return '👤 Client';
  const char = BD_STORY_CHARACTERS.find(c => c.slug === slug);
  return char ? char.firstName : slug;
}

export function BdStoryBoardPreview({ panels, title, className }: Props) {
  if (!panels || panels.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      )}
      <div className="grid grid-cols-4 gap-2">
        {panels.map((panel) => (
          <div
            key={panel.number}
            className={cn(
              'rounded-lg border p-2.5 flex flex-col gap-1.5 min-h-[100px] transition-shadow hover:shadow-sm',
              FUNCTION_COLORS[panel.narrativeFunction] || 'bg-muted/30 border-border'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground/70 tabular-nums">
                {panel.number}
              </span>
              <span className="text-[9px] text-muted-foreground/50 truncate max-w-[80px]">
                {panel.narrativeFunction.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs font-medium text-foreground leading-snug flex-1">
              {panel.text || '…'}
            </p>
            <div className="flex flex-wrap gap-1">
              {panel.actors.map((actor, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-background/80 text-muted-foreground">
                  {getActorLabel(actor)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
