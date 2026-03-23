/**
 * CommercialTabContent - Onglet "Commercial"
 * Sous-onglets : Suivi client, Comparateur, Veille, Prospects, Réalisations, Social
 */

import { lazy, Suspense, useState, useCallback, useMemo } from 'react';
import { Building2, GitCompare, UserSearch, Radar, Camera, Share2, Stamp, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, type PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';
import { ApporteurTabsProvider, useApporteurTabs } from '@/prospection/browser-tabs/ApporteurTabsContext';
import { ApporteurTabsBar } from '@/prospection/browser-tabs/ApporteurTabsBar';
import { ApporteurTabsContent } from '@/prospection/browser-tabs/ApporteurTabsContent';
import { ApporteurListPage } from '@/prospection/pages/ApporteurListPage';
import { ApporteurComparisonPage } from '@/prospection/pages/ApporteurComparisonPage';
import { ProspectsUnifiedPage } from '@/prospection/pages/ProspectsUnifiedPage';
import { VeilleApporteursTab } from '@/prospection/pages/VeilleApporteursTab';

const RealisationsPage = lazy(() => import('@/realisations/pages/RealisationsPage'));
const SocialHubPage = lazy(() => import('@/pages/commercial/SocialHubPage'));
const SignatureGeneratorPage = lazy(() => import('@/pages/commercial/SignatureGeneratorPage'));

/** Mapping tab id → module key */
const TAB_MODULE_MAP: Record<string, ModuleKey> = {
  apporteurs: 'commercial.suivi_client',
  comparateur: 'commercial.comparateur',
  veille: 'commercial.veille',
  prospects: 'commercial.prospects',
  realisations: 'commercial.realisations',
  social: 'commercial.social',
  signature: 'commercial.signature',
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

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

function CommercialInner() {
  const { hasModule, isDeployedModule, isAdmin } = usePermissions();
  const { openApporteur } = useApporteurTabs();
  const { getShortLabel } = useModuleLabels();
  const { mode: navMode } = useNavigationMode();

  const allTabs: PillTabConfig[] = useMemo(() => [
    { id: 'apporteurs', label: 'Suivi client', icon: Building2 },
    { id: 'comparateur', label: 'Comparateur', icon: GitCompare },
    { id: 'veille', label: 'Veille', icon: Radar },
    { id: 'prospects', label: 'Prospects', icon: UserSearch },
    { id: 'realisations', label: getShortLabel('commercial.realisations', 'Réalisations'), icon: Camera },
    { id: 'social', label: getShortLabel('commercial.social', 'Social'), icon: Share2 },
    { id: 'signature', label: getShortLabel('commercial.signature', 'Signatures'), icon: Stamp },
  ], [getShortLabel]);

  const visibleTabs = useMemo(() => {
    return allTabs
      .filter(tab => {
        const moduleKey = TAB_MODULE_MAP[tab.id];
        if (moduleKey && !isDeployedModule(moduleKey)) return false;
        return true;
      })
      .map(tab => {
        const moduleKey = TAB_MODULE_MAP[tab.id];
        if (moduleKey) return { ...tab, disabled: !isAdmin && !hasModule(moduleKey) };
        return tab;
      });
  }, [allTabs, hasModule, isAdmin, isDeployedModule]);

  const defaultTab = visibleTabs.find(t => !t.disabled)?.id ?? 'apporteurs';
  const [activeTab, setActiveTab] = useSessionState<string>('commercial_sub_tab', defaultTab);
  const effectiveTab = isAdmin && allTabs.some(t => t.id === activeTab)
    ? activeTab
    : ((visibleTabs.find(t => t.id === activeTab && !t.disabled)) ? activeTab : defaultTab);

  const handleVeilleSelectApporteur = useCallback((id: string, name: string) => {
    openApporteur(id, name);
    setActiveTab('apporteurs');
  }, [openApporteur, setActiveTab]);

  if (visibleTabs.every(t => t.disabled)) {
    return <div className="py-6 px-4 text-muted-foreground text-sm">Aucun onglet accessible.</div>;
  }

  return (
    <div className={cn("container mx-auto max-w-7xl", navMode === 'header' ? 'pt-1 px-2 sm:px-4 space-y-3' : 'py-6 px-2 sm:px-4 space-y-4')}>
      <Tabs value={effectiveTab} onValueChange={setActiveTab}>
        {navMode === 'tabs' && <PillTabsList tabs={visibleTabs} />}

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
          <Suspense fallback={<LoadingFallback />}>
            <RealisationsPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <SocialHubPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="signature" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <SignatureGeneratorPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CommercialTabContent() {
  return (
    <DomainAccentProvider accent="orange">
      <ApporteurTabsProvider>
        <CommercialInner />
      </ApporteurTabsProvider>
    </DomainAccentProvider>
  );
}
