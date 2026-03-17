/**
 * RentabiliteDetailSheet — Side sheet showing full profitability detail for a project.
 */
import { useMemo } from 'react';
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
import { useProjectApogeeData } from '../hooks/useProjectApogeeData';
import { useProjectProfitability, useProjectProfitabilitySnapshot } from '@/hooks/useProjectProfitability';
import { useProjectCostsMutations } from '../hooks/useProjectCostsMutations';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useAuth } from '@/contexts/AuthContext';
import { listProjectCosts, listOverheadRules, updateSnapshotValidation } from '@/repositories/profitabilityRepository';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CostValidation } from '@/types/projectProfitability';

interface RentabiliteDetailSheetProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RentabiliteDetailSheet({ projectId, open, onOpenChange }: RentabiliteDetailSheetProps) {
  const { agencyId } = useEffectiveAuth();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Apogée data
  const { data: apogeeData, isLoading: apogeeLoading } = useProjectApogeeData(open ? projectId : null);

  // Compute profitability (live)
  const { data: result, isLoading: computeLoading } = useProjectProfitability({
    projectId: projectId ?? '',
    factures: apogeeData?.factures ?? [],
    interventions: apogeeData?.interventions ?? [],
    isProjectClosed: false, // TODO: detect from Apogée data
    persistSnapshot: true,
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

  const { validateCost, deleteCost } = useProjectCostsMutations(projectId ?? '');

  // Check if snapshot is outdated
  const isSnapshotOutdated = useMemo(() => {
    if (!result || !snapshot?.apogee_data_hash) return false;
    return result.apogeeDataHash !== snapshot.apogee_data_hash;
  }, [result, snapshot]);

  const hasNonProrated = result?.flags.includes('overhead_not_prorated') ?? false;
  const isLoading = apogeeLoading || computeLoading;

  const handleRecalculate = () => {
    qc.invalidateQueries({ queryKey: ['project-profitability', agencyId, projectId] });
    qc.invalidateQueries({ queryKey: ['project-apogee-data'] });
    toast.info('Recalcul en cours…');
  };

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

  const handleValidateCost = (id: string, status: CostValidation) => {
    validateCost.mutate({ id, status });
  };

  const handleDeleteCost = (id: string) => {
    deleteCost.mutate(id);
  };

  return (
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
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Calculator className="h-3.5 w-3.5 mr-1" />}
                Recalculer
              </Button>
              {snapshot && snapshot.validation_status === 'draft' && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleValidateSnapshot}
                >
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
            <TabsList className="w-full grid grid-cols-5 h-9">
              <TabsTrigger value="synthese" className="text-xs">Synthèse</TabsTrigger>
              <TabsTrigger value="labor" className="text-xs">Main d'œuvre</TabsTrigger>
              <TabsTrigger value="costs" className="text-xs">Coûts</TabsTrigger>
              <TabsTrigger value="overhead" className="text-xs">Charges</TabsTrigger>
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
              />
            </TabsContent>

            <TabsContent value="overhead" className="mt-4">
              <OverheadSection
                rules={overheadRules}
                totalOverhead={result?.costOverhead ?? 0}
                hasNonProrated={hasNonProrated}
              />
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
  );
}
