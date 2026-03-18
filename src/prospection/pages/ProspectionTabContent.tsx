/**
 * ProspectionTabContent - Contenu de l'onglet "Commercial"
 * Hub avec sous-onglets Pill : Suivi client, Comparateur, Veille, Prospects, Réalisations
 * Filtré selon les permissions utilisateur (hasModuleOption)
 */

import { lazy, Suspense, useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { Building2, GitCompare, UserSearch, Radar, Camera, Loader2 } from 'lucide-react';
import { ModuleKey } from '@/types/modules';
import { ApporteurTabsProvider, useApporteurTabs } from '../browser-tabs/ApporteurTabsContext';
import { ApporteurTabsBar } from '../browser-tabs/ApporteurTabsBar';
import { ApporteurTabsContent } from '../browser-tabs/ApporteurTabsContent';
import { ApporteurListPage } from '../pages/ApporteurListPage';
import { ApporteurComparisonPage } from '../pages/ApporteurComparisonPage';
import { ProspectsUnifiedPage } from '../pages/ProspectsUnifiedPage';
import { VeilleApporteursTab } from '../pages/VeilleApporteursTab';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useModuleLabels } from '@/hooks/useModuleLabels';

const RealisationsPage = lazy(() => import('@/realisations/pages/RealisationsPage'));

/** Mapping tab id → module key */
const TAB_MODULE_MAP: Record<string, ModuleKey> = {
  apporteurs: 'commercial.suivi_client',
  comparateur: 'commercial.comparateur',
  veille: 'commercial.veille',
  prospects: 'commercial.prospects',
  realisations: 'commercial.realisations',
};

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
  const { hasModule } = usePermissions();
  const { openApporteur } = useApporteurTabs();
  const { getShortLabel } = useModuleLabels();

  // A: 'Réalisations' maps to module commercial.realisations → dynamic label
  // B: 'Suivi client', 'Comparateur', 'Veille', 'Prospects' are prospection options, not standalone modules → static
  const allTabs: PillTabConfig[] = useMemo(() => [
    { id: 'apporteurs', label: 'Suivi client', icon: Building2 },
    { id: 'comparateur', label: 'Comparateur', icon: GitCompare },
    { id: 'veille', label: 'Veille', icon: Radar },
    { id: 'prospects', label: 'Prospects', icon: UserSearch },
    { id: 'realisations', label: getShortLabel('commercial.realisations', 'Réalisations'), icon: Camera },
  ], [getShortLabel]);

  // Filtrer les onglets visibles selon les permissions
  const visibleTabs = useMemo(() => {
    return allTabs.filter(tab => {
      const moduleKey = TAB_MODULE_MAP[tab.id];
      return moduleKey ? hasModule(moduleKey) : true;
    });
  }, [hasModule, allTabs]);

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

        <TabsContent value="realisations" className="mt-4">
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary/60" /></div>}>
            <RealisationsPage />
          </Suspense>
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
