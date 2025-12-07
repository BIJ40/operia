/**
 * DashboardGrid - Grille avec drag libre, resize, et zone corbeille
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  DragOverlay,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
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
const GAP = 16;

export function DashboardGrid() {
  const { data: widgets, isLoading } = useUserWidgets();
  const batchUpdate = useBatchUpdateWidgets();
  const removeWidget = useRemoveWidget();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  
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

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // Detect if over trash zone (bottom of screen)
    const { activatorEvent } = event;
    if (activatorEvent && 'clientY' in activatorEvent) {
      const clientY = (activatorEvent as MouseEvent).clientY;
      const windowHeight = window.innerHeight;
      setIsOverTrash(clientY > windowHeight - 100);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const widgetId = activeId;
    setActiveId(null);
    
    if (!widgets || !widgetId) return;

    // Si au-dessus de la corbeille, supprimer
    if (isOverTrash) {
      removeWidget.mutate(widgetId);
      setIsOverTrash(false);
      return;
    }

    const { delta } = event;
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    // Calculate new position
    const deltaColsRaw = delta.x / (CELL_SIZE + GAP);
    const deltaRowsRaw = delta.y / (CELL_SIZE + GAP);
    
    const deltaCols = Math.round(deltaColsRaw);
    const deltaRows = Math.round(deltaRowsRaw);

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
  }, [widgets, batchUpdate, removeWidget, activeId, isOverTrash]);

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
      
      const deltaCols = Math.round(deltaX / (CELL_SIZE + GAP));
      const deltaRows = Math.round(deltaY / (CELL_SIZE + GAP));

      let newWidth = resizing.startWidth;
      let newHeight = resizing.startHeight;
      let newPosX = resizing.startPosX;
      let newPosY = resizing.startPosY;

      // Handle different corners/edges
      if (resizing.corner.includes('e')) {
        newWidth = Math.max(1, Math.min(GRID_COLS - resizing.startPosX, resizing.startWidth + deltaCols));
      }
      if (resizing.corner.includes('w')) {
        const widthChange = Math.min(deltaCols, resizing.startWidth - 1);
        newWidth = Math.max(1, resizing.startWidth - widthChange);
        newPosX = Math.max(0, resizing.startPosX + widthChange);
      }
      if (resizing.corner.includes('s')) {
        newHeight = Math.max(1, resizing.startHeight + deltaRows);
      }
      if (resizing.corner.includes('n')) {
        const heightChange = Math.min(deltaRows, resizing.startHeight - 1);
        newHeight = Math.max(1, resizing.startHeight - heightChange);
        newPosY = Math.max(0, resizing.startPosY + heightChange);
      }

      // Update widget
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
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div 
        ref={gridRef}
        className="relative w-full min-h-[600px] p-4"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gap: `${GAP}px`,
          gridAutoRows: `${CELL_SIZE}px`,
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
