/**
 * Sélecteur de statut cliquable
 * Affiche un badge ovale qui ouvre un popover avec tous les statuts disponibles
 */

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApogeeTicketStatus } from '../types';

interface StatusSelectorProps {
  status: string;
  availableStatuses: ApogeeTicketStatus[];
  onChange: (statusId: string) => void;
  disabled?: boolean;
}

export function StatusSelector({
  status,
  availableStatuses,
  onChange,
  disabled = false,
}: StatusSelectorProps) {
  const [open, setOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);
  
  useEffect(() => {
    setLocalStatus(status);
  }, [status]);
  
  // Statuts réservés à l'IA (pas de transition manuelle vers ces statuts)
  const AI_ONLY_STATUSES = ['SUPPORT_RESOLU', 'IA_ESCALADE'];
  
  const currentStatus = availableStatuses.find(s => s.id === localStatus);
  const statusColor = currentStatus?.color || '#6b7280';
  const statusLabel = currentStatus?.label || localStatus;
  
  // Filtrer les statuts réservés IA du sélecteur (sauf si c'est le statut actuel)
  const selectableStatuses = availableStatuses.filter(
    s => !AI_ONLY_STATUSES.includes(s.id) || s.id === localStatus
  );

  // Calculate if we need dark text for light backgrounds
  const needsDarkText = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
  };

  const textColorClass = needsDarkText(statusColor) ? 'text-gray-900' : 'text-white';

  const handleSelect = (value: string) => {
    setLocalStatus(value);
    setOpen(false);
    onChange(value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1.5 font-medium rounded-full transition-all shadow-md',
            'text-sm px-3 py-1',
            textColorClass,
            disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:opacity-90 hover:shadow-lg'
          )}
          style={{ 
            backgroundColor: statusColor,
          }}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span className="font-semibold">{statusLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-2 bg-background z-50" 
        align="start"
        sideOffset={4}
      >
        <div className="grid gap-1 max-h-64 overflow-y-auto">
          {selectableStatuses.map((s) => {
            const isSelected = s.id === localStatus;
            const color = s.color || '#6b7280';
            
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-sm transition-all',
                  isSelected && 'ring-2 ring-primary ring-offset-1'
                )}
                style={{ 
                  backgroundColor: `${color}20`,
                  color: color,
                  border: `1px solid ${color}40`,
                }}
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
