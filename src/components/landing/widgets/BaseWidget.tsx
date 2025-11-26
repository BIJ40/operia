import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';

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
  const [showControls, setShowControls] = React.useState(false);
  
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
    large: 'col-span-4',   // 4 blocs
    xlarge: 'col-span-8',  // 8 blocs (pleine largeur)
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${sizeClasses[size]} ${className} relative group`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {isDashboardEditMode && showControls && (
        <div className="absolute -top-2 -right-2 z-50 flex items-center gap-1">
          {isRemovable && onRemove && (
            <button
              onClick={onRemove}
              className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      
      <div 
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing ${isDragging ? 'animate-pulse' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
