/**
 * Badge Module en lecture seule
 * Affiche le module du ticket dans un format ovale/arrondi coloré
 */

import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApogeeModule } from '../types';

interface ModuleBadgeProps {
  moduleId: string | null | undefined;
  modules: ApogeeModule[];
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

export function ModuleBadge({ moduleId, modules, size = 'sm' }: ModuleBadgeProps) {
  const module = modules.find(m => m.id === moduleId);
  
  if (!module) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }

  const bgColor = getModuleColor(module.color);
  const textColor = getTextColor(module.color);

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-3 py-1';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full shadow-sm whitespace-nowrap',
        sizeClasses
      )}
      style={{ 
        backgroundColor: bgColor, 
        color: textColor,
      }}
    >
      <Layers className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{module.label}</span>
    </span>
  );
}
