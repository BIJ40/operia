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
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useBrowserTabs, AVAILABLE_MODULES } from './BrowserTabsContext';
import { BrowserTab } from './BrowserTab';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { hasMinimumRole } from '@/types/globalRoles';

export function BrowserTabsBar() {
  const { tabs, activeTabId, openTab, closeTab, setActiveTab, reorderTabs, isTabOpen } = useBrowserTabs();
  const { globalRole } = useAuth();

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

  // Get modules that are not yet open and user has access to
  const availableToOpen = AVAILABLE_MODULES.filter(m => {
    if (isTabOpen(m.id)) return false;
    if (m.minRole && !hasMinimumRole(globalRole, m.minRole as any)) return false;
    return true;
  });

  return (
    <div className="flex items-end border-b bg-muted/30">
      <ScrollArea className="flex-1">
        <div className="flex items-end px-2 pt-2">
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
                <BrowserTab
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

      {availableToOpen.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 mr-2 mb-1 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Ouvrir un module</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            {availableToOpen.map(module => {
              const Icon = module.icon;
              return (
                <DropdownMenuItem
                  key={module.id}
                  onClick={() => openTab(module.id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Icon className="h-4 w-4" />
                  <span>{module.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
