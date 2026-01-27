/**
 * Zone de contenu des onglets RH
 * Affiche soit la vue d'ensemble (tableau) soit une fiche collaborateur
 */

import React from 'react';
import { useRHTabs } from './RHTabsContext';
import { RHCollaboratorPanel } from './RHCollaboratorPanel';
import { cn } from '@/lib/utils';

interface RHTabsContentProps {
  overviewContent: React.ReactNode;
}

export function RHTabsContent({ overviewContent }: RHTabsContentProps) {
  const { tabs, activeTabId } = useRHTabs();
  
  return (
    <div className="flex-1 overflow-auto">
      {/* Vue d'ensemble */}
      <div className={cn(activeTabId === 'overview' ? 'block' : 'hidden')}>
        {overviewContent}
      </div>
      
      {/* Onglets collaborateurs - restent montés pour préserver l'état */}
      {tabs
        .filter(tab => tab.type === 'collaborator' && tab.collaboratorId)
        .map(tab => (
          <div
            key={tab.id}
            className={cn(activeTabId === tab.id ? 'block' : 'hidden')}
          >
            <RHCollaboratorPanel collaboratorId={tab.collaboratorId!} />
          </div>
        ))}
    </div>
  );
}
