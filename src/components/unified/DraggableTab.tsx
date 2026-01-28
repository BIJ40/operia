/**
 * DraggableTab - Onglet principal réorganisable via drag-and-drop
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface DraggableTabProps {
  id: string;
  isActive: boolean;
  isDraggable: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DraggableTab({ 
  id, 
  isActive, 
  isDraggable,
  onClick, 
  children,
  className 
}: DraggableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled: !isDraggable 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      onClick={onClick}
      className={cn(
        className,
        isDragging && 'opacity-50 shadow-lg scale-105',
        isDraggable && 'cursor-grab active:cursor-grabbing',
        !isDraggable && 'cursor-pointer'
      )}
      data-state={isActive ? 'active' : 'inactive'}
    >
      {children}
    </button>
  );
}
