/**
 * PlanningAugmenteAdmin v2 - Module Planification Augmentée
 * Technicien discovery: collaborators actifs non-bureau avec apogee_user_id
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Settings, Loader2, AlertCircle } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';
import { usePlanningProjects, type PlanningProject } from '@/hooks/usePlanningData';
import { usePlanningData, useApogeeUsersNormalized } from '@/shared/api/apogee/usePlanningData';
import { buildUserMap } from '@/shared/planning/planningMapper';
import { isActiveUser, isExcludedOfficeType } from '@/shared/planning/normalize';
import { useOptimizerConfig } from '@/hooks/usePlanningAugmente';
import { useTechCompetenceMatch } from '@/hooks/useTechCompetenceMatch';
import { DossierSearchPanel } from './DossierSearchPanel';
import { PlanningGrid } from './PlanningGrid';
import { SuggestPlanningButton } from './SuggestPlanningButton';
import { OptimizeWeekButton } from './OptimizeWeekButton';
import { startOfWeek } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const WEIGHT_LABELS: Record<string, string> = {
  coherence: 'Cohérence technique',
  equity: 'Équité charge',
  route: 'Temps de route',
  gap: 'Trous planning',
  proximity: 'Proximité temporelle',
  continuity: 'Continuité technicien',
};

function getMonday(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

export default function PlanningAugmenteAdmin() {
  const { agencyId, agence: agencySlug } = useProfile();
  const [selectedDossier, setSelectedDossier] = useState<PlanningProject | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(getMonday);

  const { creneaux, loading: creneauxLoading } = usePlanningData();
  const { users, loading: usersLoading } = useApogeeUsersNormalized();
  const { data: projectsData, isLoading: projectsLoading } = usePlanningProjects(agencySlug ?? undefined);
  const { data: config, isLoading: configLoading } = useOptimizerConfig(agencyId ?? undefined);
  const { isCompatible: checkCompat, getMatchedCompetences: getMatched, techRoster } = useTechCompetenceMatch(agencyId ?? undefined);

  // Load collaborators directly for robust tech list
  const { data: collabsData } = useQuery({
    queryKey: ['planning-collabs', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, apogee_user_id, first_name, last_name, type, role, leaving_date')
        .eq('agency_id', agencyId)
        .not('apogee_user_id', 'is', null)
        .is('leaving_date', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });

  const userMap = useMemo(() => buildUserMap(users as any), [users]);

  // TECH LIST: Single source of truth = active collaborators with apogee_user_id, excluding office types
  const technicians = useMemo(() => {
    const result: { id: number; label: string; color?: string; type?: string; collaboratorId?: string }[] = [];
    const seen = new Set<number>();

    for (const collab of (collabsData || [])) {
      const apogeeId = Number(collab.apogee_user_id);
      if (!Number.isFinite(apogeeId) || seen.has(apogeeId)) continue;
      if (isExcludedOfficeType(collab.type) || isExcludedOfficeType(collab.role)) continue;
      seen.add(apogeeId);

      const info = userMap.get(apogeeId);
      const name = `${collab.first_name || ''} ${collab.last_name || ''}`.trim() || info?.label || `#${apogeeId}`;

      result.push({
        id: apogeeId,
        label: name,
        color: info?.color,
        type: info?.type || collab.type,
        collaboratorId: collab.id,
      });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [collabsData, userMap]);

  const weights = (config as any)?.weights as Record<string, number> ?? {
    coherence: 0.25, equity: 0.20, route: 0.15, gap: 0.15, proximity: 0.10, continuity: 0.15,
  };

  const weekStartISO = useMemo(() => weekStart.toISOString().split('T')[0], [weekStart]);

  // Univers du dossier sélectionné
  const selectedUniverses = useMemo(() => {
    const universes = [...(selectedDossier?.data?.universes ?? [])];
    const label = (selectedDossier as any)?.label || (selectedDossier?.data as any)?.label || '';
    if (label) {
      const words = label.split(/[\s\-\/\+,;:]+/)
        .map((w: string) => w.trim().toLowerCase())
        .filter((w: string) => w.length > 3 && !universes.some(u => u.toLowerCase() === w));
      universes.push(...words);
    }
    return universes;
  }, [selectedDossier]);

  const techIsCompatible = useMemo(() => {
    if (!selectedDossier || selectedUniverses.length === 0) return undefined;
    return (techId: number) => checkCompat(techId, selectedUniverses);
  }, [selectedDossier, selectedUniverses, checkCompat]);

  const techGetMatched = useMemo(() => {
    if (!selectedDossier || selectedUniverses.length === 0) return undefined;
    return (techId: number) => getMatched(techId, selectedUniverses);
  }, [selectedDossier, selectedUniverses, getMatched]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Brain className="w-6 h-6 text-primary" /></div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Planification Augmentée</h2>
            <p className="text-sm text-muted-foreground">
              Moteur v2 • HARD constraints + SOFT scoring • {technicians.length} techniciens
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">V2</Badge>
        </div>
        <div className="flex items-center gap-2">
          {agencyId && <OptimizeWeekButton agencyId={agencyId} weekStart={weekStartISO} variant="outline" size="sm" />}
          {agencyId && selectedDossier && <SuggestPlanningButton agencyId={agencyId} dossierId={selectedDossier.id} variant="default" size="sm" />}
        </div>
      </div>

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
                isCompatible={techIsCompatible}
                getMatchedCompetences={techGetMatched}
              />
            </div>
          </div>

          {selectedDossier && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Dossier : {selectedDossier.ref} — {selectedDossier.label}
                    </span>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {selectedDossier.clientName} • {selectedDossier.ville}
                    </span>
                    {selectedUniverses.length > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Univers :</span>
                        {selectedUniverses.map(u => (
                          <Badge key={u} variant="outline" className="text-[10px] px-1.5 py-0">{u}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {agencyId && <SuggestPlanningButton agencyId={agencyId} dossierId={selectedDossier.id} variant="default" size="sm" />}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4" />Pondérations moteur v2</CardTitle>
              <CardDescription className="text-xs">Poids des critères SOFT (filtrage HARD en amont)</CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(weights).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span className="text-xs text-muted-foreground">{WEIGHT_LABELS[key] ?? key}</span>
                      <span className="text-sm font-mono font-medium text-foreground">{((value as number) * 100).toFixed(0)}%</span>
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
