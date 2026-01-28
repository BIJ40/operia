/**
 * Zone de contenu des onglets Véhicules
 * Affiche soit la vue d'ensemble (liste) soit une fiche véhicule
 */

import React from 'react';
import { useVehicleTabs } from './VehicleTabsContext';
import { VehiclePanel } from './VehiclePanel';
import { cn } from '@/lib/utils';

interface VehicleTabsContentProps {
  overviewContent: React.ReactNode;
}

export function VehicleTabsContent({ overviewContent }: VehicleTabsContentProps) {
  const { tabs, activeTabId } = useVehicleTabs();
  
  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      {/* Vue d'ensemble */}
      <div className={cn(
        activeTabId === 'overview' ? 'flex flex-col flex-1 min-h-0' : 'hidden'
      )}>
        {overviewContent}
      </div>
      
      {/* Onglets véhicules - restent montés pour préserver l'état */}
      {tabs
        .filter(tab => tab.type === 'vehicle' && tab.vehicleId)
        .map(tab => (
          <div
            key={tab.id}
            className={cn(
              activeTabId === tab.id ? 'flex flex-col flex-1 min-h-0 overflow-auto' : 'hidden'
            )}
          >
            <VehiclePanel vehicleId={tab.vehicleId!} />
          </div>
        ))}
    </div>
  );
}
