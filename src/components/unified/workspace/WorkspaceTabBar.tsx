/**
 * WorkspaceTabBar - Draggable tab bar with DnD support
 */
import { useMemo, useCallback } from 'react';
import { Home } from 'lucide-react';
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
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TabsList } from '@/components/ui/tabs';
import { DraggableTab } from '@/components/unified/DraggableTab';
import { ACCENT_THEMES, type AccentThemeKey } from '@/lib/accentThemes';
import { ProfileMenu } from './ProfileMenu';
import type { TabConfig, UnifiedTab } from './types';

// Couleurs par onglet
const TAB_ACCENTS: Record<UnifiedTab, AccentThemeKey> = {
  accueil: 'blue',
  pilotage: 'pink',
  commercial: 'orange',
  organisation: 'green',
  documents: 'red',
  ticketing: 'purple',
  aide: 'cyan',
  admin: 'neutral',
  test: 'teal',
};

interface WorkspaceTabBarProps {
  sortedTabs: TabConfig[];
  sortableIds: UnifiedTab[];
  activeTab: UnifiedTab;
  tabButtonClass: string;
  isTabAccessible: (tab: TabConfig) => boolean;
  isTabVisuallyDisabled: (tab: TabConfig) => boolean;
  setActiveTab: (tab: UnifiedTab) => void;
  setTabOrder: (order: UnifiedTab[]) => void;
}

export function WorkspaceTabBar({
  sortedTabs,
  sortableIds,
  activeTab,
  tabButtonClass,
  isTabAccessible,
  isTabVisuallyDisabled,
  setActiveTab,
  setTabOrder,
}: WorkspaceTabBarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (active.id === 'accueil' || over.id === 'accueil') return;

    const oldIndex = sortableIds.indexOf(active.id as UnifiedTab);
    const newIndex = sortableIds.indexOf(over.id as UnifiedTab);

    if (oldIndex !== -1 && newIndex !== -1) {
      setTabOrder(arrayMove(sortableIds, oldIndex, newIndex) as UnifiedTab[]);
    }
  }, [sortableIds, setTabOrder]);

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm print:hidden">
      <div className="container mx-auto max-w-7xl px-4 pt-3 pb-0">
        <div className="flex items-end justify-between gap-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <TabsList className="h-auto p-0 bg-transparent flex flex-nowrap gap-1 items-end justify-start flex-1 overflow-x-auto scrollbar-hide">
              {/* Onglet Accueil - non draggable */}
              {sortedTabs[0] && (
                <button
                  onClick={() => setActiveTab('accueil')}
                  data-state={activeTab === 'accueil' ? 'active' : 'inactive'}
                  className={tabButtonClass}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 shrink-0">
                      <Home className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">Accueil</span>
                  </div>
                </button>
              )}

              {/* Onglets sortables */}
              <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
                {sortedTabs.slice(1).map((tab) => {
                  const Icon = tab.icon;
                  const accent = ACCENT_THEMES[TAB_ACCENTS[tab.id]];
                  const accessible = isTabAccessible(tab);
                  const disabled = isTabVisuallyDisabled(tab);
                  return (
                    <DraggableTab
                      key={tab.id}
                      id={tab.id}
                      isActive={activeTab === tab.id}
                      isDraggable={accessible}
                      isDisabled={disabled}
                      onClick={() => accessible ? setActiveTab(tab.id) : undefined}
                      className={tabButtonClass}
                    >
                      <div className={`flex items-center gap-2 ${disabled ? 'opacity-40' : ''}`}>
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 shrink-0`}>
                          <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-semibold tracking-tight">{tab.label}</span>
                      </div>
                    </DraggableTab>
                  );
                })}
              </SortableContext>
            </TabsList>
          </DndContext>

          <ProfileMenu tabButtonClass={tabButtonClass} />
        </div>
      </div>
      <div className="container mx-auto max-w-7xl px-4">
        <div className="border-t-2 border-primary/50 bg-background"></div>
      </div>
    </div>
  );
}
