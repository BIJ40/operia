/**
 * RelationsTabContent - Onglet "Relations"
 * Sous-onglets : Paiements, Journal d'envois, Paramètres
 */

import { lazy, Suspense, useMemo } from 'react';
import { CreditCard, ScrollText, Settings, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useProfile } from '@/contexts/ProfileContext';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

const SuiviPaiements = lazy(() => import('@/components/admin/views/SuiviClientsAdminView').then(m => ({ default: m.PaiementsSection })));
const SuiviJournal = lazy(() => import('@/components/admin/views/SuiviClientsAdminView').then(m => ({ default: m.JournalSection })));
const SuiviClientSettingsCard = lazy(() => import('@/components/relations/SuiviClientSettingsCard'));

type RelationsSubTab = 'paiements' | 'journal' | 'parametres';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function RelationsTabContent() {
  const { agence } = useProfile();
  const [activeTab, setActiveTab] = useSessionState<RelationsSubTab>('relations_sub_tab', 'paiements');

  const tabs: PillTabConfig[] = useMemo(() => [
    { id: 'paiements', label: 'Paiements', icon: CreditCard, accent: 'green' },
    { id: 'journal', label: "Journal d'envois", icon: ScrollText, accent: 'green' },
    { id: 'parametres', label: 'Paramètres', icon: Settings, accent: 'green' },
  ], []);

  return (
    <DomainAccentProvider accent="green">
      <div className="py-3 px-2 sm:px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RelationsSubTab)}>
          <PillTabsList tabs={tabs} />

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

          <TabsContent value="parametres" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <SuiviClientSettingsCard />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DomainAccentProvider>
  );
}
