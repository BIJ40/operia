/**
 * PerformanceDashboard - Dashboard principal Performance Terrain
 * Vue équilibée, non punitive, orientée capacité & qualité
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePerformanceTerrain, TechnicianPerformance } from '@/hooks/usePerformanceTerrain';
import { TeamHeatmap } from './TeamHeatmap';
import { TechnicianRadarChart } from './TechnicianRadarChart';
import { SavDetailsDrawer } from './SavDetailsDrawer';
import { PerformanceLegend } from './PerformanceLegend';
import { TechnicianQuickEditDialog } from './TechnicianQuickEditDialog';
import { ConfidenceBadge } from '@/modules/performance/components/ConfidenceBadge';
import { DataQualityBadge } from '@/modules/performance/components/DataQualityBadge';
import { DegradedStateAlert } from '@/modules/performance/components/DegradedStateAlert';
import { WorkloadBreakdown } from '@/modules/performance/components/WorkloadBreakdown';
import { ExplainCalculation } from '@/modules/performance/components/ExplainCalculation';
import { CapacityBreakdown } from '@/modules/performance/components/CapacityBreakdown';
import type { ConfidenceBreakdown, DataQualityFlags } from '@/modules/performance/engine/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Users, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  ArrowLeft,
  FileWarning,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPercent } from '@/lib/formatters';
import { startOfMonth, endOfMonth, addMonths, subMonths, format, isThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

function usePerformancePeriod() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const dateRange = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return { start, end };
  }, [currentMonth]);
  
  const goToPreviousMonth = useCallback(() => setCurrentMonth(prev => subMonths(prev, 1)), []);
  const goToNextMonth = useCallback(() => setCurrentMonth(prev => addMonths(prev, 1)), []);
  const goToCurrentMonth = useCallback(() => setCurrentMonth(new Date()), []);
  
  const isCurrentMonth = isThisMonth(currentMonth);
  const label = format(currentMonth, 'MMMM yyyy', { locale: fr });
  
  return { dateRange, currentMonth, goToPreviousMonth, goToNextMonth, goToCurrentMonth, isCurrentMonth, label };
}

/**
 * Aggregate confidence and data quality flags from all snapshots.
 * Returns null if no engineOutput available (legacy safety).
 */
function useAggregatedQuality(data: ReturnType<typeof usePerformanceTerrain>['data']) {
  return useMemo(() => {
    if (!data?.engineOutput?.snapshots?.length) return null;

    const snapshots = data.engineOutput.snapshots;
    
    // Average confidence across active techs
    const avgConfidence: ConfidenceBreakdown = {
      durationConfidence: 0,
      capacityConfidence: 0,
      matchingConfidence: 0,
      classificationConfidence: 0,
      globalConfidenceScore: 0,
    };
    for (const s of snapshots) {
      avgConfidence.durationConfidence += s.confidenceBreakdown.durationConfidence;
      avgConfidence.capacityConfidence += s.confidenceBreakdown.capacityConfidence;
      avgConfidence.matchingConfidence += s.confidenceBreakdown.matchingConfidence;
      avgConfidence.classificationConfidence += s.confidenceBreakdown.classificationConfidence;
      avgConfidence.globalConfidenceScore += s.confidenceBreakdown.globalConfidenceScore;
    }
    const n = snapshots.length;
    avgConfidence.durationConfidence = Math.round((avgConfidence.durationConfidence / n) * 100) / 100;
    avgConfidence.capacityConfidence = Math.round((avgConfidence.capacityConfidence / n) * 100) / 100;
    avgConfidence.matchingConfidence = Math.round((avgConfidence.matchingConfidence / n) * 100) / 100;
    avgConfidence.classificationConfidence = Math.round((avgConfidence.classificationConfidence / n) * 100) / 100;
    avgConfidence.globalConfidenceScore = Math.round((avgConfidence.globalConfidenceScore / n) * 100) / 100;

    // OR-aggregate flags
    const flags: DataQualityFlags = {
      missingContract: false,
      missingExplicitDurations: false,
      missingPlanningCoverage: false,
      missingAbsenceData: false,
      highFallbackUsage: false,
      duplicateResolutionApplied: false,
      partialPeriodCoverage: false,
    };
    for (const s of snapshots) {
      for (const key of Object.keys(flags) as (keyof DataQualityFlags)[]) {
        if (s.dataQualityFlags[key]) flags[key] = true;
      }
    }

    return { avgConfidence, flags };
  }, [data]);
}

