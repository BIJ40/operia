/**
 * DashboardWidget - Widget épuré, draggable depuis n'importe où, resizable par les coins
 */

import { useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { useUpdateWidget } from '@/hooks/useDashboard';
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
  const updateWidget = useUpdateWidget();
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: widget.id,
  });

  const style = {
    gridColumn: `span ${widget.width}`,
    gridRow: `span ${widget.height}`,
    transform: CSS.Translate.toString(transform),
  };

  const Icon = ICONS[widget.template?.icon || 'LayoutGrid'] || LayoutGrid;

  const handleResizeMouseDown = useCallback((corner: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onResizeStart?.(widget.id, corner, e);
  }, [widget.id, onResizeStart]);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative transition-all duration-200 overflow-hidden cursor-grab active:cursor-grabbing select-none',
        'bg-card/95 backdrop-blur-sm border-border/50',
        'hover:shadow-lg hover:border-primary/30',
        isDragging && 'opacity-60 scale-[1.02] shadow-2xl z-50 ring-2 ring-primary/50'
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
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-20 group"
            onMouseDown={(e) => handleResizeMouseDown('se', e)}
          >
            <div className="absolute bottom-1 right-1 w-2 h-2 rounded-sm bg-primary/60 group-hover:bg-primary transition-colors" />
          </div>

          {/* Coin bas-gauche */}
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-20 group"
            onMouseDown={(e) => handleResizeMouseDown('sw', e)}
          >
            <div className="absolute bottom-1 left-1 w-2 h-2 rounded-sm bg-primary/60 group-hover:bg-primary transition-colors" />
          </div>

          {/* Coin haut-droite */}
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-20 group"
            onMouseDown={(e) => handleResizeMouseDown('ne', e)}
          >
            <div className="absolute top-1 right-1 w-2 h-2 rounded-sm bg-primary/60 group-hover:bg-primary transition-colors" />
          </div>

          {/* Coin haut-gauche */}
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-20 group"
            onMouseDown={(e) => handleResizeMouseDown('nw', e)}
          >
            <div className="absolute top-1 left-1 w-2 h-2 rounded-sm bg-primary/60 group-hover:bg-primary transition-colors" />
          </div>

          {/* Bords pour resize */}
          <div
            className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize z-20"
            onMouseDown={(e) => handleResizeMouseDown('s', e)}
          />
          <div
            className="absolute top-0 left-4 right-4 h-2 cursor-n-resize z-20"
            onMouseDown={(e) => handleResizeMouseDown('n', e)}
          />
          <div
            className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize z-20"
            onMouseDown={(e) => handleResizeMouseDown('w', e)}
          />
          <div
            className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize z-20"
            onMouseDown={(e) => handleResizeMouseDown('e', e)}
          />
        </>
      )}
    </Card>
  );
}
