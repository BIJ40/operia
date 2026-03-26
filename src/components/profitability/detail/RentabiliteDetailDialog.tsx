/**
 * RentabiliteDetailDialog — Full profitability detail for a project.
 * v2: Dialog (not Sheet), enriched header with client/apporteur/address,
 * inline editing for costs, visit breakdown, PDF documents, RT treatment.
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calculator, Loader2, CheckCircle, MapPin, User, Building2, Phone, Mail,
  FileText, Download, Clock, Users, Truck, AlertTriangle, Info,
} from 'lucide-react';
import { SyntheseSection } from './SyntheseSection';
import { LaborCostSection } from './LaborCostSection';
import { ProjectCostsSection } from './ProjectCostsSection';
import { OverheadSection } from './OverheadSection';
import { ReliabilitySection } from './ReliabilitySection';
import { ProjectCostFormDialog } from '../dialogs/ProjectCostFormDialog';
import { CostProfileEditorDialog } from '../dialogs/CostProfileEditorDialog';
import { OverheadRuleFormDialog } from '../dialogs/OverheadRuleFormDialog';
import { useProjectApogeeData, DEFAULT_HOURLY_RATE } from '../hooks/useProjectApogeeData';
import { useProjectEnrichedData } from '../hooks/useProjectEnrichedData';
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
import { cn } from '@/lib/utils';
import { formatCurrency, formatHours } from '../constants';
import type { CostValidation, ProjectCost, AgencyOverheadRule, ProfitabilitySnapshot } from '@/types/projectProfitability';
import type { CollaboratorMinimal } from '@/repositories/profitabilityRepository';
import type { VisiteDetail } from '../hooks/useProjectApogeeData';
import type { NormalizedDoc } from '@/services/normalizeGeneratedDocs';

interface RentabiliteDetailDialogProps {
  projectId: string | null;
  /** Project reference (for apiGetProjectByRef enrichment) */
  projectRef: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Visit Breakdown Component ──────────────────────────────

