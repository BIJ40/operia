/**
 * DashboardGrid - Grille principale du dashboard avec widgets déplaçables
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { useUserWidgets, useBatchUpdateWidgets } from '@/hooks/useDashboard';
import { DashboardWidget } from './DashboardWidget';
import { DashboardEmptyState } from './DashboardEmptyState';
import { Skeleton } from '@/components/ui/skeleton';

const GRID_COLS = 12;
const CELL_SIZE = 80; // px

export function DashboardGrid() {
  const { data: widgets, isLoading } = useUserWidgets();
  const batchUpdate = useBatchUpdateWidgets();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    
    if (!widgets) return;

    const { active, delta } = event;
    const widget = widgets.find(w => w.id === active.id);
    if (!widget) return;

    // Calculate new position based on drag delta
    const newX = Math.max(0, Math.min(GRID_COLS - widget.width, 
      widget.position_x + Math.round(delta.x / CELL_SIZE)));
    const newY = Math.max(0, widget.position_y + Math.round(delta.y / CELL_SIZE));

    if (newX !== widget.position_x || newY !== widget.position_y) {
      batchUpdate.mutate([{
        id: widget.id,
        position_x: newX,
        position_y: newY,
        width: widget.width,
        height: widget.height,
      }]);
    }
  }, [widgets, batchUpdate]);

  const activeWidget = useMemo(() => {
    if (!activeId || !widgets) return null;
    return widgets.find(w => w.id === activeId);
  }, [activeId, widgets]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 p-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!widgets || widgets.length === 0) {
    return <DashboardEmptyState />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        className="relative w-full min-h-[600px] p-4"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gap: '16px',
          gridAutoRows: `${CELL_SIZE}px`,
        }}
      >
        {widgets.map((widget) => (
          <DashboardWidget
            key={widget.id}
            widget={widget}
            isDragging={activeId === widget.id}
          />
        ))}
      </div>

      <DragOverlay>
        {activeWidget && (
          <div 
            className="opacity-80 pointer-events-none"
            style={{
              width: activeWidget.width * CELL_SIZE + (activeWidget.width - 1) * 16,
              height: activeWidget.height * CELL_SIZE + (activeWidget.height - 1) * 16,
            }}
          >
            <DashboardWidget widget={activeWidget} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
