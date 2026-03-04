/**
 * PlanningAugmenteAdmin - Page admin Planification Augmentée
 * Vue complète : recherche dossier + grille planning + suggestion IA + optimisation
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Settings, Loader2, Zap, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanningProjects, usePlanningTechnicians, usePlanningSlots, type PlanningProject } from '@/hooks/usePlanningData';
import { useOptimizerConfig } from '@/hooks/usePlanningAugmente';
import { DossierSearchPanel } from './DossierSearchPanel';
import { PlanningGrid } from './PlanningGrid';
import { SuggestPlanningButton } from './SuggestPlanningButton';
import { OptimizeWeekButton } from './OptimizeWeekButton';
import { startOfWeek } from 'date-fns';

const WEIGHT_LABELS: Record<string, string> = {
  sla: 'SLA / Urgence',
  ca: 'CA / Marge',
  route: 'Temps de route',
  coherence: 'Cohérence technique',
  equity: 'Équité charge',
  continuity: 'Continuité technicien',
};

function getMonday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

export default function PlanningAugmenteAdmin() {
  const { agencyId, agence: agencySlug } = useAuth();
  const [selectedDossier, setSelectedDossier] = useState<PlanningProject | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getMonday);

  // Data hooks
  const { data: projectsData, isLoading: projectsLoading } = usePlanningProjects(agencySlug ?? undefined);
  const { data: technicians, isLoading: techLoading } = usePlanningTechnicians(agencySlug ?? undefined);
  const { data: slots, isLoading: slotsLoading } = usePlanningSlots(agencySlug ?? undefined);
  const { data: config, isLoading: configLoading } = useOptimizerConfig(agencyId ?? undefined);

  const weights = (config as any)?.weights as Record<string, number> ?? {
    sla: 0.3, ca: 0.2, route: 0.2, coherence: 0.15, equity: 0.1, continuity: 0.05,
  };

  const weekStartISO = useMemo(() => weekStart.toISOString().split('T')[0], [weekStart]);

  const isDataReady = !projectsLoading && !techLoading && !slotsLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Planification Augmentée</h2>
            <p className="text-sm text-muted-foreground">
              Données Apogée en temps réel • Moteur V1 heuristique
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">V1</Badge>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {agencyId && (
            <OptimizeWeekButton
              agencyId={agencyId}
              weekStart={weekStartISO}
              variant="outline"
              size="sm"
            />
          )}
          {agencyId && selectedDossier && (
            <SuggestPlanningButton
              agencyId={agencyId}
              dossierId={selectedDossier.id}
              variant="default"
              size="sm"
            />
          )}
        </div>
      </div>

      {/* No agency warning */}
      {!agencySlug && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">
              Aucune agence configurée. Impossible de charger les données Apogée.
            </p>
          </CardContent>
        </Card>
      )}

      {agencySlug && (
        <>
          {/* Main layout: Dossier search + Planning grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: '500px' }}>
            {/* Left panel: Dossier search */}
            <div className="lg:col-span-4 xl:col-span-3">
              <DossierSearchPanel
                planifiableProjects={projectsData?.planifiable ?? []}
                allProjects={projectsData?.all ?? []}
                isLoading={projectsLoading}
                selectedDossier={selectedDossier}
                onSelectDossier={setSelectedDossier}
              />
            </div>

            {/* Right panel: Planning grid */}
            <div className="lg:col-span-8 xl:col-span-9">
              <PlanningGrid
                technicians={technicians ?? []}
                slots={slots ?? []}
                isLoading={techLoading || slotsLoading}
                weekStart={weekStart}
                onWeekChange={setWeekStart}
              />
            </div>
          </div>

          {/* Selected dossier info */}
          {selectedDossier && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Dossier sélectionné : {selectedDossier.ref} — {selectedDossier.label}
                    </span>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {selectedDossier.clientName} • {selectedDossier.ville}
                    </span>
                  </div>
                  {agencyId && (
                    <SuggestPlanningButton
                      agencyId={agencyId}
                      dossierId={selectedDossier.id}
                      variant="default"
                      size="sm"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weights config (collapsible) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Pondérations du moteur
              </CardTitle>
              <CardDescription className="text-xs">
                Poids relatifs des critères d'optimisation (somme = 1.0)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(weights).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground">{WEIGHT_LABELS[key] ?? key}</span>
                      <span className="text-sm font-mono font-medium text-foreground">
                        {((value as number) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
