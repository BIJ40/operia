/**
 * DashboardGrid - Grille avec positionnement absolu, drag, resize fluide, et zone corbeille
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

interface ResizeState {
  widgetId: string;
  corner: string;
  startX: number;
  startY: number;
  originalWidget: {
    width: number;
    height: number;
    position_x: number;
    position_y: number;
  };
  // Live preview values (visual only)
  previewWidth: number;
  previewHeight: number;
  previewX: number;
  previewY: number;
}

interface DashboardGridProps {
  isEditMode: boolean;
}

export function DashboardGrid({ isEditMode }: DashboardGridProps) {
  const { data: widgets, isLoading } = useUserWidgets();
  const batchUpdate = useBatchUpdateWidgets();
  const removeWidget = useRemoveWidget();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (!isEditMode) return; // Block drag if not in edit mode
    if (resizing) return; // Don't start drag while resizing
    setActiveId(event.active.id as string);
  }, [resizing, isEditMode]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!isEditMode) return; // Block drag if not in edit mode
    
    const widgetId = activeId;
    setActiveId(null);
    
    if (!widgets || !widgetId) return;

    const { delta } = event;
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

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
  }, [widgets, batchUpdate, activeId, isEditMode]);


  // Handle resize start
  const handleResizeStart = useCallback((widgetId: string, corner: string, e: React.MouseEvent) => {
    if (!isEditMode) return; // Block resize if not in edit mode
    
    const widget = widgets?.find(w => w.id === widgetId);
    if (!widget) return;

    e.preventDefault();
    e.stopPropagation();

    setResizing({
      widgetId,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      originalWidget: {
        width: widget.width,
        height: widget.height,
        position_x: widget.position_x,
        position_y: widget.position_y,
      },
      previewWidth: widget.width,
      previewHeight: widget.height,
      previewX: widget.position_x,
      previewY: widget.position_y,
    });
  }, [widgets, isEditMode]);

  // Handle resize move - only update local preview state
  useEffect(() => {
    if (!resizing || !isEditMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizing.startX;
      const deltaY = e.clientY - resizing.startY;
      
      const cellWidth = CELL_SIZE + GAP;
      const cellHeight = CELL_SIZE + GAP;
      
      const deltaCols = Math.round(deltaX / cellWidth);
      const deltaRows = Math.round(deltaY / cellHeight);

      let newWidth = resizing.originalWidget.width;
      let newHeight = resizing.originalWidget.height;
      let newPosX = resizing.originalWidget.position_x;
      let newPosY = resizing.originalWidget.position_y;

      // Handle different corners
      if (resizing.corner.includes('e')) {
        newWidth = Math.max(1, Math.min(GRID_COLS - resizing.originalWidget.position_x, resizing.originalWidget.width + deltaCols));
      }
      if (resizing.corner.includes('w')) {
        const maxShrink = resizing.originalWidget.width - 1;
        const actualDelta = Math.max(-resizing.originalWidget.position_x, Math.min(maxShrink, deltaCols));
        newPosX = resizing.originalWidget.position_x + actualDelta;
        newWidth = resizing.originalWidget.width - actualDelta;
      }
      if (resizing.corner.includes('s')) {
        newHeight = Math.max(1, resizing.originalWidget.height + deltaRows);
      }
      if (resizing.corner.includes('n')) {
        const maxShrink = resizing.originalWidget.height - 1;
        const actualDelta = Math.max(-resizing.originalWidget.position_y, Math.min(maxShrink, deltaRows));
        newPosY = resizing.originalWidget.position_y + actualDelta;
        newHeight = resizing.originalWidget.height - actualDelta;
      }

      // Update preview state only (no database call)
      setResizing(prev => prev ? {
        ...prev,
        previewWidth: newWidth,
        previewHeight: newHeight,
        previewX: newPosX,
        previewY: newPosY,
      } : null);
    };

    const handleMouseUp = () => {
      // Save to database only on mouse up
      if (resizing) {
        const { previewWidth, previewHeight, previewX, previewY, originalWidget, widgetId } = resizing;
        
        if (previewWidth !== originalWidget.width || 
            previewHeight !== originalWidget.height ||
            previewX !== originalWidget.position_x ||
            previewY !== originalWidget.position_y) {
          batchUpdate.mutate([{
            id: widgetId,
            position_x: previewX,
            position_y: previewY,
            width: previewWidth,
            height: previewHeight,
          }]);
        }
      }
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, batchUpdate, isEditMode]);

  const activeWidget = useMemo(() => {
    if (!activeId || !widgets) return null;
    return widgets.find(w => w.id === activeId);
  }, [activeId, widgets]);

  // Get widget dimensions - use preview if resizing, otherwise use actual
  const getWidgetDimensions = useCallback((widget: UserWidget & { template: WidgetTemplate }) => {
    if (resizing && resizing.widgetId === widget.id) {
      return {
        width: resizing.previewWidth,
        height: resizing.previewHeight,
        position_x: resizing.previewX,
        position_y: resizing.previewY,
      };
    }
    return {
      width: widget.width,
      height: widget.height,
      position_x: widget.position_x,
      position_y: widget.position_y,
    };
  }, [resizing]);

  // Calculate grid height based on widgets
  const maxRow = useMemo(() => {
    if (!widgets || widgets.length === 0) return 6;
    
    // Consider preview dimensions if resizing
    let maxHeight = 6;
    for (const w of widgets) {
      const dims = resizing && resizing.widgetId === w.id
        ? { y: resizing.previewY, h: resizing.previewHeight }
        : { y: w.position_y, h: w.height };
      maxHeight = Math.max(maxHeight, dims.y + dims.h);
    }
    return maxHeight;
  }, [widgets, resizing]);

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
      {/* Indicateur mode édition */}
      {isEditMode && (
        <div className="mb-4 p-3 rounded-lg bg-helpconfort-blue/10 border border-helpconfort-blue/30 text-sm text-helpconfort-blue flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-helpconfort-blue animate-pulse" />
          Mode édition actif — Déplacez et redimensionnez vos widgets
        </div>
      )}

      <div 
        ref={gridRef}
        className={cn(
          "relative w-full p-4 rounded-xl transition-all duration-300",
          isEditMode && "bg-muted/30 ring-2 ring-helpconfort-blue/20 ring-dashed"
        )}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${maxRow}, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
        }}
      >
        {widgets.map((widget) => {
          const dims = getWidgetDimensions(widget);
          return (
            <DashboardWidget
              key={widget.id}
              widget={widget}
              isEditMode={isEditMode}
              isDragging={activeId === widget.id}
              isResizing={resizing?.widgetId === widget.id}
              previewDimensions={resizing?.widgetId === widget.id ? dims : undefined}
              onResizeStart={handleResizeStart}
              onDelete={(id) => removeWidget.mutate(id)}
            />
          );
        })}
      </div>

      {/* Zone corbeille - barre en bas au centre pendant le drag */}

      <DragOverlay dropAnimation={null}>
        {activeWidget && isEditMode && gridRef.current && (() => {
          // Calculer la taille réelle d'une cellule basée sur la largeur de la grille
          const gridWidth = gridRef.current.clientWidth - 32; // padding 16px de chaque côté
          const totalGaps = (GRID_COLS - 1) * GAP;
          const cellWidth = (gridWidth - totalGaps) / GRID_COLS;
          
          return (
            <div 
              className="opacity-80 pointer-events-none shadow-2xl"
              style={{
                width: activeWidget.width * cellWidth + (activeWidget.width - 1) * GAP,
                height: activeWidget.height * CELL_SIZE + (activeWidget.height - 1) * GAP,
              }}
            >
              <DashboardWidget widget={activeWidget} isEditMode={isEditMode} isDragging />
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}
