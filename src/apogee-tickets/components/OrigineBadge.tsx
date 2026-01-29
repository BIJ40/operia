/**
 * Badge Origine en lecture seule
 * Affiche l'origine du ticket dans un format ovale/arrondi
 */

import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportedBy } from '../types';

interface OrigineBadgeProps {
  origine: ReportedBy | null | undefined;
  size?: 'sm' | 'default';
}

const ORIGINE_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  JEROME: { label: 'Jérôme', color: 'hsl(217, 91%, 60%)', textColor: 'white' },
  FLORIAN: { label: 'Florian', color: 'hsl(142, 76%, 36%)', textColor: 'white' },
  ERIC: { label: 'Éric', color: 'hsl(25, 95%, 53%)', textColor: 'white' },
  MARIE: { label: 'Marie', color: 'hsl(330, 81%, 60%)', textColor: 'white' },
  MATHILDE: { label: 'Mathilde', color: 'hsl(271, 81%, 56%)', textColor: 'white' },
  APOGEE: { label: 'Apogée', color: 'hsl(258, 90%, 66%)', textColor: 'white' },
  HUGO: { label: 'Hugo', color: 'hsl(239, 84%, 67%)', textColor: 'white' },
  AUTRE: { label: 'Autre', color: 'hsl(220, 9%, 46%)', textColor: 'white' },
};

export function OrigineBadge({ origine, size = 'sm' }: OrigineBadgeProps) {
  if (!origine) {
    return null;
  }

  const config = ORIGINE_CONFIG[origine] || ORIGINE_CONFIG.AUTRE;
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-xs px-2.5 py-1';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full shadow-sm',
        sizeClasses
      )}
      style={{ 
        backgroundColor: config.color, 
        color: config.textColor,
      }}
    >
      <User className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}
