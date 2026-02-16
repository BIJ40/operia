/**
 * ProspectionTabContent - Contenu de l'onglet "Prospection"
 * Hub avec sous-onglets Pill : Apporteurs, Comparateur, Veille, Prospects
 * L'onglet Apporteurs utilise un système browser-tabs (multi-fiches ouvertes)
 */

import { useState, useCallback } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { Building2, GitCompare, Bell, UserSearch } from 'lucide-react';
import { ApporteurTabsProvider, useApporteurTabs } from '../browser-tabs/ApporteurTabsContext';
import { ApporteurTabsBar } from '../browser-tabs/ApporteurTabsBar';
import { ApporteurTabsContent } from '../browser-tabs/ApporteurTabsContent';
import { ApporteurListPage } from '../pages/ApporteurListPage';
import { ApporteurComparisonPage } from '../pages/ApporteurComparisonPage';
import { ApporteurAlertsPage } from '../pages/ApporteurAlertsPage';
import { ProspectsUnifiedPage } from '../pages/ProspectsUnifiedPage';

const TABS: PillTabConfig[] = [
  { id: 'apporteurs', label: 'Apporteurs', icon: Building2 },
  { id: 'comparateur', label: 'Comparateur', icon: GitCompare },
  { id: 'veille', label: 'Veille', icon: Bell },
  { id: 'prospects', label: 'Prospects', icon: UserSearch },
];

/** Inner content for Apporteurs tab - needs access to ApporteurTabsContext */
function ApporteursTabInner() {
  const { openApporteur } = useApporteurTabs();

  const handleSelectApporteur = useCallback((id: string, name?: string) => {
    openApporteur(id, name || `Apporteur #${id}`);
  }, [openApporteur]);

  return (
    <div className="flex flex-col h-full">
      <ApporteurTabsBar />
      <ApporteurTabsContent
        overviewContent={
          <ApporteurListPage onSelectApporteur={handleSelectApporteur} />
        }
      />
    </div>
  );
}

export default function ProspectionTabContent() {
  const [activeTab, setActiveTab] = useState('apporteurs');

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <PillTabsList tabs={TABS} />

        <TabsContent value="apporteurs" className="mt-4">
          <ApporteurTabsProvider>
            <ApporteursTabInner />
          </ApporteurTabsProvider>
        </TabsContent>

        <TabsContent value="comparateur" className="mt-4">
          <ApporteurComparisonPage />
        </TabsContent>

        <TabsContent value="veille" className="mt-4">
          <ApporteurAlertsPage onSelectApporteur={() => {}} />
        </TabsContent>

        <TabsContent value="prospects" className="mt-4">
          <ProspectsUnifiedPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}