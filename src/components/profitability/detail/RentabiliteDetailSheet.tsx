/**
 * RentabiliteDetailSheet — Side sheet showing full profitability detail for a project.
 * 
 * RULES:
 * - Opening the sheet = read/compute locally, NO snapshot persistence
 * - "Recalculer" button = explicit persistence (always as 'draft')
 * - "Valider" = marks snapshot as 'validated'
 */
import { useState, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Loader2, CheckCircle } from 'lucide-react';
import { SyntheseSection } from './SyntheseSection';
import { LaborCostSection } from './LaborCostSection';
import { ProjectCostsSection } from './ProjectCostsSection';
import { OverheadSection } from './OverheadSection';
import { ReliabilitySection } from './ReliabilitySection';
import { DocumentsSection } from './DocumentsSection';
import { ProjectCostFormDialog } from '../dialogs/ProjectCostFormDialog';
import { CostProfileEditorDialog } from '../dialogs/CostProfileEditorDialog';
import { OverheadRuleFormDialog } from '../dialogs/OverheadRuleFormDialog';
import { useProjectApogeeData } from '../hooks/useProjectApogeeData';
import { useProjectProfitability, useProjectProfitabilitySnapshot } from '@/hooks/useProjectProfitability';
import { useProjectCostsMutations } from '../hooks/useProjectCostsMutations';
import { useOverheadMutations } from '../hooks/useOverheadMutations';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useAuth } from '@/contexts/AuthContext';
import {
  listProjectCosts,
  listOverheadRules,
  listCostProfiles,
  listCollaboratorsMinimal,
  updateSnapshotValidation,
  upsertSnapshot,
} from '@/repositories/profitabilityRepository';
import { computeProjectProfitability } from '@/statia/shared/projectProfitabilityEngine';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CostValidation, ProjectCost, AgencyOverheadRule, ProfitabilitySnapshot } from '@/types/projectProfitability';
import type { CollaboratorMinimal } from '@/repositories/profitabilityRepository';

interface RentabiliteDetailSheetProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RentabiliteDetailSheet({ projectId, open, onOpenChange }: RentabiliteDetailSheetProps) {
  const { agencyId } = useEffectiveAuth();
  const { user } = useAuth();
  const qc = useQueryClient();

