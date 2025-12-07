/**
 * DashboardWidget - Composant widget individuel avec actions
 */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { useRemoveWidget, useUpdateWidget } from '@/hooks/useDashboard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Minimize2, 
  Maximize2, 
  X,
  GripVertical,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
}

export function DashboardWidget({ widget, isDragging }: DashboardWidgetProps) {
  const removeWidget = useRemoveWidget();
  const updateWidget = useUpdateWidget();

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: widget.id,
  });

  const style = {
    gridColumn: `span ${widget.width}`,
    gridRow: `span ${widget.height}`,
    transform: CSS.Translate.toString(transform),
  };

  const Icon = ICONS[widget.template?.icon || 'LayoutGrid'] || LayoutGrid;

  const handleToggleState = () => {
    const newState = widget.state === 'minimized' ? 'normal' : 'minimized';
    updateWidget.mutate({ id: widget.id, updates: { state: newState } });
  };

  const handleMaximize = () => {
    updateWidget.mutate({ id: widget.id, updates: { state: 'maximized' } });
  };

  const handleRemove = () => {
    removeWidget.mutate(widget.id);
  };

  const isMinimized = widget.state === 'minimized';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative transition-all duration-200 overflow-hidden',
        'bg-card/95 backdrop-blur-sm border-border/50',
        'hover:shadow-lg hover:border-primary/20',
        isDragging && 'opacity-50 scale-[1.02] shadow-xl z-50',
        isMinimized && 'h-auto'
      )}
    >
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0 gap-2 border-b border-border/30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-accent cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{widget.template?.name}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleToggleState}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleMaximize}>
                <Maximize2 className="h-4 w-4 mr-2" />
                Agrandir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                <X className="h-4 w-4 mr-2" />
                Retirer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-3 pt-2">
          <WidgetContent widget={widget} />
        </CardContent>
      )}
    </Card>
  );
}
