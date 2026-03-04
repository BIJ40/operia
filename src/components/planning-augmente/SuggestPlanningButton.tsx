/**
 * SuggestPlanningButton - Bouton "Suggérer un créneau" avec dialog résultats
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Brain, Loader2 } from 'lucide-react';
import { useSuggestPlanning } from '@/hooks/usePlanningAugmente';
import { SuggestionCard } from './SuggestionCard';

interface SuggestPlanningButtonProps {
  agencyId: string;
  dossierId: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function SuggestPlanningButton({ agencyId, dossierId, variant = 'outline', size = 'sm' }: SuggestPlanningButtonProps) {
  const [open, setOpen] = useState(false);
  const mutation = useSuggestPlanning();

  const handleClick = () => {
    setOpen(true);
    mutation.mutate({ agency_id: agencyId, dossier_id: dossierId });
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} disabled={mutation.isPending}>
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <Brain className="w-4 h-4 mr-1.5" />
        )}
        Suggérer un créneau
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Suggestions de planification
            </DialogTitle>
            <DialogDescription>
              Top 3 créneaux proposés par le moteur d'optimisation (V1 heuristique)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {mutation.isPending && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Analyse en cours...</span>
              </div>
            )}

            {mutation.isError && (
              <div className="text-sm text-destructive p-3 bg-destructive/10 rounded">
                Erreur: {String(mutation.error)}
              </div>
            )}

            {mutation.data?.suggestions?.map((suggestion) => (
              <SuggestionCard
                key={suggestion.rank}
                suggestion={suggestion}
              />
            ))}

            {mutation.data?.meta && (
              <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                Moteur: {mutation.data.meta.engine_version} • 
                Skills: {mutation.data.meta.skills_loaded} • 
                Calibrations: {mutation.data.meta.calibrations_loaded}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
