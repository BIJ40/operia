/**
 * InternalGuideTab - Onglet individuel draggable pour le Guide Apogée interne
 * Version Warm Pastel
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
        'group flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none',
        'rounded-t-xl border-x border-t transition-all duration-200',
        'min-w-[120px] max-w-[200px]',
        isActive
          ? 'bg-background border-border/50 text-foreground shadow-sm -mb-px'
          : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        isDragging && 'opacity-50 z-50 shadow-warm'
      )}
    >
      <div className={cn(
        'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors',
        isActive 
          ? 'bg-warm-blue/15 text-warm-blue' 
          : 'bg-muted/50 text-muted-foreground group-hover:bg-warm-blue/10 group-hover:text-warm-blue'
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="truncate text-sm font-medium">{tab.label}</span>
      {tab.closable && (
        <button
          onClick={handleClose}
          className={cn(
            'ml-auto p-1 rounded-lg transition-all shrink-0',
            'opacity-0 group-hover:opacity-100',
            'hover:bg-destructive/10 hover:text-destructive',
            isActive && 'opacity-60'
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
