/**
 * DashboardWidget - Widget épuré, draggable depuis n'importe où, resizable par les coins
 */

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp,
  BarChart3,
  PieChart,
  List,
  Table,
  AlertTriangle,
  Ticket,
  FileText,
  Wrench,
  FolderOpen,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetContent } from './WidgetContent';

const ICONS: Record<string, React.ElementType> = {
  TrendingUp,
  BarChart3,
  PieChart,
  List,
  Table,
  AlertTriangle,
  Ticket,
  FileText,
  Wrench,
  FolderOpen,
  Clock,
  LayoutGrid,
};

interface PreviewDimensions {
  width: number;
  height: number;
  position_x: number;
  position_y: number;
}

interface DashboardWidgetProps {
  widget: UserWidget & { template: WidgetTemplate };
  isDragging?: boolean;
  isResizing?: boolean;
  previewDimensions?: PreviewDimensions;
  onResizeStart?: (widgetId: string, corner: string, e: React.MouseEvent) => void;
}

export function DashboardWidget({ 
  widget, 
  isDragging, 
  isResizing,
  previewDimensions,
  onResizeStart 
}: DashboardWidgetProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: widget.id,
    disabled: isResizing, // Disable drag while resizing
  });

  // Use preview dimensions if resizing, otherwise use widget dimensions
  const dims = previewDimensions || {
    width: widget.width,
    height: widget.height,
    position_x: widget.position_x,
    position_y: widget.position_y,
  };

  // Positionnement absolu dans la grille CSS
  // IMPORTANT: Ne pas appliquer la transformation dnd-kit pendant le drag OU resize
  // L'original reste en place, seul le DragOverlay se déplace
  const style: React.CSSProperties = {
    gridColumnStart: dims.position_x + 1,
    gridColumnEnd: dims.position_x + 1 + dims.width,
    gridRowStart: dims.position_y + 1,
    gridRowEnd: dims.position_y + 1 + dims.height,
    transform: (isDragging || isResizing) ? undefined : CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : isResizing ? 40 : 1,
    transition: (isDragging || isResizing) ? 'none' : undefined,
  };

  const Icon = ICONS[widget.template?.icon || 'LayoutGrid'] || LayoutGrid;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative overflow-hidden cursor-grab active:cursor-grabbing select-none',
        'border-l-4 border-l-helpconfort-blue',
        'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-background to-background',
        'border border-helpconfort-blue/15 shadow-sm',
        'transition-all duration-300',
        'hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5',
        isDragging && 'opacity-50 ring-2 ring-helpconfort-blue/30 ring-dashed',
        isResizing && 'ring-2 ring-helpconfort-blue/50 shadow-xl'
      )}
    >
      {/* Titre minimaliste */}
      <div className="absolute top-2 left-3 right-3 flex items-center gap-2 pointer-events-none z-10">
        <Icon className="h-4 w-4 text-helpconfort-blue shrink-0" />
        <span className="text-xs font-medium text-muted-foreground truncate">
          {widget.template?.name}
        </span>
      </div>

      {/* Contenu du widget */}
      <CardContent className="p-3 pt-8 h-full">
        <WidgetContent widget={widget} />
      </CardContent>

      {/* Poignées de resize aux 4 coins - visibles au hover */}
      {(isHovered || isResizing) && !isDragging && (
        <>
          {/* Coin bas-droite (principal) */}
          <div
            className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize z-30"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart?.(widget.id, 'se', e);
            }}
          >
            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full bg-primary shadow-md" />
          </div>

          {/* Coin bas-gauche */}
          <div
            className="absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize z-30"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart?.(widget.id, 'sw', e);
            }}
          >
            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 rounded-full bg-primary shadow-md" />
          </div>

          {/* Coin haut-droite */}
          <div
            className="absolute top-0 right-0 w-8 h-8 cursor-ne-resize z-30"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart?.(widget.id, 'ne', e);
            }}
          >
            <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-primary shadow-md" />
          </div>

          {/* Coin haut-gauche */}
          <div
            className="absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-30"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart?.(widget.id, 'nw', e);
            }}
          >
            <div className="absolute top-1.5 left-1.5 w-3 h-3 rounded-full bg-primary shadow-md" />
          </div>
        </>
      )}
    </Card>
  );
}
