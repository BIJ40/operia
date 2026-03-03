/**
 * Zone de contenu des onglets Apporteurs
 * Affiche soit la vue d'ensemble (liste/recherche) soit une fiche apporteur
 */

import React from 'react';
import { useApporteurTabs } from './ApporteurTabsContext';
import { ApporteurDashboardPage } from '../pages/ApporteurDashboardPage';
import { cn } from '@/lib/utils';

interface ApporteurTabsContentProps {
  overviewContent: React.ReactNode;
}

export function ApporteurTabsContent({ overviewContent }: ApporteurTabsContentProps) {
  const { tabs, activeTabId, setActiveTab } = useApporteurTabs();

  const handleBack = () => setActiveTab('overview');

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Vue d'ensemble (recherche / liste) */}
      <div className={cn(
        activeTabId === 'overview' ? 'flex flex-col flex-1 min-h-0 overflow-x-hidden overflow-y-auto' : 'hidden'
      )}>
        {overviewContent}
      </div>

      {/* Onglets apporteurs - restent montés pour préserver l'état */}
      {tabs
        .filter(tab => tab.type === 'apporteur' && tab.apporteurId)
        .map(tab => (
          <div
            key={tab.id}
            className={cn(
              activeTabId === tab.id ? 'flex flex-col flex-1 min-h-0 overflow-auto' : 'hidden'
            )}
          >
            <ApporteurDashboardPage
              apporteurId={tab.apporteurId!}
              onBack={handleBack}
            />
          </div>
        ))}
    </div>
  );
}
