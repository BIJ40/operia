/**
 * OptimizeWeekButton - Bouton "Scanner & Optimiser" avec dialog résultats
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Zap, Loader2, Clock, Euro, TrendingUp } from 'lucide-react';
import { useOptimizeWeek } from '@/hooks/usePlanningAugmente';
import { MoveCard } from './MoveCard';

interface OptimizeWeekButtonProps {
  agencyId: string;
  weekStart?: string; // ISO date, defaults to current Monday
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function OptimizeWeekButton({ agencyId, weekStart, variant = 'outline', size = 'sm' }: OptimizeWeekButtonProps) {
  const [open, setOpen] = useState(false);
  const mutation = useOptimizeWeek();

  const handleClick = () => {
    setOpen(true);
    mutation.mutate({ agency_id: agencyId, week_start: weekStart ?? getMonday() });
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} disabled={mutation.isPending}>
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <Zap className="w-4 h-4 mr-1.5" />
        )}
        Scanner & Optimiser
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Optimisation semaine
            </DialogTitle>
            <DialogDescription>
              Propositions de modifications pour optimiser le planning
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {mutation.isPending && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Scan en cours...</span>
              </div>
            )}

            {mutation.isError && (
              <div className="text-sm text-destructive p-3 bg-destructive/10 rounded">
                Erreur: {String(mutation.error)}
              </div>
            )}

            {/* Summary */}
            {mutation.data?.summary && (
              <div className="flex gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="font-medium">{mutation.data.summary.moves_count} moves</span>
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Clock className="w-4 h-4" />
                  <span>−{mutation.data.summary.total_gain_minutes} min</span>
                </div>
                {mutation.data.summary.total_gain_ca > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Euro className="w-4 h-4" />
                    <span>+{mutation.data.summary.total_gain_ca}€</span>
                  </div>
                )}
              </div>
            )}

            {mutation.data?.moves?.map((move, i) => (
              <MoveCard key={i} move={move} index={i} />
            ))}

            {mutation.data?.meta && (
              <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                Moteur: {mutation.data.meta.engine_version}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
