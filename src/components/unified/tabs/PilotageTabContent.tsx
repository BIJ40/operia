/**
 * PilotageTabContent - Onglet "Pilotage"
 * Sous-onglets : Stats, Performance, Actions à mener, Devis acceptés, Incohérences
 */

import { lazy, Suspense, useMemo } from 'react';
import { BarChart3, Activity, Settings, FileCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { ModuleKey } from '@/types/modules';

// Lazy loaded
const StatsTabContent = lazy(() => import('@/components/unified/tabs/StatsTabContent'));
const PerformanceDashboard = lazy(() => 
  import('@/components/performance/PerformanceDashboard').then(m => ({ default: m.PerformanceDashboard }))
);
const ActionsAMenerTab = lazy(() => 
  import('@/components/pilotage/ActionsAMenerTab').then(m => ({ default: m.ActionsAMenerTab }))
);
const DevisAcceptesView = lazy(() => import('@/apogee-connect/components/DevisAcceptesView'));
const AnomaliesDevisDossierView = lazy(() => import('@/apogee-connect/components/AnomaliesDevisDossierView'));

type PilotageSubTab = 'stats' | 'performance' | 'actions' | 'devis-acceptes' | 'anomalies';

const ALL_PILOTAGE_TABS: (PillTabConfig & { requiresModule?: ModuleKey })[] = [
  { id: 'stats', label: 'Statistiques', icon: BarChart3, accent: 'blue', requiresModule: 'pilotage.statistiques' },
  { id: 'performance', label: 'Performance', icon: Activity, accent: 'pink', requiresModule: 'pilotage.agence' },
  { id: 'actions', label: 'Actions à mener', icon: Settings, accent: 'orange', requiresModule: 'pilotage.agence' },
  { id: 'devis-acceptes', label: 'Devis acceptés', icon: FileCheck, accent: 'teal', requiresModule: 'pilotage.agence' },
  { id: 'anomalies', label: 'Incohérences', icon: AlertTriangle, accent: 'pink', requiresModule: 'pilotage.agence' },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function PilotageTabContent() {
  const { hasModule } = useEffectiveModules();

  const visibleTabs = useMemo(() => {
    return ALL_PILOTAGE_TABS.filter(tab => {
      if (!tab.requiresModule) return true;
      return hasModule(tab.requiresModule);
    });
  }, [hasModule]);

  const defaultTab = visibleTabs[0]?.id as PilotageSubTab ?? 'stats';
  const [activeTab, setActiveTab] = useSessionState<PilotageSubTab>('pilotage_sub_tab', defaultTab);
  const effectiveTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : defaultTab;

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as PilotageSubTab)}>
        <PillTabsList tabs={visibleTabs} />

        <TabsContent value="stats" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <StatsTabContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <PerformanceDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <ActionsAMenerTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="devis-acceptes" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <DevisAcceptesView />
          </Suspense>
        </TabsContent>

        <TabsContent value="anomalies" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <AnomaliesDevisDossierView />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
