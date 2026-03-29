/**
 * RelationsTabContent - Onglet "Relations"
 * Sous-onglets : Espace apporteur, Échanges apporteurs, Suivi client, Paiements, Journal d'envois
 */

import { lazy, Suspense, useMemo } from 'react';
import { Handshake, MessagesSquare, UserCheck, CreditCard, ScrollText, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { useProfile } from '@/contexts/ProfileContext';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';
import type { ModuleKey } from '@/types/modules';

const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const AgencyApporteurExchanges = lazy(() => import('@/components/agency/AgencyApporteurExchanges'));
const SuiviClientSettingsCard = lazy(() => import('@/components/relations/SuiviClientSettingsCard'));
const SuiviPaiements = lazy(() => import('@/components/admin/views/SuiviClientsAdminView').then(m => ({ default: m.PaiementsSection })));
const SuiviJournal = lazy(() => import('@/components/admin/views/SuiviClientsAdminView').then(m => ({ default: m.JournalSection })));

type RelationsSubTab = 'apporteurs' | 'echanges-apporteurs' | 'suivi-clients' | 'paiements' | 'journal';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function RelationsTabContent() {
  const { hasModule } = usePermissionsBridge();
  const { agence } = useProfile();
  const [activeTab, setActiveTab] = useSessionState<RelationsSubTab>('relations_sub_tab', 'apporteurs');

  const allTabs: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'apporteurs', label: 'Espace apporteur', icon: Handshake, accent: 'purple', requiresModule: 'relations.apporteurs' },
    { id: 'echanges-apporteurs', label: 'Échanges apporteurs', icon: MessagesSquare, accent: 'purple', requiresModule: 'relations.apporteurs' },
    { id: 'suivi-clients', label: 'Suivi client', icon: UserCheck, accent: 'green' },
    { id: 'paiements', label: 'Paiements', icon: CreditCard, accent: 'green' },
    { id: 'journal', label: "Journal d'envois", icon: ScrollText, accent: 'green' },
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
              <SuiviClientSettingsCard />
            </Suspense>
          </TabsContent>

          <TabsContent value="paiements" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <SuiviPaiements agencySlug={agence || undefined} />
            </Suspense>
          </TabsContent>

          <TabsContent value="journal" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <SuiviJournal agencySlug={agence || undefined} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DomainAccentProvider>
  );
}
