import React, { Suspense, lazy, useMemo } from 'react';
import { useBrowserTabs } from './BrowserTabsContext';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load all module components
const FranchiseurHome = lazy(() => import('@/franchiseur/pages/FranchiseurHome'));
const FranchiseurStats = lazy(() => import('@/franchiseur/pages/FranchiseurStats'));
const FranchiseurComparison = lazy(() => import('@/franchiseur/pages/FranchiseurComparison'));
const ComparatifAgencesPage = lazy(() => import('@/franchiseur/pages/ComparatifAgencesPage'));
const ReseauGraphiquesPage = lazy(() => import('@/franchiseur/pages/ReseauGraphiquesPage'));
const FranchiseurAgencies = lazy(() => import('@/franchiseur/pages/FranchiseurAgencies'));

const FranchiseurRoyalties = lazy(() => import('@/franchiseur/pages/FranchiseurRoyalties'));
const TDRUsersPage = lazy(() => import('@/pages/TDRUsersPage'));
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'));

// Map module IDs to their components
const MODULE_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  dashboard: FranchiseurHome,
  stats: FranchiseurStats,
  periodes: FranchiseurComparison,
  comparatif: ComparatifAgencesPage,
  graphiques: ReseauGraphiquesPage,
  agences: FranchiseurAgencies,
  
  redevances: FranchiseurRoyalties,
  users: TDRUsersPage,
  annonces: AdminAnnouncements,
};

function TabContentLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

interface TabPanelProps {
  moduleId: string;
  isActive: boolean;
}

function TabPanel({ moduleId, isActive }: TabPanelProps) {
  const Component = MODULE_COMPONENTS[moduleId];

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

export function BrowserTabsContent() {
  const { tabs, activeTabId } = useBrowserTabs();

  // Keep all opened tabs mounted but hidden for state preservation
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
