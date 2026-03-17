/**
 * RentabiliteTabContent — Orchestrator for the profitability module.
 * Replaces RentabilitePlaceholder.
 */
import { useState, useCallback } from 'react';
import { RentabiliteTable } from './list/RentabiliteTable';
import { RentabiliteDetailSheet } from './detail/RentabiliteDetailSheet';
import { useRentabiliteList } from './hooks/useRentabiliteList';
import { useProjectApogeeData } from './hooks/useProjectApogeeData';
import { useProjectProfitability } from '@/hooks/useProjectProfitability';
import { toast } from 'sonner';

export default function RentabiliteTabContent() {
  const { data: items = [], isLoading } = useRentabiliteList();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // For on-demand calculation of uncalculated projects
  const [calcProjectId, setCalcProjectId] = useState<string | null>(null);
  const { data: calcApogeeData } = useProjectApogeeData(calcProjectId);

  // Trigger computation + snapshot persistence for uncalculated projects
  useProjectProfitability({
    projectId: calcProjectId ?? '',
    factures: calcApogeeData?.factures ?? [],
    interventions: calcApogeeData?.interventions ?? [],
    isProjectClosed: false,
    persistSnapshot: true,
    enabled: !!calcProjectId && !!calcApogeeData,
  });

  const handleSelectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSheetOpen(true);
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
      <RentabiliteDetailSheet
        projectId={selectedProjectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
