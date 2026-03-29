/**
 * PilotageTabContent - Onglet "Pilotage"
 * Sous-onglets : Stats, Performance, Actions à mener, Incohérences
 */

import { lazy, Suspense, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BarChart3, Settings, AlertTriangle, TrendingUp, PieChart, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

// Lazy loaded
const StatsTabContent = lazy(() => import('@/components/unified/tabs/StatsTabContent'));
const ActionsAMenerTab = lazy(() => 
  import('@/components/pilotage/ActionsAMenerTab').then(m => ({ default: m.ActionsAMenerTab }))
);
const AnomaliesDevisDossierView = lazy(() => import('@/apogee-connect/components/AnomaliesDevisDossierView'));
const ResultatTabContent = lazy(() => import('@/components/financial/ResultatTabContent'));
const RentabiliteTabContent = lazy(() => import('@/components/profitability/RentabiliteTabContent'));

type PilotageSubTab = 'stats' | 'actions' | 'anomalies' | 'resultat' | 'rentabilite';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function PilotageTabContent() {
  const { hasModule, isDeployedModule, isAdmin } = usePermissionsBridge();
  const { getShortLabel } = useModuleLabels();
  const { mode: navMode } = useNavigationMode();

  const allTabs: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'stats', label: getShortLabel('pilotage.statistiques', 'Statistiques'), icon: BarChart3, accent: 'blue', requiresModule: 'pilotage.statistiques' },
    { id: 'actions', label: getShortLabel('pilotage.actions_a_mener', 'Actions à mener'), icon: Settings, accent: 'orange', requiresModule: 'pilotage.actions_a_mener' },
    { id: 'anomalies', label: getShortLabel('pilotage.incoherences', 'Incohérences'), icon: AlertTriangle, accent: 'pink', requiresModule: 'pilotage.incoherences' },
    { id: 'resultat', label: getShortLabel('pilotage.resultat', 'Résultat'), icon: TrendingUp, accent: 'green', requiresModule: 'pilotage.resultat' },
    { id: 'rentabilite', label: getShortLabel('pilotage.rentabilite', 'Rentabilité'), icon: PieChart, accent: 'green', requiresModule: 'pilotage.rentabilite' },
  ], [getShortLabel]);

  const visibleTabs = useMemo(() => {
    return allTabs
      .filter(tab => {
        if (tab.requiresModule && !isDeployedModule(tab.requiresModule)) return false;
        return true;
      })
      .map(tab => {
        if (!tab.requiresModule) return tab;
        return { ...tab, disabled: !isAdmin && !hasModule(tab.requiresModule) };
      });
  }, [allTabs, hasModule, isAdmin, isDeployedModule]);

  const defaultTab = (visibleTabs.find(t => !t.disabled)?.id as PilotageSubTab) ?? 'stats';
  const [activeTab, setActiveTab] = useSessionState<PilotageSubTab>('pilotage_sub_tab', defaultTab);
  const effectiveTab = isAdmin && allTabs.some(t => t.id === activeTab)
    ? activeTab
    : ((visibleTabs.find(t => t.id === activeTab && !t.disabled)) ? activeTab : defaultTab);

  return (
    <DomainAccentProvider accent="blue">
    <div className={cn("container mx-auto max-w-app", navMode === 'header' ? 'pt-1 px-2 sm:px-4 space-y-3' : 'py-6 px-2 sm:px-4 space-y-4')}>
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as PilotageSubTab)}>
        {navMode === 'tabs' && <PillTabsList tabs={visibleTabs} />}

        <TabsContent value="stats" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <StatsTabContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <ActionsAMenerTab />
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

        <TabsContent value="rentabilite" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <RentabiliteTabContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
    </DomainAccentProvider>
  );
}
