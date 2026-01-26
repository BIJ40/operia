import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrowserTabData } from './types';

interface BrowserTabProps {
  tab: BrowserTabData;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

export function BrowserTab({ tab, isActive, onActivate, onClose }: BrowserTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = tab.icon;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onActivate}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer select-none',
        'border border-b-0 transition-colors min-w-[120px] max-w-[200px]',
        isActive
          ? 'bg-background border-border text-foreground shadow-sm'
          : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate text-sm font-medium">{tab.label}</span>
      {tab.closable && (
        <button
          onClick={handleClose}
          className={cn(
            'ml-auto p-0.5 rounded-sm transition-opacity shrink-0',
            'opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive',
            isActive && 'opacity-60'
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
