/**
 * Forecast UI — Main dashboard
 * Phase 6B Lot 6.2
 */

import { useState, useMemo, lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

import { useForecastHorizon } from '@/modules/performance/forecast/hooks/useForecastHorizon';
import { useForecastData } from '@/modules/performance/forecast/hooks/useForecastData';

import { ForecastHeader } from './ForecastHeader';
import { ForecastHorizonTabs } from './ForecastHorizonTabs';
import { ForecastLegend } from './ForecastLegend';
import { ForecastTeamSummaryCards } from './ForecastTeamSummaryCards';
import { ForecastLoadStackCard } from './ForecastLoadStackCard';
import { ForecastTensionTable } from './ForecastTensionTable';
import { ForecastRecommendationsPanel } from './ForecastRecommendationsPanel';
import { ForecastUniversePanel } from './ForecastUniversePanel';
import { ForecastTechnicianDrawer } from './ForecastTechnicianDrawer';
import { ForecastEmptyState } from './ForecastEmptyState';

export function PerformanceForecastDashboard() {
  const { horizon, setHorizon, period, label: horizonLabel } = useForecastHorizon();
  const forecastData = useForecastData(horizon, period);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  const selectedSnapshot = useMemo(() => {
    if (!selectedTechId) return null;
    return forecastData.snapshots.find(s => s.technicianId === selectedTechId) ?? null;
  }, [selectedTechId, forecastData.snapshots]);

  const selectedTension = useMemo(() => {
    if (!selectedTechId) return null;
    return forecastData.tensionSnapshots.find(s => s.technicianId === selectedTechId) ?? null;
  }, [selectedTechId, forecastData.tensionSnapshots]);

  const selectedRecommendations = useMemo(() => {
    if (!selectedTechId) return [];
    return forecastData.recommendations.technicianRecommendations.filter(
      r => r.technicianId === selectedTechId
    );
  }, [selectedTechId, forecastData.recommendations]);

  // Loading
  if (forecastData.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Error
  if (forecastData.error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <p className="text-destructive">Erreur lors du chargement des données prévisionnelles.</p>
          <p className="text-xs text-muted-foreground mt-1">{forecastData.error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty
  const isEmpty = forecastData.snapshots.length === 0 && !forecastData.meta.hasCommittedData && !forecastData.meta.hasProbableData;
  if (isEmpty) {
    return (
      <div className="space-y-4">
        <ForecastHeader horizonLabel={horizonLabel} teamTension={forecastData.teamTension} teamStats={forecastData.teamStats} />
        <ForecastHorizonTabs value={horizon} onChange={setHorizon} />
        <ForecastEmptyState
          hasCommittedData={forecastData.meta.hasCommittedData}
          hasProbableData={forecastData.meta.hasProbableData}
          horizonLabel={horizonLabel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ForecastHeader horizonLabel={horizonLabel} teamTension={forecastData.teamTension} teamStats={forecastData.teamStats} />
      <ForecastHorizonTabs value={horizon} onChange={setHorizon} />
      <ForecastLegend />

      <ForecastTeamSummaryCards teamStats={forecastData.teamStats} teamTension={forecastData.teamTension} />
      <ForecastLoadStackCard teamStats={forecastData.teamStats} probableTeamStats={forecastData.probableTeamStats} />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <ForecastTensionTable
          snapshots={forecastData.snapshots}
          tensionSnapshots={forecastData.tensionSnapshots}
          onSelectTechnician={setSelectedTechId}
        />
        <div className="space-y-4">
          <ForecastRecommendationsPanel recommendations={forecastData.recommendations} />
          <ForecastUniversePanel snapshots={forecastData.snapshots} recommendations={forecastData.recommendations.all} />
        </div>
      </div>

      <ForecastTechnicianDrawer
        open={!!selectedTechId}
        onOpenChange={(open) => { if (!open) setSelectedTechId(null); }}
        snapshot={selectedSnapshot}
        tension={selectedTension}
        recommendations={selectedRecommendations}
      />
    </div>
  );
}
