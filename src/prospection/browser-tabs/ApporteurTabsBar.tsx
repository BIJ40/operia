/**
 * Barre d'onglets Apporteurs avec drag & drop
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
import { useApporteurTabs } from './ApporteurTabsContext';
import { ApporteurTab } from './ApporteurTab';
import { ApporteurPicker } from './ApporteurPicker';

export function ApporteurTabsBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs, openApporteur, isTabOpen } = useApporteurTabs();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex(t => t.id === active.id);
      const newIndex = tabs.findIndex(t => t.id === over.id);
      reorderTabs(arrayMove(tabs.map(t => t.id), oldIndex, newIndex));
    }
  };

  return (
    <div className="flex items-end gap-1.5 border-b border-border bg-muted/30 px-3 py-2 overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map(t => t.id)} strategy={horizontalListSortingStrategy}>
          {tabs.map((tab, index) => (
            <ApporteurTab
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
      <ApporteurPicker onSelect={openApporteur} isTabOpen={isTabOpen} />
    </div>
  );
}
