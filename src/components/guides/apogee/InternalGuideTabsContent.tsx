/**
 * InternalGuideTabsContent - Zone de contenu des onglets pour le Guide Apogée interne
 * Les onglets inactifs restent montés (hidden) pour préserver l'état
 */

import React, { Suspense } from 'react';
import { useInternalGuideTabs } from './InternalGuideTabsContext';
import { InternalGuideHome } from './InternalGuideHome';
import { InternalGuideCategoryPanel } from './InternalGuideCategoryPanel';
import { Skeleton } from '@/components/ui/skeleton';

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

export function InternalGuideTabsContent() {
  const { tabs, activeTabId } = useInternalGuideTabs();

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
              <InternalGuideHome />
            ) : (
              <InternalGuideCategoryPanel slug={tab.id} />
            )}
          </Suspense>
        </div>
      ))}
    </div>
  );
}