  // ── Dialog states ──
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<ProjectCost | undefined>();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState<{ collaboratorId: string; name: string } | null>(null);
  const [overheadDialogOpen, setOverheadDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AgencyOverheadRule | undefined>();
  const [recalculating, setRecalculating] = useState(false);

  // ── Data loading ──

  // Apogée data
  const { data: apogeeData, isLoading: apogeeLoading } = useProjectApogeeData(open ? projectId : null);

  // Compute profitability (live, NO persistence)
  const { data: result, isLoading: computeLoading } = useProjectProfitability({
    projectId: projectId ?? '',
    factures: apogeeData?.factures ?? [],
    interventions: apogeeData?.interventions ?? [],
    isProjectClosed: false,
    persistSnapshot: false, // NEVER persist on open
    enabled: open && !!projectId && !!apogeeData,
  });

  // Last persisted snapshot (for staleness comparison)
  const { data: snapshot } = useProjectProfitabilitySnapshot(projectId ?? '');

  // Project costs from Supabase
  const { data: projectCosts = [] } = useQuery({
    queryKey: ['project-costs', agencyId, projectId],
    enabled: open && !!agencyId && !!projectId,
    queryFn: () => listProjectCosts(agencyId!, projectId!),
  });

  // Overhead rules
  const { data: overheadRules = [] } = useQuery({
    queryKey: ['overhead-rules', agencyId],
    enabled: open && !!agencyId,
    queryFn: () => listOverheadRules(agencyId!),
  });

  // Cost profiles (for CostProfileEditorDialog preload)
  const { data: costProfiles = [] } = useQuery({
    queryKey: ['cost-profiles', agencyId],
    enabled: open && !!agencyId,
    queryFn: () => listCostProfiles(agencyId!),
  });

  // Collaborators for technician resolution
  const { data: collaborators = [] } = useQuery<CollaboratorMinimal[]>({
    queryKey: ['collaborators-minimal', agencyId],
    enabled: open && !!agencyId,
    queryFn: () => listCollaboratorsMinimal(agencyId!),
  });

  // Build map: apogee_user_id (string) → collaborator
  const collaboratorMap = useMemo(() => {
    const map = new Map<string, CollaboratorMinimal>();
    for (const c of collaborators) {
      if (c.apogee_user_id != null) {
        map.set(String(c.apogee_user_id), c);
      }
    }
    return map;
  }, [collaborators]);

  const { validateCost, deleteCost } = useProjectCostsMutations(projectId ?? '');
  const { deleteRule: deleteOverhead, validateRule: validateOverhead } = useOverheadMutations();

  // Check if snapshot is outdated
  const isSnapshotOutdated = useMemo(() => {
    if (!result || !snapshot?.apogee_data_hash) return false;
    return result.apogeeDataHash !== snapshot.apogee_data_hash;
  }, [result, snapshot]);

  const hasNonProrated = result?.flags.includes('overhead_not_prorated') ?? false;
  const isLoading = apogeeLoading || computeLoading;

  // ── Explicit recalculate (persists as DRAFT) ──
  const handleRecalculate = useCallback(async () => {
    if (!agencyId || !projectId || !apogeeData) return;
    setRecalculating(true);
    try {
      const [freshCostProfiles, freshProjectCosts, freshOverheadRules] = await Promise.all([
        listCostProfiles(agencyId),
        listProjectCosts(agencyId, projectId),
        listOverheadRules(agencyId),
      ]);

      const computeResult = computeProjectProfitability({
        projectId,
        factures: apogeeData.factures,
        interventions: apogeeData.interventions,
        costProfiles: freshCostProfiles,
        projectCosts: freshProjectCosts,
        overheadRules: freshOverheadRules,
        isProjectClosed: false,
      });

      // Always persist as draft
      const snapshotData: Omit<ProfitabilitySnapshot, 'id' | 'created_at'> = {
        agency_id: agencyId,
        project_id: projectId,
        computed_at: computeResult.computedAt,
        ca_invoiced_ht: computeResult.caInvoicedHT,
        ca_collected_ttc: computeResult.caCollectedTTC,
        cost_labor: computeResult.costLabor,
        cost_purchases: computeResult.costPurchases,
        cost_subcontracting: computeResult.costSubcontracting,
        cost_other: computeResult.costOther,
        cost_overhead: computeResult.costOverhead,
        cost_total: computeResult.costTotal,
        gross_margin: computeResult.grossMargin,
        net_margin: computeResult.netMargin,
        margin_pct: computeResult.marginPct,
        hours_total: computeResult.hoursTotal,
        completeness_score: computeResult.completenessScore,
        reliability_level: computeResult.reliabilityLevel,
        flags_json: computeResult.flags,
        validation_status: 'draft', // ALWAYS draft
        created_by: user?.id ?? null,
        apogee_data_hash: computeResult.apogeeDataHash,
        apogee_last_sync_at: new Date().toISOString(),
        version: 1, // Managed by repository
        previous_snapshot_id: null, // Managed by repository
        validated_by: null,
        validated_at: null,
      };

      await upsertSnapshot(snapshotData);

      // Invalidate all related queries
      qc.invalidateQueries({ queryKey: ['project-profitability'] });
      qc.invalidateQueries({ queryKey: ['project-profitability-snapshot'] });
      qc.invalidateQueries({ queryKey: ['project-apogee-data'] });
      qc.invalidateQueries({ queryKey: ['rentabilite-list'] });
      qc.invalidateQueries({ queryKey: ['project-costs'] });

      toast.success('Rentabilité recalculée (brouillon)');
    } catch {
      toast.error('Erreur lors du recalcul');
    } finally {
      setRecalculating(false);
    }
  }, [agencyId, projectId, apogeeData, user?.id, qc]);

  const handleValidateSnapshot = async () => {
    if (!snapshot || !user?.id) return;
    try {
      await updateSnapshotValidation(snapshot.id, 'validated', user.id);
      qc.invalidateQueries({ queryKey: ['project-profitability-snapshot', agencyId, projectId] });
      qc.invalidateQueries({ queryKey: ['rentabilite-list'] });
      toast.success('Rentabilité validée');
    } catch {
      toast.error('Erreur lors de la validation');
    }
  };

  // ── Cost actions ──
  const handleValidateCost = (id: string, status: CostValidation) => validateCost.mutate({ id, status });
  const handleDeleteCost = (id: string) => deleteCost.mutate(id);
  const handleAddCost = () => { setEditingCost(undefined); setCostDialogOpen(true); };
  const handleEditCost = (cost: ProjectCost) => { setEditingCost(cost); setCostDialogOpen(true); };

  // ── Profile actions ──
  const handleEditProfile = (collaboratorId: string, collaboratorName: string) => {
    setProfileTarget({ collaboratorId, name: collaboratorName });
    setProfileDialogOpen(true);
  };

  // Find existing profile for the selected collaborator
  const existingProfile = profileTarget
    ? costProfiles.find(p => p.collaborator_id === profileTarget.collaboratorId)
    : undefined;

  // ── Overhead actions ──
  const handleAddOverhead = () => { setEditingRule(undefined); setOverheadDialogOpen(true); };
  const handleEditOverhead = (rule: AgencyOverheadRule) => { setEditingRule(rule); setOverheadDialogOpen(true); };
  const handleDeleteOverhead = (id: string) => deleteOverhead.mutate(id);
  const handleValidateOverhead = (id: string, status: CostValidation) => validateOverhead.mutate({ id, status });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-lg">
                Rentabilité — Dossier {projectId}
              </SheetTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRecalculate}
                  disabled={isLoading || recalculating}
                >
                  {(isLoading || recalculating)
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    : <Calculator className="h-3.5 w-3.5 mr-1" />}
                  Recalculer
                </Button>
                {snapshot && snapshot.validation_status === 'draft' && (
                  <Button size="sm" variant="default" onClick={handleValidateSnapshot}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Valider
                  </Button>
                )}
                {snapshot?.validation_status === 'validated' && (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                    Validé
                  </Badge>
                )}
              </div>
            </div>
          </SheetHeader>

