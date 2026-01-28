/**
 * Barre d'onglets Véhicules avec drag & drop
 */

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useVehicleTabs } from './VehicleTabsContext';
import { VehicleTab } from './VehicleTab';
import { VehiclePicker } from './VehiclePicker';
import type { FleetVehicle } from '@/types/maintenance';

interface VehicleTabsBarProps {
  vehicles: FleetVehicle[];
}

export function VehicleTabsBar({ vehicles }: VehicleTabsBarProps) {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs, openVehicle, isTabOpen } = useVehicleTabs();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex(t => t.id === active.id);
      const newIndex = tabs.findIndex(t => t.id === over.id);
      const newOrder = arrayMove(tabs.map(t => t.id), oldIndex, newIndex);
      reorderTabs(newOrder);
    }
  };
  
  return (
    <div className="flex items-end gap-1 border-b border-border bg-muted/30 px-2 overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map(t => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map(tab => (
            <VehicleTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
      
      {/* Bouton + pour ouvrir un véhicule */}
      <VehiclePicker
        vehicles={vehicles}
        onSelect={openVehicle}
        isTabOpen={isTabOpen}
      />
    </div>
  );
}
