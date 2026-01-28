/**
 * DiversTabContent - Contenu de l'onglet "Divers"
 * Sous-onglets: Apporteurs, Plannings, Réunions, Documents
 */

import { lazy, Suspense } from 'react';
import { FileText, Users2, Loader2, Users, CalendarDays } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';

const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const DocGenPage = lazy(() => import('@/pages/rh/DocGenPage'));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));

type DiversSubTab = 'apporteurs' | 'plannings' | 'reunions' | 'docgen';

const DIVERS_TABS: PillTabConfig[] = [
  { id: 'apporteurs', label: 'Apporteurs', icon: Users },
  { id: 'plannings', label: 'Plannings', icon: CalendarDays },
  { id: 'reunions', label: 'Réunions', icon: Users2 },
  { id: 'docgen', label: 'Documents', icon: FileText },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function DiversTabContent() {
  const [activeSubTab, setActiveSubTab] = useSessionState<DiversSubTab>('divers_sub_tab', 'apporteurs');

  return (
    <div className="py-3 px-2 sm:px-4 space-y-4">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as DiversSubTab)}>
        <PillTabsList tabs={DIVERS_TABS} />

        <TabsContent value="apporteurs" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <MesApporteursTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="plannings" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <PlanningHebdo />
          </Suspense>
        </TabsContent>

        <TabsContent value="reunions" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <RHMeetingsPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="docgen" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <DocGenPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
