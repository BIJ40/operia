/**
 * PublicGuideTabsContent - Zone de contenu des onglets
 * Les onglets inactifs restent montés (hidden) pour préserver l'état
 */

import React, { Suspense, lazy } from 'react';
import { usePublicGuideTabs } from '../contexts/PublicGuideTabsContext';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load des composants de contenu
const PublicGuideHome = lazy(() => import('../pages/PublicGuideHome'));
const PublicGuideCategoryPanel = lazy(() => import('../pages/PublicGuideCategoryPanel'));

function TabContentLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

export function PublicGuideTabsContent() {
  const { tabs, activeTabId } = usePublicGuideTabs();

  return (
    <div className="flex-1 overflow-auto bg-background">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={tab.id === activeTabId ? 'block h-full' : 'hidden'}
          role="tabpanel"
          aria-hidden={tab.id !== activeTabId}
        >
          <Suspense fallback={<TabContentLoader />}>
            {tab.id === 'home' ? (
              <PublicGuideHome />
            ) : (
              <PublicGuideCategoryPanel slug={tab.id} />
            )}
          </Suspense>
        </div>
      ))}
    </div>
  );
}
