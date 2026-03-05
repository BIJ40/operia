/**
 * SuggestPlanningButton v2 - Affiche suggestions + alternatives + blockers
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, AlertTriangle, Info } from 'lucide-react';
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

  const data = mutation.data;

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Brain className="w-4 h-4 mr-1.5" />}
        Suggérer un créneau
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Suggestions de planification
            </DialogTitle>
            <DialogDescription>
              Moteur {data?.meta?.engine_version || 'v2'} • Contraintes HARD + scoring SOFT
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
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

            {data && (
              <Tabs defaultValue="top3">
                <TabsList className="w-full">
                  <TabsTrigger value="top3" className="flex-1 text-xs">
                    Top 3 ({data.suggestions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="alternatives" className="flex-1 text-xs">
                    Alternatives ({data.alternatives?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="blockers" className="flex-1 text-xs">
                    Blocages ({data.blockers?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="top3" className="space-y-3 mt-2">
                  {(data.suggestions || []).length === 0 && (
                    <div className="text-sm text-muted-foreground p-4 text-center bg-muted/50 rounded">
                      <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                      Aucune suggestion possible. Vérifiez les compétences des techniciens et leur disponibilité.
                    </div>
                  )}
                  {(data.suggestions || []).map(s => <SuggestionCard key={s.rank} suggestion={s} />)}
                </TabsContent>

                <TabsContent value="alternatives" className="space-y-3 mt-2">
                  {(data.alternatives || []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune alternative</p>
                  )}
                  {(data.alternatives || []).map(s => <SuggestionCard key={s.rank} suggestion={s} />)}
                </TabsContent>

                <TabsContent value="blockers" className="space-y-2 mt-2">
                  {(data.blockers || []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun blocage détecté</p>
                  )}
                  {(data.blockers || []).map((b, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{b.techName}</span>
                        <span className="text-muted-foreground ml-1">— {b.reason}</span>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            )}

            {/* Meta */}
            {data?.meta && (
              <div className="text-[10px] text-muted-foreground border-t pt-2 mt-2 flex flex-wrap gap-x-3">
                <span>Moteur: {data.meta.engine_version}</span>
                <span>Techs: {data.meta.techs_total} ({data.meta.techs_with_skills} avec compétences)</span>
                <span>Univers: {data.meta.dossier_universes?.join(', ') || 'non défini'}</span>
                <span>Durée estimée: {data.meta.estimated_duration}min</span>
                <span>Candidats: {data.meta.candidates_evaluated}</span>
                <span>Blocages HARD: {data.meta.hard_blocked}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
