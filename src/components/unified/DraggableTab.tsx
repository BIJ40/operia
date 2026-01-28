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
  isDisabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DraggableTab({ 
  id, 
  isActive, 
  isDraggable,
  isDisabled = false,
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
    disabled: !isDraggable || isDisabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleClick = () => {
    if (!isDisabled) {
      onClick();
    }
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...(isDraggable && !isDisabled ? { ...attributes, ...listeners } : {})}
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        className,
        isDragging && 'opacity-50 shadow-lg scale-105',
        isDraggable && !isDisabled && 'cursor-grab active:cursor-grabbing',
        !isDraggable && !isDisabled && 'cursor-pointer',
        isDisabled && 'opacity-40 cursor-not-allowed hover:!scale-100 hover:!translate-y-0 hover:!shadow-none hover:!bg-muted/40'
      )}
      data-state={isActive ? 'active' : 'inactive'}
      aria-disabled={isDisabled}
      title={isDisabled ? 'Module non disponible' : undefined}
    >
      {children}
    </button>
  );
}
