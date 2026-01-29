/**
 * DiversTabContent - Contenu de l'onglet "Divers"
 * Sous-onglets: Apporteurs, Plannings, Réunions, Documents
 * Design: Warm Pastel theme
 */

import { lazy, Suspense } from 'react';
import { FileText, Users2, Loader2, Users, CalendarDays } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { cn } from '@/lib/utils';

const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const DocGenPage = lazy(() => import('@/pages/rh/DocGenPage'));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));

type DiversSubTab = 'apporteurs' | 'plannings' | 'reunions' | 'docgen';

const DIVERS_TABS = [
  { id: 'apporteurs', label: 'Apporteurs', icon: Users },
  { id: 'plannings', label: 'Plannings', icon: CalendarDays },
  { id: 'reunions', label: 'Réunions', icon: Users2 },
  { id: 'docgen', label: 'Documents', icon: FileText },
] as const;

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    </div>
  );
}

export default function DiversTabContent() {
  const [activeSubTab, setActiveSubTab] = useSessionState<DiversSubTab>('divers_sub_tab', 'apporteurs');

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Ressources & Outils
          </h1>
          <p className="text-muted-foreground text-sm">
            Gérez vos apporteurs, plannings, réunions et documents
          </p>
        </div>

        {/* Tabs navigation */}
        <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as DiversSubTab)}>
          <TabsList className="bg-muted/50 p-1 rounded-2xl h-auto flex-wrap gap-1">
            {DIVERS_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                    "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground/80",
                    "flex items-center gap-2"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Content panels */}
          <div className="mt-6">
            <TabsContent value="apporteurs" className="m-0 animate-fade-in">
              <Suspense fallback={<LoadingFallback />}>
                <MesApporteursTab />
              </Suspense>
            </TabsContent>

            <TabsContent value="plannings" className="m-0 animate-fade-in">
              <Suspense fallback={<LoadingFallback />}>
                <PlanningHebdo />
              </Suspense>
            </TabsContent>

            <TabsContent value="reunions" className="m-0 animate-fade-in">
              <Suspense fallback={<LoadingFallback />}>
                <RHMeetingsPage />
              </Suspense>
            </TabsContent>

            <TabsContent value="docgen" className="m-0 animate-fade-in">
              <Suspense fallback={<LoadingFallback />}>
                <DocGenPage />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
