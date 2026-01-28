/**
 * InternalGuideTab - Onglet individuel draggable pour le Guide Apogée interne
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InternalGuideTab as InternalGuideTabType } from './InternalGuideTabsContext';

interface InternalGuideTabProps {
  tab: InternalGuideTabType;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

export function InternalGuideTab({ tab, isActive, onActivate, onClose }: InternalGuideTabProps) {
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
    opacity: isDragging ? 0.5 : 1,
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
        'flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer select-none min-w-0',
        'border border-b-0 transition-colors',
        isActive 
          ? 'bg-background border-border -mb-px z-10' 
          : 'bg-muted/50 border-transparent hover:bg-muted',
        isDragging && 'ring-2 ring-primary/20'
      )}
    >
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="truncate text-sm max-w-[120px]">{tab.label}</span>
      
      {tab.closable && (
        <button
          onClick={handleClose}
          className="ml-1 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
