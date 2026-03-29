/**
 * RelationsTabContent - Onglet "Relations"
 * Sous-onglets : Espace apporteur, Échanges apporteurs, Suivi client
 */

import { lazy, Suspense, useMemo } from 'react';
import { Handshake, MessagesSquare, UserCheck, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';
import type { ModuleKey } from '@/types/modules';

const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const AgencyApporteurExchanges = lazy(() => import('@/components/agency/AgencyApporteurExchanges'));
const SuiviClientsAdminView = lazy(() => import('@/components/admin/views/SuiviClientsAdminView'));

type RelationsSubTab = 'apporteurs' | 'echanges-apporteurs' | 'suivi-clients';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function RelationsTabContent() {
  const { hasModule } = usePermissionsBridge();
  const [activeTab, setActiveTab] = useSessionState<RelationsSubTab>('relations_sub_tab', 'apporteurs');

  const allTabs: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'apporteurs', label: 'Espace apporteur', icon: Handshake, accent: 'purple', requiresModule: 'relations.apporteurs' },
    { id: 'echanges-apporteurs', label: 'Échanges apporteurs', icon: MessagesSquare, accent: 'purple', requiresModule: 'relations.apporteurs' },
    { id: 'suivi-clients', label: 'Suivi client', icon: UserCheck, accent: 'green' },
  ], []);

  const visibleTabs = useMemo(() =>
    allTabs.filter(t => !t.requiresModule || hasModule(t.requiresModule)),
    [allTabs, hasModule]
  );

  return (
    <DomainAccentProvider accent="purple">
      <div className="py-3 px-2 sm:px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RelationsSubTab)}>
          <PillTabsList tabs={visibleTabs} />

          <TabsContent value="apporteurs" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <MesApporteursTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="echanges-apporteurs" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <AgencyApporteurExchanges />
            </Suspense>
          </TabsContent>

          <TabsContent value="suivi-clients" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <SuiviClientsAdminView />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DomainAccentProvider>
  );
}
