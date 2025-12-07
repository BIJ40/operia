/**
 * DashboardGrid - Grille avec positionnement absolu, drag, resize, et zone corbeille
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { useUserWidgets, useBatchUpdateWidgets, useRemoveWidget } from '@/hooks/useDashboard';
import { DashboardWidget } from './DashboardWidget';
import { DashboardEmptyState } from './DashboardEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const GRID_COLS = 12;
const CELL_SIZE = 80;
const GAP = 12;

export function DashboardGrid() {
  const { data: widgets, isLoading } = useUserWidgets();
  const batchUpdate = useBatchUpdateWidgets();
  const removeWidget = useRemoveWidget();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  
  // Resize state
  const [resizing, setResizing] = useState<{
    widgetId: string;
    corner: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsOverTrash(false);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const widgetId = activeId;
    setActiveId(null);
    
    if (!widgets || !widgetId) return;

    // Vérifier si au-dessus de la corbeille via position Y du pointer
    const pointerY = (event.activatorEvent as MouseEvent)?.clientY;
    const windowHeight = window.innerHeight;
    const overTrash = pointerY && pointerY > windowHeight - 100;

    if (overTrash) {
      removeWidget.mutate(widgetId);
      setIsOverTrash(false);
      return;
    }

    const { delta } = event;
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    // Calculate new position based on cell size
    const cellWidth = CELL_SIZE + GAP;
    const cellHeight = CELL_SIZE + GAP;
    
    const deltaCols = Math.round(delta.x / cellWidth);
    const deltaRows = Math.round(delta.y / cellHeight);

    const newX = Math.max(0, Math.min(GRID_COLS - widget.width, widget.position_x + deltaCols));
    const newY = Math.max(0, widget.position_y + deltaRows);

    if (newX !== widget.position_x || newY !== widget.position_y) {
      batchUpdate.mutate([{
        id: widget.id,
        position_x: newX,
        position_y: newY,
        width: widget.width,
        height: widget.height,
      }]);
    }

    setIsOverTrash(false);
  }, [widgets, batchUpdate, removeWidget, activeId]);

  // Track mouse position during drag for trash zone
  useEffect(() => {
    if (!activeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight;
      setIsOverTrash(e.clientY > windowHeight - 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [activeId]);

  // Handle resize
  const handleResizeStart = useCallback((widgetId: string, corner: string, e: React.MouseEvent) => {
    const widget = widgets?.find(w => w.id === widgetId);
    if (!widget) return;

    setResizing({
      widgetId,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: widget.width,
      startHeight: widget.height,
      startPosX: widget.position_x,
      startPosY: widget.position_y,
    });
  }, [widgets]);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const widget = widgets?.find(w => w.id === resizing.widgetId);
      if (!widget) return;

      const deltaX = e.clientX - resizing.startX;
      const deltaY = e.clientY - resizing.startY;
      
      const cellWidth = CELL_SIZE + GAP;
      const cellHeight = CELL_SIZE + GAP;
      
      const deltaCols = Math.round(deltaX / cellWidth);
      const deltaRows = Math.round(deltaY / cellHeight);

      let newWidth = resizing.startWidth;
      let newHeight = resizing.startHeight;
      let newPosX = resizing.startPosX;
      let newPosY = resizing.startPosY;

      // Handle different corners
      if (resizing.corner.includes('e')) {
        newWidth = Math.max(1, Math.min(GRID_COLS - resizing.startPosX, resizing.startWidth + deltaCols));
      }
      if (resizing.corner.includes('w')) {
        const maxShrink = resizing.startWidth - 1;
        const actualDelta = Math.max(-resizing.startPosX, Math.min(maxShrink, deltaCols));
        newPosX = resizing.startPosX + actualDelta;
        newWidth = resizing.startWidth - actualDelta;
      }
      if (resizing.corner.includes('s')) {
        newHeight = Math.max(1, resizing.startHeight + deltaRows);
      }
      if (resizing.corner.includes('n')) {
        const maxShrink = resizing.startHeight - 1;
        const actualDelta = Math.max(-resizing.startPosY, Math.min(maxShrink, deltaRows));
        newPosY = resizing.startPosY + actualDelta;
        newHeight = resizing.startHeight - actualDelta;
      }

      // Only update if something changed
      if (newWidth !== widget.width || newHeight !== widget.height || 
          newPosX !== widget.position_x || newPosY !== widget.position_y) {
        batchUpdate.mutate([{
          id: widget.id,
          position_x: newPosX,
          position_y: newPosY,
          width: newWidth,
          height: newHeight,
        }]);
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, widgets, batchUpdate]);

  const activeWidget = useMemo(() => {
    if (!activeId || !widgets) return null;
    return widgets.find(w => w.id === activeId);
  }, [activeId, widgets]);

  // Calculate grid height based on widgets
  const maxRow = useMemo(() => {
    if (!widgets || widgets.length === 0) return 6;
    return Math.max(6, ...widgets.map(w => w.position_y + w.height));
  }, [widgets]);

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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        className="relative w-full p-4"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${maxRow}, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
        }}
      >
        {widgets.map((widget) => (
          <DashboardWidget
            key={widget.id}
            widget={widget}
            isDragging={activeId === widget.id}
            onResizeStart={handleResizeStart}
          />
        ))}
      </div>

      {/* Zone corbeille - visible uniquement pendant le drag */}
      {activeId && (
        <div 
          className={cn(
            'fixed bottom-0 left-0 right-0 h-24 flex items-center justify-center gap-3 transition-all duration-200 z-50',
            isOverTrash 
              ? 'bg-destructive/90 text-destructive-foreground' 
              : 'bg-muted/80 backdrop-blur-sm text-muted-foreground'
          )}
        >
          <Trash2 className={cn(
            'transition-transform duration-200',
            isOverTrash ? 'h-8 w-8 scale-110' : 'h-6 w-6'
          )} />
          <span className={cn(
            'font-medium transition-all duration-200',
            isOverTrash ? 'text-lg' : 'text-sm'
          )}>
            {isOverTrash ? 'Relâcher pour retirer' : 'Glisser ici pour retirer'}
          </span>
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {activeWidget && (
          <div 
            className="opacity-90 pointer-events-none"
            style={{
              width: activeWidget.width * CELL_SIZE + (activeWidget.width - 1) * GAP,
              height: activeWidget.height * CELL_SIZE + (activeWidget.height - 1) * GAP,
            }}
          >
            <DashboardWidget widget={activeWidget} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
