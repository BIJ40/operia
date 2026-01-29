/**
 * Sélecteur de priorité thermique cliquable
 * Affiche un badge ovale qui ouvre un popover avec tous les niveaux
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Flame, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatPrioritySelectorProps {
  priority: number | null | undefined;
  onChange: (priority: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

// Gradient de couleurs du bleu glacé (0) au rouge foncé (12)
const getHeatColor = (priority: number): string => {
  const p = Math.max(0, Math.min(12, priority));
  
  if (p <= 6) {
    const hue = 200 - (p * 26.67);
    const sat = 80 + (p * 1.67);
    const light = 70 - (p * 3.33);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  } else {
    const t = p - 6;
    const hue = 40 - (t * 6.67);
    const sat = 90;
    const light = 50 - (t * 3.33);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
};

const getTextColor = (priority: number): string => {
  return priority > 4 ? 'white' : 'hsl(0, 0%, 10%)';
};

const getLabel = (priority: number): string => {
  if (priority === 0) return 'Gelé';
  if (priority <= 2) return 'Froid';
  if (priority <= 4) return 'Frais';
  if (priority <= 6) return 'Tiède';
  if (priority <= 8) return 'Chaud';
  if (priority <= 10) return 'Brûlant';
  return 'Critique';
};

const PRIORITY_OPTIONS = Array.from({ length: 13 }, (_, i) => ({
  value: i,
  label: getLabel(i),
  color: getHeatColor(i),
  textColor: getTextColor(i),
}));

export function HeatPrioritySelector({
  priority,
  onChange,
  disabled = false,
  size = 'sm',
}: HeatPrioritySelectorProps) {
  const [open, setOpen] = useState(false);
  // État local pour mise à jour optimiste (UI immédiate)
  const [localPriority, setLocalPriority] = useState(priority);
  
  // Sync avec la prop quand elle change (après sauvegarde confirmée)
  useEffect(() => {
    setLocalPriority(priority);
  }, [priority]);
  
  const p = localPriority !== null && localPriority !== undefined 
    ? Math.max(0, Math.min(12, localPriority)) 
    : null;
  
  const bgColor = p !== null ? getHeatColor(p) : undefined;
  const textColor = p !== null ? getTextColor(p) : undefined;
  const label = p !== null ? getLabel(p) : null;
  const Icon = p !== null && p <= 3 ? Snowflake : Flame;

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-3 py-1';

  const handleSelect = (value: number) => {
    // Mise à jour optimiste : UI immédiate
    setLocalPriority(value);
    setOpen(false);
    // Sauvegarde en arrière-plan
    onChange(value);
  };

  if (p === null) {
    return (
      <Badge variant="outline" className="text-muted-foreground cursor-default">
        —
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1 font-medium rounded-full transition-all shadow-sm',
            sizeClasses,
            disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:opacity-90 hover:shadow-md'
          )}
          style={{ 
            backgroundColor: bgColor, 
            color: textColor,
          }}
        >
          <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span className="font-bold">{p}</span>
          <span className="opacity-80">• {label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-2 bg-background z-50" 
        align="start"
        sideOffset={4}
      >
        <div className="grid gap-1">
          {PRIORITY_OPTIONS.map((opt) => {
            const OptionIcon = opt.value <= 3 ? Snowflake : Flame;
            const isSelected = opt.value === p;
            
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-sm transition-all',
                  isSelected && 'ring-2 ring-primary ring-offset-1'
                )}
                style={{ 
                  backgroundColor: opt.color, 
                  color: opt.textColor,
                }}
              >
                <OptionIcon className="w-3.5 h-3.5" />
                <span className="font-bold">{opt.value}</span>
                <span className="opacity-80 text-xs">• {opt.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
