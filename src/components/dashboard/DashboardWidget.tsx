/**
 * DashboardWidget - Widget épuré, draggable depuis n'importe où, resizable par les coins
 */

import { useState, useCallback } from 'react';
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

interface DashboardWidgetProps {
  widget: UserWidget & { template: WidgetTemplate };
  isDragging?: boolean;
  onResizeStart?: (widgetId: string, corner: string, e: React.MouseEvent) => void;
}

export function DashboardWidget({ widget, isDragging, onResizeStart }: DashboardWidgetProps) {
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: widget.id,
  });

  // Positionnement absolu dans la grille CSS
  const style: React.CSSProperties = {
    gridColumnStart: widget.position_x + 1,
    gridColumnEnd: widget.position_x + 1 + widget.width,
    gridRowStart: widget.position_y + 1,
    gridRowEnd: widget.position_y + 1 + widget.height,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
  };

  const Icon = ICONS[widget.template?.icon || 'LayoutGrid'] || LayoutGrid;

  // Resize is now handled directly in onPointerDown to prevent dnd-kit from capturing the event

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative transition-shadow duration-200 overflow-hidden cursor-grab active:cursor-grabbing select-none',
        'bg-card/95 backdrop-blur-sm border-border/50',
        'hover:shadow-lg hover:border-primary/30',
        isDragging && 'opacity-60 shadow-2xl ring-2 ring-primary/50'
      )}
    >
      {/* Titre minimaliste */}
      <div className="absolute top-2 left-3 right-3 flex items-center gap-2 pointer-events-none z-10">
        <Icon className="h-4 w-4 text-primary/70 shrink-0" />
        <span className="text-xs font-medium text-muted-foreground truncate">
          {widget.template?.name}
        </span>
      </div>

      {/* Contenu du widget */}
      <CardContent className="p-3 pt-8 h-full">
        <WidgetContent widget={widget} />
      </CardContent>

      {/* Poignées de resize aux 4 coins - visibles au hover */}
      {isHovered && !isDragging && (
        <>
          {/* Coin bas-droite (principal) */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-30 group"
            data-no-dnd="true"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart?.(widget.id, 'se', e as unknown as React.MouseEvent);
            }}
          >
            <div className="absolute bottom-1 right-1 w-3 h-3 rounded-sm bg-primary/80 group-hover:bg-primary transition-colors shadow-sm" />
          </div>

          {/* Coin bas-gauche */}
          <div
            className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize z-30 group"
            data-no-dnd="true"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart?.(widget.id, 'sw', e as unknown as React.MouseEvent);
            }}
          >
            <div className="absolute bottom-1 left-1 w-3 h-3 rounded-sm bg-primary/80 group-hover:bg-primary transition-colors shadow-sm" />
          </div>

          {/* Coin haut-droite */}
          <div
            className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize z-30 group"
            data-no-dnd="true"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart?.(widget.id, 'ne', e as unknown as React.MouseEvent);
            }}
          >
            <div className="absolute top-1 right-1 w-3 h-3 rounded-sm bg-primary/80 group-hover:bg-primary transition-colors shadow-sm" />
          </div>

          {/* Coin haut-gauche */}
          <div
            className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-30 group"
            data-no-dnd="true"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart?.(widget.id, 'nw', e as unknown as React.MouseEvent);
            }}
          >
            <div className="absolute top-1 left-1 w-3 h-3 rounded-sm bg-primary/80 group-hover:bg-primary transition-colors shadow-sm" />
          </div>
        </>
      )}
    </Card>
  );
}
