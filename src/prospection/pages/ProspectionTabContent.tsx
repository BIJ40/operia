/**
 * ProspectionTabContent - Contenu de l'onglet "Commercial"
 * Hub avec sous-onglets Pill : Suivi client, Comparateur, Veille, Prospects
 * Filtré selon les permissions utilisateur (hasModuleOption)
 */

import { useState, useCallback, useMemo } from 'react';
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
import { usePermissions } from '@/contexts/PermissionsContext';

/** Mapping tab id → clé d'option du module prospection */
const TAB_OPTION_MAP: Record<string, string> = {
  apporteurs: 'dashboard',
  comparateur: 'comparateur',
  veille: 'veille',
  prospects: 'prospects',
};

const ALL_TABS: PillTabConfig[] = [
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
  const { hasModuleOption } = useAuth();
  const { openApporteur } = useApporteurTabs();

  // Filtrer les onglets visibles selon les permissions
  const visibleTabs = useMemo(() => {
    return ALL_TABS.filter(tab => {
      const optionKey = TAB_OPTION_MAP[tab.id];
      return optionKey ? hasModuleOption('prospection', optionKey) : true;
    });
  }, [hasModuleOption]);

  const [activeTab, setActiveTab] = useState(() => visibleTabs[0]?.id ?? 'apporteurs');

  const handleVeilleSelectApporteur = useCallback((id: string, name: string) => {
    openApporteur(id, name);
    setActiveTab('apporteurs');
  }, [openApporteur]);

  if (visibleTabs.length === 0) {
    return <div className="py-6 px-4 text-muted-foreground text-sm">Aucun onglet accessible.</div>;
  }

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <PillTabsList tabs={visibleTabs} />

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
