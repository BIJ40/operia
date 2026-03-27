/**
 * RentabiliteTabContent — Orchestrator for the profitability module.
 * v2: Uses Dialog instead of Sheet, passes projectRef for enrichment.
 */
import { useState, useCallback } from 'react';
import { RentabiliteTable } from './list/RentabiliteTable';
import { RentabiliteDetailDialog } from './detail/RentabiliteDetailDialog';
import { useRentabiliteList } from './hooks/useRentabiliteList';
import { useProjectApogeeData } from './hooks/useProjectApogeeData';
import { useProjectProfitability } from '@/hooks/useProjectProfitability';
import { toast } from 'sonner';

export default function RentabiliteTabContent() {
  const { data: items = [], isLoading } = useRentabiliteList();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectRef, setSelectedProjectRef] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // For on-demand calculation of uncalculated projects
  const [calcProjectId, setCalcProjectId] = useState<string | null>(null);
  const { data: calcApogeeData } = useProjectApogeeData(calcProjectId);

  useProjectProfitability({
    projectId: calcProjectId ?? '',
    factures: calcApogeeData?.factures ?? [],
    interventions: calcApogeeData?.interventions ?? [],
    isProjectClosed: false,
    persistSnapshot: true,
    enabled: !!calcProjectId && !!calcApogeeData,
  });

  const handleSelectProject = useCallback((projectId: string, projectRef?: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectRef(projectRef || projectId);
    setDialogOpen(true);
  }, []);

  const handleCalculate = useCallback((projectId: string) => {
    setCalcProjectId(projectId);
    toast.info('Calcul de la rentabilité en cours…');
  }, []);

  return (
    <div className="space-y-4">
      <RentabiliteTable
        items={items}
        isLoading={isLoading}
        onSelectProject={handleSelectProject}
        onCalculate={handleCalculate}
      />
      <RentabiliteDetailDialog
        projectId={selectedProjectId}
        projectRef={selectedProjectRef}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
