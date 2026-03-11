/**
 * CommercialTabContent - Onglet "Commercial"
 * Sous-onglets : Suivi client (Prospection), Devis acceptés, Incohérences
 */

import { lazy, Suspense, useMemo } from 'react';
import { Target, FileCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { ModuleKey } from '@/types/modules';

const ProspectionTabContent = lazy(() => import('@/prospection/pages/ProspectionTabContent'));
const DevisAcceptesView = lazy(() => import('@/apogee-connect/components/DevisAcceptesView'));
const AnomaliesDevisDossierView = lazy(() => import('@/apogee-connect/components/AnomaliesDevisDossierView'));

type CommercialSubTab = 'prospection' | 'devis-acceptes' | 'anomalies';

const ALL_COMMERCIAL_TABS: (PillTabConfig & { requiresModule?: ModuleKey })[] = [
  { id: 'prospection', label: 'Suivi client', icon: Target, accent: 'orange', requiresModule: 'prospection' },
  { id: 'devis-acceptes', label: 'Devis acceptés', icon: FileCheck, accent: 'teal', requiresModule: 'agence' },
  { id: 'anomalies', label: 'Incohérences', icon: AlertTriangle, accent: 'pink', requiresModule: 'agence' },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CommercialTabContent() {
  const { hasModule } = useEffectiveModules();

  const visibleTabs = useMemo(() => {
    return ALL_COMMERCIAL_TABS.filter(tab => {
      if (!tab.requiresModule) return true;
      return hasModule(tab.requiresModule);
    });
  }, [hasModule]);

  const defaultTab = visibleTabs[0]?.id as CommercialSubTab ?? 'prospection';
  const [activeTab, setActiveTab] = useSessionState<CommercialSubTab>('commercial_sub_tab', defaultTab);
  const effectiveTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : defaultTab;

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as CommercialSubTab)}>
        <PillTabsList tabs={visibleTabs} />

        <TabsContent value="prospection" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <ProspectionTabContent />
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
