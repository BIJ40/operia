/**
 * DiversTabContent (renommé "Outils" dans l'UI) - Contenu de l'onglet Outils
 * Sous-onglets: Actions, Apporteurs, Veille, Plannings, Réunions, Documents
 * Design: Warm Pastel theme avec PillTabsList colorés
 */

import { lazy, Suspense } from 'react';
import { FileText, Users2, Loader2, Users, CalendarDays, Radar, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';

const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const DocGenPage = lazy(() => import('@/pages/rh/DocGenPage'));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));
const VeilleApporteursPage = lazy(() => import('@/pages/VeilleApporteursPage'));

type OutilsSubTab = 'actions' | 'apporteurs' | 'veille' | 'plannings' | 'reunions' | 'docgen';

const OUTILS_TABS: PillTabConfig[] = [
  { id: 'actions', label: 'Actions', icon: ClipboardList, accent: 'blue' },
  { id: 'apporteurs', label: 'Apporteurs', icon: Users, accent: 'purple' },
  { id: 'veille', label: 'Veille', icon: Radar, accent: 'pink' },
  { id: 'plannings', label: 'Plannings', icon: CalendarDays, accent: 'teal' },
  { id: 'reunions', label: 'Réunions', icon: Users2, accent: 'orange' },
  { id: 'docgen', label: 'Documents', icon: FileText, accent: 'green' },
];

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
  const [activeSubTab, setActiveSubTab] = useSessionState<OutilsSubTab>('outils_sub_tab', 'actions');

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as OutilsSubTab)}>
        <PillTabsList tabs={OUTILS_TABS} />

        <TabsContent value="actions" className="mt-6 animate-fade-in">
          <ActionsAMenerTab />
        </TabsContent>

        <TabsContent value="apporteurs" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <MesApporteursTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="veille" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <VeilleApporteursPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="plannings" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <PlanningHebdo />
          </Suspense>
        </TabsContent>

        <TabsContent value="reunions" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <RHMeetingsPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="docgen" className="mt-6 animate-fade-in">
          <Suspense fallback={<LoadingFallback />}>
            <DocGenPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
