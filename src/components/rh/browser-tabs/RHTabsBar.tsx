/**
 * Barre d'onglets RH avec drag & drop
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
import { useRHTabs } from './RHTabsContext';
import { RHTab } from './RHTab';
import { RHCollaboratorPicker } from './RHCollaboratorPicker';
import type { RHCollaborator } from '@/types/rh-suivi';

interface RHTabsBarProps {
  collaborators: RHCollaborator[];
}

export function RHTabsBar({ collaborators }: RHTabsBarProps) {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs, openCollaborator, isTabOpen } = useRHTabs();
  
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
    <div className="flex items-end gap-1.5 border-b border-border bg-muted/30 px-3 py-2 overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map(t => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {tabs.map((tab, index) => (
            <RHTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              colorIndex={index}
            />
          ))}
        </SortableContext>
      </DndContext>
      
      {/* Bouton + pour ouvrir un collaborateur */}
      <RHCollaboratorPicker
        collaborators={collaborators}
        onSelect={openCollaborator}
        isTabOpen={isTabOpen}
      />
    </div>
  );
}