export function PerformanceDashboard() {
  const navigate = useNavigate();
  
  const { dateRange, goToPreviousMonth, goToNextMonth, goToCurrentMonth, isCurrentMonth, label: periodLabel } = usePerformancePeriod();
  const { data, isLoading, error } = usePerformanceTerrain(dateRange);
  const [selectedTech, setSelectedTech] = useState<TechnicianPerformance | null>(null);
  const [savDrawerTech, setSavDrawerTech] = useState<TechnicianPerformance | null>(null);
  const [editDialogTech, setEditDialogTech] = useState<TechnicianPerformance | null>(null);

  const quality = useAggregatedQuality(data);

  // Get selected tech's snapshot for V2 detail views
  const selectedSnapshot = useMemo(() => {
    if (!selectedTech || !data?.engineOutput?.snapshots) return null;
    return data.engineOutput.snapshots.find(s => s.technicianId === selectedTech.id) || null;
  }, [selectedTech, data]);

  // Stats d'équipe
  const teamInsights = useMemo(() => {
    if (!data) return null;
    
    const underload = data.technicians.filter(t => t.loadZone === 'underload').length;
    const overload = data.technicians.filter(t => t.loadZone === 'overload').length;
    const optimal = data.technicians.filter(t => t.loadZone === 'balanced').length;
    
    const highSav = data.technicians.filter(t => t.savZone === 'critical').length;
    
    return { underload, overload, optimal, highSav };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <p className="text-destructive">Erreur lors du chargement des données performance.</p>
        </CardContent>
      </Card>
    );
  }

  if (data.technicians.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-6 text-center py-12">
          <FileWarning className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Aucune donnée pour cette période</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Aucune intervention de technicien trouvée pour la période du{' '}
            {dateRange.start.toLocaleDateString('fr-FR')} au {dateRange.end.toLocaleDateString('fr-FR')}.
            <br />
            Vérifiez vos filtres de période ou attendez que des interventions soient planifiées.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Vue détail technicien
  if (selectedTech) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setSelectedTech(null)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour équipe
        </Button>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <TechnicianRadarChart technician={selectedTech} />
            {/* V2: WorkloadBreakdown */}
            {selectedSnapshot && (
              <WorkloadBreakdown workload={selectedSnapshot.workload} />
            )}
            {/* V2: ExplainCalculation */}
            {selectedSnapshot && (
              <ExplainCalculation trace={selectedSnapshot.calculationTrace} />
            )}
          </div>
          
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Détail activité</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedSnapshot && (
                    <>
                      <ConfidenceBadge confidence={selectedSnapshot.confidenceBreakdown} />
                      <DataQualityBadge flags={selectedSnapshot.dataQualityFlags} />
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditDialogTech(selectedTech)}
                  >
                    Modifier paramètres
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* V2: DegradedStateAlert per tech */}
                {selectedSnapshot && (
                  <DegradedStateAlert 
                    flags={selectedSnapshot.dataQualityFlags} 
                    technicianName={selectedTech.name}
                  />
                )}

                {/* Temps */}
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Répartition temps</div>
                  <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                    <div 
                      className="bg-primary"
                      style={{ width: `${(selectedTech.timeProductive / Math.max(selectedTech.timeTotal, 1)) * 100}%` }}
                    />
                    <div 
                      className="bg-accent"
                      style={{ width: `${(selectedTech.timeNonProductive / Math.max(selectedTech.timeTotal, 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Productif: {Math.round(selectedTech.timeProductive / 60)}h</span>
                    <span>Autre: {Math.round(selectedTech.timeNonProductive / 60)}h</span>
                  </div>
                </div>
                
                {/* Métriques détaillées */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Interventions</div>
                    <div className="text-xl font-bold">{selectedTech.interventionsCount}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Dossiers traités</div>
                    <div className="text-xl font-bold">{selectedTech.dossiersCount}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-left">
                    <div className="text-xs text-muted-foreground">Taux SAV</div>
                    <div className="text-xl font-bold">{formatPercent(selectedTech.savRate * 100)}</div>
                    {selectedTech.savCount > 0 && (
                      <div className="flex flex-col gap-1 mt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSavDrawerTech(selectedTech);
                          }}
                          className="text-xs text-primary hover:underline text-left cursor-pointer"
                        >
                          Valider/Invalider SAV →
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/?tab=pilotage&subtab=sav&technicien=${encodeURIComponent(selectedTech.id)}`);
                          }}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline text-left cursor-pointer"
                        >
                          Voir dans Stats SAV →
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Charge/Capacité</div>
                    <div className="text-xl font-bold">{formatPercent(selectedTech.loadRatio * 100)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* V2: CapacityBreakdown */}
            {selectedSnapshot && (
              <CapacityBreakdown 
                capacity={selectedSnapshot.capacity}
                weeklyHoursSource={selectedSnapshot.weeklyHoursSource}
                weeklyHours={selectedSnapshot.weeklyHours}
              />
            )}
          </div>
        </div>

        {/* Drawer SAV (detail view) */}
        <SavDetailsDrawer
          technician={savDrawerTech}
          dateRange={dateRange}
          open={!!savDrawerTech}
          onOpenChange={(open) => !open && setSavDrawerTech(null)}
        />
        <TechnicianQuickEditDialog
          technician={editDialogTech}
          open={!!editDialogTech}
          onOpenChange={(open) => !open && setEditDialogTech(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Performance Terrain
            </h2>
            <p className="text-sm text-muted-foreground">
              Pilotage équilibré, orienté capacité & qualité
            </p>
          </div>
          {/* V2: Confidence & quality badges */}
          {quality && (
            <div className="flex items-center gap-2">
              <ConfidenceBadge confidence={quality.avgConfidence} />
              <DataQualityBadge flags={quality.flags} />
            </div>
          )}
        </div>
        
        {/* Sélecteur de mois */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant={isCurrentMonth ? "default" : "outline"} 
            size="sm" 
            className="min-w-[140px] capitalize"
            onClick={goToCurrentMonth}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {periodLabel}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <PerformanceLegend />
        </div>
      </div>

      {/* V2: Degraded state alert if confidence is low OR critical flags active */}
      {quality && (
        quality.avgConfidence.globalConfidenceScore < 0.6 
        || quality.flags.missingPlanningCoverage 
        || quality.flags.highFallbackUsage
      ) && (
        <DegradedStateAlert flags={quality.flags} />
      )}

      {/* KPIs équipe */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="w-4 h-4" />
              Techniciens
            </div>
            <div className="text-2xl font-bold">{data.technicians.length}</div>
            {teamInsights && (
              <div className="text-xs text-muted-foreground mt-1">
                {teamInsights.optimal} en équilibre
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Productivité moy.
            </div>
            <div className="text-2xl font-bold">
              {formatPercent(data.teamStats.avgProductivityRate * 100)}
            </div>
            <Badge 
              variant="outline" 
              className={
                data.teamStats.avgProductivityRate >= 0.65 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mt-1'
                  : data.teamStats.avgProductivityRate >= 0.5
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mt-1'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 mt-1'
              }
            >
              {data.teamStats.avgProductivityRate >= 0.65 ? 'Bon niveau' : 'À optimiser'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Clock className="w-4 h-4" />
              Charge moyenne
            </div>
            <div className="text-2xl font-bold">
              {formatPercent(data.teamStats.avgLoadRatio * 100)}
            </div>
            {teamInsights && teamInsights.overload > 0 && (
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {teamInsights.overload} en surcharge
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              SAV total
            </div>
            <div className="text-2xl font-bold">{data.teamStats.totalSavCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              sur {data.teamStats.totalInterventions} interventions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes équipe */}
      {teamInsights && (teamInsights.overload > 0 || teamInsights.underload > 0 || teamInsights.highSav > 0) && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium">Points d'attention équipe</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {teamInsights.overload > 0 && (
                    <li>{teamInsights.overload} technicien(s) en surcharge - planification à ajuster</li>
                  )}
                  {teamInsights.underload > 0 && (
                    <li>{teamInsights.underload} technicien(s) sous-chargé(s) - capacité disponible</li>
                  )}
                  {teamInsights.highSav > 0 && (
                    <li>{teamInsights.highSav} technicien(s) avec taux SAV élevé - formation à prévoir</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap équipe */}
      <TeamHeatmap 
        technicians={data.technicians} 
        onSelectTechnician={setSelectedTech}
        onOpenSavDrawer={setSavDrawerTech}
      />
      
      {/* Drawer SAV */}
      <SavDetailsDrawer
        technician={savDrawerTech}
        dateRange={dateRange}
        open={!!savDrawerTech}
        onOpenChange={(open) => !open && setSavDrawerTech(null)}
      />
      
      {/* Dialog édition rapide */}
      <TechnicianQuickEditDialog
        technician={editDialogTech}
        open={!!editDialogTech}
        onOpenChange={(open) => !open && setEditDialogTech(null)}
      />
    </div>
  );
}
