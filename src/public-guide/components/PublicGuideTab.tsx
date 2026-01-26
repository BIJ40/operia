/**
 * PublicGuideTab - Onglet individuel draggable pour le Guide Apogée public
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicGuideTab as PublicGuideTabType } from '../contexts/PublicGuideTabsContext';

interface PublicGuideTabProps {
  tab: PublicGuideTabType;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  isIconOnly?: boolean;
  compact?: boolean;
}

export function PublicGuideTab({ tab, isActive, onActivate, onClose, isIconOnly, compact }: PublicGuideTabProps) {
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

  // Icon-only tab (for Home)
  if (isIconOnly) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onActivate}
        className={cn(
          'flex items-center justify-center p-2 rounded-t-lg cursor-pointer select-none shrink-0',
          'border border-b-0 transition-colors',
          isActive
            ? 'bg-background border-border text-foreground shadow-sm'
            : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
          isDragging && 'opacity-50 z-50'
        )}
        title={tab.label}
      >
        <Icon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onActivate}
      className={cn(
        'group flex items-center gap-1.5 rounded-t-lg cursor-pointer select-none',
        'border border-b-0 transition-colors',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
        isActive
          ? 'bg-background border-border text-foreground shadow-sm'
          : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <Icon className={cn('shrink-0', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      <span className={cn('truncate font-medium', compact ? 'text-xs' : 'text-sm')}>{tab.label}</span>
      {tab.closable && (
        <button
          onClick={handleClose}
          className={cn(
            'ml-auto p-0.5 rounded-sm transition-opacity shrink-0',
            'opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive',
            isActive && 'opacity-60'
          )}
        >
          <X className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        </button>
      )}
    </div>
  );
}
