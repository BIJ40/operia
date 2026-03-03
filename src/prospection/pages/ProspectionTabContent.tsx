/**
 * ProspectionTabContent - Contenu de l'onglet "Commercial"
 * Hub avec sous-onglets Pill : Suivi client, Comparateur, Veille, Prospects
 */

import { useState, useCallback } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { Building2, GitCompare, UserSearch, Radar } from 'lucide-react';
import { ApporteurTabsProvider, useApporteurTabs } from '../browser-tabs/ApporteurTabsContext';
import { ApporteurTabsBar } from '../browser-tabs/ApporteurTabsBar';
import { ApporteurTabsContent } from '../browser-tabs/ApporteurTabsContent';
import { ApporteurListPage } from '../pages/ApporteurListPage';
import { ApporteurComparisonPage } from '../pages/ApporteurComparisonPage';
import { ProspectsUnifiedPage } from '../pages/ProspectsUnifiedPage';
import { VeilleApporteursTab } from '../pages/VeilleApporteursTab';

const TABS: PillTabConfig[] = [
  { id: 'apporteurs', label: 'Suivi client', icon: Building2 },
  { id: 'comparateur', label: 'Comparateur', icon: GitCompare },
  { id: 'veille', label: 'Veille', icon: Radar },
  { id: 'prospects', label: 'Prospects', icon: UserSearch },
];

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

function ProspectionInner() {
  const [activeTab, setActiveTab] = useState('apporteurs');
  const { openApporteur } = useApporteurTabs();

  const handleVeilleSelectApporteur = useCallback((id: string, name: string) => {
    openApporteur(id, name);
    setActiveTab('apporteurs');
  }, [openApporteur]);

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <PillTabsList tabs={TABS} />

        <TabsContent value="apporteurs" className="mt-4">
          <ApporteursTabInner />
        </TabsContent>

        <TabsContent value="comparateur" className="mt-4">
          <ApporteurComparisonPage />
        </TabsContent>

        <TabsContent value="veille" className="mt-4">
          <VeilleApporteursTab onSelectApporteur={handleVeilleSelectApporteur} />
        </TabsContent>

        <TabsContent value="prospects" className="mt-4">
          <ProspectsUnifiedPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProspectionTabContent() {
  return (
    <ApporteurTabsProvider>
      <ProspectionInner />
    </ApporteurTabsProvider>
  );
}
