/**
 * Sélecteur de module cliquable
 * Affiche un badge ovale qui ouvre un popover avec tous les modules
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApogeeModule } from '../types';

interface ModuleSelectorProps {
  moduleId: string | null | undefined;
  modules: ApogeeModule[];
  onChange: (moduleId: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

// Couleur Tailwind vers HSL
const getModuleColor = (color: string | null): string => {
  const colorMap: Record<string, string> = {
    red: 'hsl(0, 84%, 60%)',
    orange: 'hsl(25, 95%, 53%)',
    amber: 'hsl(38, 92%, 50%)',
    yellow: 'hsl(48, 96%, 53%)',
    lime: 'hsl(84, 81%, 44%)',
    green: 'hsl(142, 76%, 36%)',
    emerald: 'hsl(160, 84%, 39%)',
    teal: 'hsl(173, 80%, 40%)',
    cyan: 'hsl(189, 94%, 43%)',
    sky: 'hsl(199, 89%, 48%)',
    blue: 'hsl(217, 91%, 60%)',
    indigo: 'hsl(239, 84%, 67%)',
    violet: 'hsl(258, 90%, 66%)',
    purple: 'hsl(271, 81%, 56%)',
    fuchsia: 'hsl(292, 84%, 61%)',
    pink: 'hsl(330, 81%, 60%)',
    rose: 'hsl(350, 89%, 60%)',
    slate: 'hsl(215, 16%, 47%)',
    gray: 'hsl(220, 9%, 46%)',
    zinc: 'hsl(240, 5%, 46%)',
    neutral: 'hsl(0, 0%, 45%)',
    stone: 'hsl(25, 6%, 45%)',
  };
  return colorMap[color || 'blue'] || colorMap.blue;
};

const getTextColor = (color: string | null): string => {
  const lightColors = ['yellow', 'lime', 'amber', 'cyan'];
  return lightColors.includes(color || '') ? 'hsl(0, 0%, 10%)' : 'white';
};

export function ModuleSelector({
  moduleId,
  modules,
  onChange,
  disabled = false,
  size = 'sm',
}: ModuleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [localModuleId, setLocalModuleId] = useState(moduleId);
  
  useEffect(() => {
    setLocalModuleId(moduleId);
  }, [moduleId]);
  
  const currentModule = modules.find(m => m.id === localModuleId);
  const bgColor = currentModule ? getModuleColor(currentModule.color) : undefined;
  const textColor = currentModule ? getTextColor(currentModule.color) : undefined;

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-3 py-1';

  const handleSelect = (value: string) => {
    setLocalModuleId(value);
    setOpen(false);
    onChange(value);
  };

  if (!currentModule) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1 font-medium rounded-full transition-all border border-dashed border-muted-foreground/50',
              sizeClasses,
              disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:border-muted-foreground hover:bg-muted/50'
            )}
          >
            <Layers className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            <span className="text-muted-foreground">Module...</span>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-48 p-2 bg-background z-50" 
          align="start"
          sideOffset={4}
        >
          <div className="grid gap-1 max-h-64 overflow-y-auto">
            {modules.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleSelect(mod.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-sm transition-all hover:opacity-90"
                style={{ 
                  backgroundColor: getModuleColor(mod.color), 
                  color: getTextColor(mod.color),
                }}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="font-medium">{mod.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
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
          <Layers className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span className="font-medium">{currentModule.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-2 bg-background z-50" 
        align="start"
        sideOffset={4}
      >
        <div className="grid gap-1 max-h-64 overflow-y-auto">
          {modules.map((mod) => {
            const isSelected = mod.id === localModuleId;
            
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleSelect(mod.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-sm transition-all',
                  isSelected && 'ring-2 ring-primary ring-offset-1'
                )}
                style={{ 
                  backgroundColor: getModuleColor(mod.color), 
                  color: getTextColor(mod.color),
                }}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="font-medium">{mod.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
