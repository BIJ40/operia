/**
 * RelationsTabContent - Onglet "Relations"
 * Sous-onglets groupés :
 *   APPORTEURS : Espace, Échanges
 *   CLIENTS : Suivi (Réglages), Paiements, Journal d'envois
 */

import { lazy, Suspense, useMemo } from 'react';
import { Handshake, MessagesSquare, CreditCard, ScrollText, Settings, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useProfile } from '@/contexts/ProfileContext';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const AgencyApporteurExchanges = lazy(() => import('@/components/agency/AgencyApporteurExchanges'));
const SuiviPaiements = lazy(() => import('@/components/admin/views/SuiviClientsAdminView').then(m => ({ default: m.PaiementsSection })));
const SuiviJournal = lazy(() => import('@/components/admin/views/SuiviClientsAdminView').then(m => ({ default: m.JournalSection })));
const SuiviClientSettingsCard = lazy(() => import('@/components/relations/SuiviClientSettingsCard'));

type RelationsSubTab = 'apporteurs' | 'echanges-apporteurs' | 'parametres' | 'paiements' | 'journal';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function RelationsTabContent() {
  const { agence } = useProfile();
  const [activeTab, setActiveTab] = useSessionState<RelationsSubTab>('relations_sub_tab', 'apporteurs');

  const tabs: PillTabConfig[] = useMemo(() => [
    { id: 'apporteurs', label: 'Espace apporteurs', icon: Handshake, accent: 'purple', group: 'Apporteurs' },
    { id: 'echanges-apporteurs', label: 'Échanges', icon: MessagesSquare, accent: 'purple', group: 'Apporteurs' },
    { id: 'parametres', label: 'Suivi (Réglages)', icon: Settings, accent: 'green', group: 'Clients' },
    { id: 'paiements', label: 'Paiements', icon: CreditCard, accent: 'green', group: 'Clients' },
    { id: 'journal', label: "Journal d'envois", icon: ScrollText, accent: 'green', group: 'Clients' },
  ], []);

  return (
    <DomainAccentProvider accent="purple">
      <div className="py-3 px-2 sm:px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RelationsSubTab)}>
          <PillTabsList tabs={tabs} />

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

          <TabsContent value="parametres" className="mt-4">
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
