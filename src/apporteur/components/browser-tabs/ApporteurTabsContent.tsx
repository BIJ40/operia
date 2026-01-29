/**
 * ApporteurTabsContent - Contenu des onglets Apporteur
 * Garde les onglets montés mais cachés pour préserver l'état
 */

import React, { Suspense, lazy } from 'react';
import { useApporteurTabs } from './ApporteurTabsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

// Lazy load des contenus d'onglets
const AccueilContent = lazy(() => import('../tabs/AccueilTabContent'));
const DossiersContent = lazy(() => import('../tabs/DossiersTabContent'));
const DemandesContent = lazy(() => import('../tabs/DemandesTabContent'));
const DiversContent = lazy(() => import('../tabs/DiversTabContent'));
const ProfilContent = lazy(() => import('../tabs/ProfilTabContent'));

// Map des modules vers leurs composants
const TAB_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  accueil: AccueilContent,
  dossiers: DossiersContent,
  demandes: DemandesContent,
  divers: DiversContent,
  profil: ProfilContent,
};

function TabContentLoader() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Chargement...</span>
      </div>
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

interface TabPanelProps {
  moduleId: string;
  isActive: boolean;
}

function TabPanel({ moduleId, isActive }: TabPanelProps) {
  const Component = TAB_COMPONENTS[moduleId];

  if (!Component) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Module non trouvé: {moduleId}
      </div>
    );
  }

  return (
    <div
      className={isActive ? 'block' : 'hidden'}
      role="tabpanel"
      aria-hidden={!isActive}
    >
      <Suspense fallback={<TabContentLoader />}>
        <Component />
      </Suspense>
    </div>
  );
}

export function ApporteurTabsContent() {
  const { tabs, activeTabId } = useApporteurTabs();

  return (
    <div className="flex-1 overflow-auto bg-background">
      {tabs.map(tab => (
        <TabPanel
          key={tab.id}
          moduleId={tab.id}
          isActive={tab.id === activeTabId}
        />
      ))}
    </div>
  );
}
