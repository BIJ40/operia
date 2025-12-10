import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStatsHub } from './StatsHubContext';
import { getNextStat, getPrevStat } from './types';
import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load modal contents
const modalContents: Record<string, React.LazyExoticComponent<React.ComponentType<{ statId: string }>>> = {
  // General
  dossiers_recus: lazy(() => import('./modals/DossiersModal')),
  ca_mensuel: lazy(() => import('./modals/CAMensuelModal')),
  ca_ytd: lazy(() => import('./modals/CAYTDModal')),
  encours_global: lazy(() => import('./modals/EncoursModal')),
  taux_sav: lazy(() => import('./modals/TauxSAVModal')),
  widget_ca_mensuel: lazy(() => import('./modals/CAEvolutionModal')),
  
  // Apporteurs
  widget_top_apporteurs: lazy(() => import('./modals/TopApporteursModal')),
  widget_flop_apporteurs: lazy(() => import('./modals/FlopApporteursModal')),
  widget_top_encours: lazy(() => import('./modals/TopEncoursModal')),
  widget_segmentation: lazy(() => import('./modals/SegmentationModal')),
  
  // Techniciens
  widget_heatmap: lazy(() => import('./modals/HeatmapModal')),
  widget_top_tech: lazy(() => import('./modals/TopTechniciensModal')),
  widget_ca_mensuel_tech: lazy(() => import('./modals/CAMensuelTechModal')),
  
  // Univers
  widget_repartition_univers: lazy(() => import('./modals/RepartitionUniversModal')),
  widget_evolution_univers: lazy(() => import('./modals/EvolutionUniversModal')),
  widget_matrix_univers: lazy(() => import('./modals/MatrixUniversModal')),
  
  // SAV
  widget_sav_liste: lazy(() => import('./modals/SAVListeModal')),
  widget_sav_univers: lazy(() => import('./modals/SAVUniversModal')),
};

// Default modal for KPIs without specific content
const DefaultKpiModal = lazy(() => import('./modals/DefaultKpiModal'));

function ModalSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

export function StatModal() {
  const { selectedStat, closeStat, nextStat, prevStat, currentIndex, totalStats } = useStatsHub();

  if (!selectedStat) return null;

  const hasNext = !!getNextStat(selectedStat.id);
  const hasPrev = !!getPrevStat(selectedStat.id);

  // Get the appropriate modal content
  const ModalContent = modalContents[selectedStat.id] || DefaultKpiModal;

  return (
    <Dialog open={!!selectedStat} onOpenChange={(open) => !open && closeStat()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevStat}
              disabled={!hasPrev}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-sm text-muted-foreground font-medium">
              {currentIndex} / {totalStats}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={nextStat}
              disabled={!hasNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogTitle className="text-lg font-semibold flex-1 text-center">
            {selectedStat.title}
            {selectedStat.subtitle && (
              <span className="text-muted-foreground font-normal ml-2">
                ({selectedStat.subtitle})
              </span>
            )}
          </DialogTitle>
          
          <Button variant="ghost" size="icon" onClick={closeStat} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="py-4">
          <Suspense fallback={<ModalSkeleton />}>
            <ModalContent statId={selectedStat.id} />
          </Suspense>
        </div>

        {/* Keyboard hint */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          ← → pour naviguer • Échap pour fermer
        </div>
      </DialogContent>
    </Dialog>
  );
}
