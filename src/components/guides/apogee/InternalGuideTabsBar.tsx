/**
 * InternalGuideTabsBar - Barre d'onglets draggable pour le Guide Apogée interne
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
import { Button } from '@/components/ui/button';
import { useInternalGuideTabs } from './InternalGuideTabsContext';
import { useEditor } from '@/contexts/EditorContext';
import { InternalGuideTab } from './InternalGuideTab';
import { Pencil, PencilOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function InternalGuideTabsBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs } = useInternalGuideTabs();
  const { isEditMode, canEdit, toggleEditMode } = useEditor();

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
    <div className="flex items-end border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
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
                <InternalGuideTab
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
      
      {/* Bouton toggle mode édition */}
      {canEdit && (
        <div className="flex items-center px-3 pb-2 pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isEditMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleEditMode}
                  className={cn(
                    "gap-1.5 h-8 text-xs rounded-xl transition-all",
                    isEditMode 
                      ? "bg-warm-orange hover:bg-warm-orange/90 text-white border-0" 
                      : "border-warm-orange/50 text-warm-orange hover:bg-warm-orange/10"
                  )}
                >
                  {isEditMode ? (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Mode édition
                    </>
                  ) : (
                    <>
                      <PencilOff className="h-3.5 w-3.5" />
                      Lecture seule
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="rounded-xl">
                {isEditMode ? "Désactiver le mode édition" : "Activer le mode édition"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
