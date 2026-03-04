/**
 * PlanningAugmenteAdmin - Page admin Planification Augmentée
 * Utilise les données réelles Apogée via usePlanningData (créneaux enrichis)
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Settings, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanningProjects, type PlanningProject } from '@/hooks/usePlanningData';
import { usePlanningData, useApogeeUsersNormalized } from '@/shared/api/apogee/usePlanningData';
import { buildUserMap } from '@/shared/planning/planningMapper';
import { isTechnician } from '@/shared/planning/normalize';
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

  // Data hooks - créneaux enrichis + users depuis le bon hook
  const { creneaux, loading: creneauxLoading } = usePlanningData();
  const { users, loading: usersLoading } = useApogeeUsersNormalized();
  const { data: projectsData, isLoading: projectsLoading } = usePlanningProjects(agencySlug ?? undefined);
  const { data: config, isLoading: configLoading } = useOptimizerConfig(agencyId ?? undefined);

  // Construire la map users complète (pour labels/couleurs)
  const userMap = useMemo(() => buildUserMap(users as any), [users]);

  // Approche hybride robuste (fonctionne pour toutes les agences) :
  // 1. Identifier les users qui ont des créneaux "visite-interv" (terrain réel)
  // 2. Croiser avec le type API pour exclure non-techs (interimaire, commercial, etc.)
  // 3. Résultat = techniciens terrain, sans config manuelle par agence
  const technicians = useMemo(() => {
    // Set des users ayant au moins 1 créneau visite-interv
    const fieldUserIds = new Set<number>();
    for (const c of creneaux) {
      if (c.refType === 'visite-interv') {
        for (const uid of c.usersIds) fieldUserIds.add(uid);
      }
    }

    // Aussi inclure les techniciens typés qui ont des congés (mais pas de visite-interv)
    const techTypedIds = new Set<number>();
    for (const u of users) {
      if (isTechnician(u as any)) {
        techTypedIds.add((u as any).id);
      }
    }

    // Union : techniciens typés OU users terrain (visite-interv)
    // Puis filtrer les types exclus
    const allIds = new Set([...fieldUserIds, ...techTypedIds]);

    return Array.from(allIds)
      .map(id => {
        const info = userMap.get(id);
        return { id, label: info?.label ?? `#${id}`, color: info?.color, type: info?.type };
      })
      // Exclure les types non-terrain même s'ils ont des créneaux
      .filter(t => {
        const type = (t.type || '').toLowerCase();
        return !['interimaire', 'commercial', 'admin', 'assistante', 'assistant', 'utilisateur', 'comptable', 'direction'].includes(type);
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [creneaux, users, userMap]);

  const weights = (config as any)?.weights as Record<string, number> ?? {
    sla: 0.3, ca: 0.2, route: 0.2, coherence: 0.15, equity: 0.1, continuity: 0.05,
  };

  const weekStartISO = useMemo(() => weekStart.toISOString().split('T')[0], [weekStart]);

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
              Données Apogée en temps réel • Timeline horaire
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">V1</Badge>
        </div>
        <div className="flex items-center gap-2">
          {agencyId && (
            <OptimizeWeekButton agencyId={agencyId} weekStart={weekStartISO} variant="outline" size="sm" />
          )}
          {agencyId && selectedDossier && (
            <SuggestPlanningButton agencyId={agencyId} dossierId={selectedDossier.id} variant="default" size="sm" />
          )}
        </div>
      </div>

      {/* No agency warning */}
      {!agencySlug && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">Aucune agence configurée.</p>
          </CardContent>
        </Card>
      )}

      {agencySlug && (
        <>
          {/* Main layout: Dossier search + Planning grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: '600px' }}>
            <div className="lg:col-span-3">
              <DossierSearchPanel
                planifiableProjects={projectsData?.planifiable ?? []}
                allProjects={projectsData?.all ?? []}
                isLoading={projectsLoading}
                selectedDossier={selectedDossier}
                onSelectDossier={setSelectedDossier}
              />
            </div>
            <div className="lg:col-span-9">
              <PlanningGrid
                technicians={technicians}
                creneaux={creneaux}
                isLoading={creneauxLoading || usersLoading}
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
                    <SuggestPlanningButton agencyId={agencyId} dossierId={selectedDossier.id} variant="default" size="sm" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weights config */}
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
