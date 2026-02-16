/**
 * Composant onglet individuel Apporteur
 * Réutilise le style RH browser-tab
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApporteurTabData } from './types';

interface ApporteurTabProps {
  tab: ApporteurTabData;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  colorIndex?: number;
}

const TAB_COLORS = [
  '--warm-blue',
  '--warm-purple',
  '--warm-green',
  '--warm-orange',
  '--warm-pink',
  '--warm-teal',
];

export function ApporteurTab({ tab, isActive, onActivate, onClose, colorIndex = 0 }: ApporteurTabProps) {
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
    '--tab-color': `var(${TAB_COLORS[colorIndex % TAB_COLORS.length]})`,
  } as React.CSSProperties;

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
        'rh-browser-tab group',
        isActive && 'rh-browser-tab-active',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate text-sm font-medium">{tab.label}</span>
      {tab.closable && (
        <button
          onClick={handleClose}
          className={cn(
            'ml-auto p-0.5 rounded-full transition-all shrink-0',
            'opacity-0 group-hover:opacity-100',
            'hover:bg-white/20 hover:text-white',
            isActive ? 'hover:bg-destructive/20 hover:text-destructive' : 'hover:text-destructive'
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
