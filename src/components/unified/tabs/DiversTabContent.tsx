/**
 * DiversTabContent - Contenu de l'onglet "Divers"
 * Sous-onglets: Apporteurs, Plannings, Réunions, Documents
 */

import { lazy, Suspense } from 'react';
import { FileText, Users2, Loader2, Users, CalendarDays } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSessionState } from '@/hooks/useSessionState';

const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const DocGenPage = lazy(() => import('@/pages/rh/DocGenPage'));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));

type DiversSubTab = 'apporteurs' | 'plannings' | 'reunions' | 'docgen';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function DiversTabContent() {
  const [activeSubTab, setActiveSubTab] = useSessionState<DiversSubTab>('divers_sub_tab', 'apporteurs');

  const subTabs = [
    { id: 'apporteurs' as const, label: 'Apporteurs', icon: Users },
    { id: 'plannings' as const, label: 'Plannings', icon: CalendarDays },
    { id: 'reunions' as const, label: 'Réunions', icon: Users2 },
    { id: 'docgen' as const, label: 'Documents', icon: FileText },
  ];

  return (
    <div className="py-3 px-2 sm:px-4">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as DiversSubTab)}>
        <TabsList className="mb-4">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="apporteurs" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <MesApporteursTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="plannings" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <PlanningHebdo />
          </Suspense>
        </TabsContent>

        <TabsContent value="reunions" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <RHMeetingsPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="docgen" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <DocGenPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
