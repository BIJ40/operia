/**
 * PublicGuideTabsBar - Barre d'onglets sur 2 lignes pour le Guide Apogée public
 */

import React, { useMemo } from 'react';
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
import { usePublicGuideTabs } from '../contexts/PublicGuideTabsContext';
import { PublicGuideTab } from './PublicGuideTab';

const MAX_TABS_PER_ROW = 8;

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

  // Split tabs into rows (home tab is separate and fixed)
  const { homeTab, otherTabs, row1, row2 } = useMemo(() => {
    const home = tabs.find(t => t.id === 'home');
    const others = tabs.filter(t => t.id !== 'home');
    
    // Split other tabs into 2 rows
    const firstRow = others.slice(0, MAX_TABS_PER_ROW);
    const secondRow = others.slice(MAX_TABS_PER_ROW, MAX_TABS_PER_ROW * 2);
    
    return {
      homeTab: home,
      otherTabs: others,
      row1: firstRow,
      row2: secondRow,
    };
  }, [tabs]);

  // Calculate tab width based on count per row
  const getTabsPerRowCount = (rowTabs: typeof tabs) => {
    return Math.min(rowTabs.length, MAX_TABS_PER_ROW);
  };

  return (
    <div className="border-b bg-muted/30">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map(t => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          {/* Row 1: Home tab + first batch of tabs */}
          <div className="flex items-end px-2 pt-2">
            {homeTab && (
              <PublicGuideTab
                key={homeTab.id}
                tab={homeTab}
                isActive={homeTab.id === activeTabId}
                onActivate={() => setActiveTab(homeTab.id)}
                onClose={() => closeTab(homeTab.id)}
                isIconOnly
              />
            )}
            <div 
              className="flex items-end flex-1"
              style={{ 
                display: 'grid',
                gridTemplateColumns: `repeat(${getTabsPerRowCount(row1)}, minmax(0, 1fr))`,
                gap: '2px'
              }}
            >
              {row1.map(tab => (
                <PublicGuideTab
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onActivate={() => setActiveTab(tab.id)}
                  onClose={() => closeTab(tab.id)}
                  compact={row1.length > 4}
                />
              ))}
            </div>
          </div>
          
          {/* Row 2: Overflow tabs */}
          {row2.length > 0 && (
            <div 
              className="flex items-end px-2"
              style={{ 
                marginLeft: '42px', // Align with row 1 (after home icon)
                display: 'grid',
                gridTemplateColumns: `repeat(${getTabsPerRowCount(row2)}, minmax(0, 1fr))`,
                gap: '2px'
              }}
            >
              {row2.map(tab => (
                <PublicGuideTab
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onActivate={() => setActiveTab(tab.id)}
                  onClose={() => closeTab(tab.id)}
                  compact={row2.length > 4}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>
    </div>
  );
}