function VisiteBreakdown({
  visites,
  collaboratorMap,
}: {
  visites: VisiteDetail[];
  collaboratorMap: Map<string, CollaboratorMinimal>;
}) {
  if (visites.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Aucune visite trouvée</p>;
  }

  const resolveName = (id: string) => {
    const c = collaboratorMap.get(id);
    return c ? `${c.last_name} ${c.first_name}` : `Tech. ${id}`;
  };

  // Group: RT vs other
  const rtVisites = visites.filter(v => v.isRT);
  const workVisites = visites.filter(v => !v.isRT);

  const renderVisiteRow = (v: VisiteDetail) => (
    <div key={v.id} className={cn(
      'flex items-center gap-3 p-2.5 rounded-lg text-sm',
      v.isRT ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'bg-muted/40',
    )}>
      <div className="flex items-center gap-1.5 shrink-0">
        {v.isRT ? <Truck className="h-3.5 w-3.5 text-blue-500" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
        <Badge variant="outline" className={cn('text-[10px]', v.isRT ? 'border-blue-300 text-blue-600' : '')}>
          {v.isRT ? 'RT' : v.type}
        </Badge>
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">{v.label}</span>
        {v.date && <span className="text-xs text-muted-foreground">{new Date(v.date).toLocaleDateString('fr-FR')}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0 text-xs">
        <span className="tabular-nums font-medium">
          {v.durationMinutes >= 60 ? `${(v.durationMinutes / 60).toFixed(1)}h` : `${Math.round(v.durationMinutes)}min`}
        </span>
        <span className="text-muted-foreground">
          <Users className="h-3 w-3 inline mr-0.5" />
          {v.technicianIds.map(id => resolveName(id)).join(', ')}
        </span>
      </div>
    </div>
  );

  // RT summary: 1h à 35€ + 15€ carburant = 50€ par RT
  const rtCount = rtVisites.length;
  const rtCost = rtCount * 50; // Forfait RT

  return (
    <div className="space-y-4">
      {workVisites.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Interventions travaux</p>
          {workVisites.map(renderVisiteRow)}
        </div>
      )}
      {rtVisites.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Relevés techniques</p>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {rtCount} RT × 50 € = {formatCurrency(rtCost)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50/40 dark:bg-blue-950/15 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Coût forfaitaire RT : 1h à {DEFAULT_HOURLY_RATE}€ + 15€ carburant = 50€/RT
          </div>
          {rtVisites.map(renderVisiteRow)}
        </div>
      )}

      {/* Summary */}
      <Separator />
      <div className="flex justify-between text-sm font-medium">
        <span>Total visites : {visites.length}</span>
        <span>Durée totale : {formatHours(visites.reduce((s, v) => s + v.durationHours, 0))}</span>
      </div>
    </div>
  );
}

// ─── PDF Documents from enriched data ───────────────────────

function EnrichedDocsSection({ documents }: { documents: NormalizedDoc[] }) {
  const devis = documents.filter(d => d.category === 'devis');
  const factures = documents.filter(d => d.category === 'factures');
  const other = documents.filter(d => d.category !== 'devis' && d.category !== 'factures');

  const renderDoc = (doc: NormalizedDoc) => (
    <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{doc.docLabel || doc.categoryLabel || doc.category}</p>
          {doc.date && <p className="text-xs text-muted-foreground">{new Date(doc.date).toLocaleDateString('fr-FR')}</p>}
        </div>
      </div>
      {doc.url && (
        <Button size="sm" variant="ghost" asChild className="shrink-0">
          <a href={doc.url} target="_blank" rel="noopener noreferrer">
            <Download className="h-3.5 w-3.5 mr-1" />
            PDF
          </a>
        </Button>
      )}
    </div>
  );

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Aucun document PDF trouvé</p>;
  }

  return (
    <div className="space-y-4">
      {devis.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Devis</p>
          {devis.map(renderDoc)}
        </div>
      )}
      {factures.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Factures</p>
          {factures.map(renderDoc)}
        </div>
      )}
      {other.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Autres documents</p>
          {other.map(renderDoc)}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function RentabiliteDetailDialog({ projectId, projectRef, open, onOpenChange }: RentabiliteDetailDialogProps) {
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

  // Apogée data (from bulk cache)
  const { data: apogeeData, isLoading: apogeeLoading } = useProjectApogeeData(open ? projectId : null);

  // Enriched data from apiGetProjectByRef (on-demand, only when dialog opens)
  const { data: enrichedData, isLoading: enrichedLoading } = useProjectEnrichedData(
    open ? projectRef : null,
    open && !!projectRef,
  );

  // Compute profitability (live, NO persistence)
  const { data: result, isLoading: computeLoading } = useProjectProfitability({
    projectId: projectId ?? '',
    factures: apogeeData?.factures ?? [],
    interventions: apogeeData?.interventions ?? [],
    isProjectClosed: false,
    persistSnapshot: false,
    enabled: open && !!projectId && !!apogeeData,
  });

  // Last persisted snapshot
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

  // Cost profiles
  const { data: costProfiles = [] } = useQuery({
    queryKey: ['cost-profiles', agencyId],
    enabled: open && !!agencyId,
    queryFn: () => listCostProfiles(agencyId!),
  });

  // Collaborators
  const { data: collaborators = [] } = useQuery<CollaboratorMinimal[]>({
    queryKey: ['collaborators-minimal', agencyId],
    enabled: open && !!agencyId,
    queryFn: () => listCollaboratorsMinimal(agencyId!),
  });

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

  const isSnapshotOutdated = useMemo(() => {
    if (!result || !snapshot?.apogee_data_hash) return false;
    return result.apogeeDataHash !== snapshot.apogee_data_hash;
  }, [result, snapshot]);

  const hasNonProrated = result?.flags.includes('overhead_not_prorated') ?? false;
  const isLoading = apogeeLoading || computeLoading;

  // ── Recalculate ──
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
        validation_status: 'draft',
        created_by: user?.id ?? null,
        apogee_data_hash: computeResult.apogeeDataHash,
        apogee_last_sync_at: new Date().toISOString(),
        version: 1,
        previous_snapshot_id: null,
        validated_by: null,
        validated_at: null,
      };

      await upsertSnapshot(snapshotData);
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

  const existingProfile = profileTarget
    ? costProfiles.find(p => p.collaborator_id === profileTarget.collaboratorId)
    : undefined;

  // ── Overhead actions ──
  const handleAddOverhead = () => { setEditingRule(undefined); setOverheadDialogOpen(true); };
  const handleEditOverhead = (rule: AgencyOverheadRule) => { setEditingRule(rule); setOverheadDialogOpen(true); };
  const handleDeleteOverhead = (id: string) => deleteOverhead.mutate(id);
  const handleValidateOverhead = (id: string, status: CostValidation) => validateOverhead.mutate({ id, status });

  // ── Header info ──
  const headerTitle = enrichedData?.clientName
    ? `${enrichedData.clientName} — ${enrichedData.reference || projectRef || projectId}`
    : projectRef || `Dossier ${projectId}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Header with enriched info */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <DialogTitle className="text-lg font-semibold truncate">
                  {headerTitle}
                </DialogTitle>
                {enrichedData && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {enrichedData.clientAddress && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {enrichedData.clientAddress}{enrichedData.clientPostalCode ? `, ${enrichedData.clientPostalCode}` : ''}{enrichedData.clientCity ? ` ${enrichedData.clientCity}` : ''}
                      </span>
                    )}
                    {enrichedData.apporteurName && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {enrichedData.apporteurName}
                      </span>
                    )}
                    {enrichedData.clientPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {enrichedData.clientPhone}
                      </span>
                    )}
                    {enrichedData.clientEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {enrichedData.clientEmail}
                      </span>
                    )}
                    {enrichedData.etat && (
                      <Badge variant="outline" className="text-[10px] h-5">{enrichedData.etat}</Badge>
                    )}
                  </div>
                )}
                {enrichedLoading && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Chargement détails…
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
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
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="flex-1 max-h-[calc(90vh-140px)]">
            <div className="px-6 py-4">
              {isLoading && !result ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Tabs defaultValue="synthese">
                  <TabsList className="w-full grid grid-cols-7 h-9">
                    <TabsTrigger value="synthese" className="text-xs">Synthèse</TabsTrigger>
                    <TabsTrigger value="labor" className="text-xs">Main d'œuvre</TabsTrigger>
                    <TabsTrigger value="visites" className="text-xs">Visites</TabsTrigger>
                    <TabsTrigger value="costs" className="text-xs">Coûts</TabsTrigger>
                    <TabsTrigger value="overhead" className="text-xs">Charges</TabsTrigger>
                    <TabsTrigger value="pdfs" className="text-xs">PDF</TabsTrigger>
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

                  <TabsContent value="visites" className="mt-4">
                    <VisiteBreakdown
                      visites={apogeeData?.visites ?? []}
                      collaboratorMap={collaboratorMap}
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

                  <TabsContent value="pdfs" className="mt-4">
                    {enrichedLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : enrichedData ? (
                      <EnrichedDocsSection documents={enrichedData.documents} />
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Documents non disponibles (enrichissement non chargé)
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="reliability" className="mt-4">
                    <ReliabilitySection
                      flags={result?.flags ?? []}
                      completenessScore={result?.completenessScore ?? 0}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Sub-Dialogs ── */}
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