          {isLoading && !result ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="synthese" className="mt-2">
              <TabsList className="w-full grid grid-cols-6 h-9">
                <TabsTrigger value="synthese" className="text-xs">Synthèse</TabsTrigger>
                <TabsTrigger value="labor" className="text-xs">Main d'œuvre</TabsTrigger>
                <TabsTrigger value="costs" className="text-xs">Coûts</TabsTrigger>
                <TabsTrigger value="overhead" className="text-xs">Charges</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
                <TabsTrigger value="reliability" className="text-xs">Fiabilité</TabsTrigger>
              </TabsList>

              <TabsContent value="synthese" className="mt-4">
                <SyntheseSection
                  result={result ?? null}
                  snapshot={snapshot ?? null}
                  isSnapshotOutdated={isSnapshotOutdated}
                />
              </TabsContent>

              <TabsContent value="labor" className="mt-4">
                <LaborCostSection
                  laborDetail={result?.laborDetail ?? []}
                  totalCostLabor={result?.costLabor ?? 0}
                  collaboratorMap={collaboratorMap}
                  onEditProfile={handleEditProfile}
                />
              </TabsContent>

              <TabsContent value="costs" className="mt-4">
                <ProjectCostsSection
                  costs={projectCosts}
                  costPurchasesAll={result?.costPurchasesAll ?? 0}
                  costSubcontractingAll={result?.costSubcontractingAll ?? 0}
                  costOtherAll={result?.costOtherAll ?? 0}
                  costPurchasesValidated={result?.costPurchases ?? 0}
                  costSubcontractingValidated={result?.costSubcontracting ?? 0}
                  costOtherValidated={result?.costOther ?? 0}
                  onValidate={handleValidateCost}
                  onDelete={handleDeleteCost}
                  onAdd={handleAddCost}
                  onEdit={handleEditCost}
                />
              </TabsContent>

              <TabsContent value="overhead" className="mt-4">
                <OverheadSection
                  rules={overheadRules}
                  totalOverhead={result?.costOverhead ?? 0}
                  hasNonProrated={hasNonProrated}
                  onAdd={handleAddOverhead}
                  onEdit={handleEditOverhead}
                  onDelete={handleDeleteOverhead}
                  onValidate={handleValidateOverhead}
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                {projectId && <DocumentsSection projectId={projectId} />}
              </TabsContent>

              <TabsContent value="reliability" className="mt-4">
                <ReliabilitySection
                  flags={result?.flags ?? []}
                  completenessScore={result?.completenessScore ?? 0}
                />
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Dialogs ── */}
      {projectId && agencyId && (
        <>
          <ProjectCostFormDialog
            open={costDialogOpen}
            onOpenChange={setCostDialogOpen}
            projectId={projectId}
            agencyId={agencyId}
            cost={editingCost}
          />
          {profileTarget && (
            <CostProfileEditorDialog
              open={profileDialogOpen}
              onOpenChange={setProfileDialogOpen}
              collaboratorId={profileTarget.collaboratorId}
              collaboratorName={profileTarget.name}
              agencyId={agencyId}
              existingProfile={existingProfile}
            />
          )}
          <OverheadRuleFormDialog
            open={overheadDialogOpen}
            onOpenChange={setOverheadDialogOpen}
            agencyId={agencyId}
            rule={editingRule}
          />
        </>
      )}
    </>
  );
}
