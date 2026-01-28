/**
 * PublicGuideTabsBar - Barre d'onglets draggable pour le Guide Apogée public
 * Version Warm Pastel avec fond gradient
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
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { usePublicGuideTabs } from '../contexts/PublicGuideTabsContext';
import { PublicGuideTab } from './PublicGuideTab';

export function PublicGuideTabsBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs } = usePublicGuideTabs();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex(t => t.id === active.id);
      const newIndex = tabs.findIndex(t => t.id === over.id);
      
      const newOrder = [...tabs];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);
      
      reorderTabs(newOrder.map(t => t.id));
    }
  };

  return (
    <div className="flex items-end border-b bg-gradient-to-r from-muted/40 to-muted/20">
      <ScrollArea className="flex-1">
        <div className="flex items-end px-3 pt-3 gap-1">
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
                <PublicGuideTab
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onActivate={() => setActiveTab(tab.id)}
                  onClose={() => closeTab(tab.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
