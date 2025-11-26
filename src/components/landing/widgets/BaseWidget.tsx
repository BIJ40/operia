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
    disabled: !isDashboardEditMode,
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
      className={`${sizeClasses[size]} ${className} relative transition-all duration-200 ease-in-out`}
    >
      {isDashboardEditMode && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 bg-background/80 backdrop-blur-sm"
              >
                <Settings className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background z-50">
              <DropdownMenuItem onClick={() => onSizeChange?.('small')}>
                Petit (1 bloc)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSizeChange?.('medium')}>
                Moyen (2 blocs)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSizeChange?.('large')}>
                Grand (3 blocs)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSizeChange?.('xlarge')}>
                Très grand (4 blocs)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            size="icon"
            variant="destructive"
            className="h-7 w-7"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
          
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 bg-background/80 backdrop-blur-sm"
            >
              <GripVertical className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      
      <div className={isDashboardEditMode ? 'group' : ''}>
        {children}
      </div>
    </div>
  );
}
