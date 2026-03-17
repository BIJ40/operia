/**
 * PilotageTabContent - Onglet "Pilotage"
 * Sous-onglets : Stats, Performance, Actions à mener, Devis acceptés, Incohérences
 */

import { lazy, Suspense, useMemo } from 'react';
import { BarChart3, Activity, Settings, FileCheck, AlertTriangle, TrendingUp, PieChart, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

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
const ResultatTabContent = lazy(() => import('@/components/financial/ResultatTabContent'));
const RentabilitePlaceholder = lazy(() => import('@/components/profitability/RentabilitePlaceholder'));

type PilotageSubTab = 'stats' | 'performance' | 'actions' | 'devis-acceptes' | 'anomalies' | 'resultat' | 'rentabilite';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function PilotageTabContent() {
  const { hasModule } = usePermissions();
  const { getShortLabel } = useModuleLabels();
  const { mode: navMode } = useNavigationMode();

  // All pilotage sub-tabs are real modules → dynamic labels from registry
  const allTabs: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'stats', label: getShortLabel('pilotage.statistiques', 'Statistiques'), icon: BarChart3, accent: 'blue', requiresModule: 'pilotage.statistiques' },
    { id: 'performance', label: getShortLabel('pilotage.performance', 'Performance'), icon: Activity, accent: 'pink', requiresModule: 'pilotage.performance' },
    { id: 'actions', label: getShortLabel('pilotage.actions_a_mener', 'Actions à mener'), icon: Settings, accent: 'orange', requiresModule: 'pilotage.actions_a_mener' },
    { id: 'devis-acceptes', label: getShortLabel('pilotage.devis_acceptes', 'Devis acceptés'), icon: FileCheck, accent: 'teal', requiresModule: 'pilotage.devis_acceptes' },
    { id: 'anomalies', label: getShortLabel('pilotage.incoherences', 'Incohérences'), icon: AlertTriangle, accent: 'pink', requiresModule: 'pilotage.incoherences' },
    { id: 'resultat', label: getShortLabel('pilotage.resultat', 'Résultat'), icon: TrendingUp, accent: 'green', requiresModule: 'pilotage.resultat' },
  ], [getShortLabel]);

  const visibleTabs = useMemo(() => {
    return allTabs.map(tab => {
      if (!tab.requiresModule) return tab;
      return { ...tab, disabled: !hasModule(tab.requiresModule) };
    });
  }, [hasModule, allTabs]);

  const defaultTab = (visibleTabs.find(t => !t.disabled)?.id as PilotageSubTab) ?? 'stats';
  const [activeTab, setActiveTab] = useSessionState<PilotageSubTab>('pilotage_sub_tab', defaultTab);
  const effectiveTab = (visibleTabs.find(t => t.id === activeTab && !t.disabled)) ? activeTab : defaultTab;

  return (
    <DomainAccentProvider accent="blue">
    <div className={navMode === 'header' ? 'pt-1 px-2 sm:px-4 space-y-3' : 'py-6 px-2 sm:px-4 space-y-4'}>
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as PilotageSubTab)}>
        {navMode === 'tabs' && <PillTabsList tabs={visibleTabs} />}

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

        <TabsContent value="resultat" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <ResultatTabContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
    </DomainAccentProvider>
  );
}
