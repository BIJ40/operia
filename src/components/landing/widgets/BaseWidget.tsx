import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BaseWidgetProps {
  id: string;
  title?: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  children: React.ReactNode;
  isDashboardEditMode?: boolean;
  /**
   * When false, the widget cannot be removed from the dashboard
   * (used for mandatory widgets defined by admin).
   */
  isRemovable?: boolean;
  onSizeChange?: (size: 'small' | 'medium' | 'large' | 'xlarge') => void;
  onRemove?: () => void;
  className?: string;
}

export function BaseWidget({
  id,
  title,
  size,
  children,
  isDashboardEditMode = false,
  isRemovable = true,
  onSizeChange,
  onRemove,
  className = '',
}: BaseWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    // Drag & drop always enabled so users can reorganize their dashboard
    disabled: false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sizeClasses = {
    small: 'col-span-1',   // 1 bloc
    medium: 'col-span-2',  // 2 blocs
    large: 'col-span-3',   // 3 blocs
    xlarge: 'col-span-4',  // 4 blocs
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${sizeClasses[size]} ${className} relative group transition-all duration-200 ease-in-out`}
    >
      {isDashboardEditMode && (
        <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-end gap-1.5 px-2 pt-1.5 pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-full bg-background/95 backdrop-blur-sm shadow-md border border-border pointer-events-auto">
            {onSizeChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background z-[100]">
                  <DropdownMenuItem onClick={() => onSizeChange('small')}>
                    Petit (1 bloc)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSizeChange('medium')}>
                    Moyen (2 blocs)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSizeChange('large')}>
                    Grand (3 blocs)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSizeChange('xlarge')}>
                    Très grand (4 blocs)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isRemovable && onRemove && (
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={onRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
            >
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                aria-label="Déplacer le widget"
              >
                <GripVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className={isDashboardEditMode ? 'pt-6' : ''}>
        {children}
      </div>
    </div>
  );
}
