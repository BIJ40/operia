/**
 * Badge de priorité thermique (0-12)
 * 0 = bleu glacé, 12 = rouge foncé
 */

import { Badge } from '@/components/ui/badge';
import { Flame, Snowflake } from 'lucide-react';

interface HeatPriorityBadgeProps {
  priority: number | null | undefined;
  size?: 'sm' | 'default';
  showLabel?: boolean;
}

// Gradient de couleurs du bleu glacé (0) au rouge foncé (12)
const getHeatColor = (priority: number): string => {
  // Clamp entre 0 et 12
  const p = Math.max(0, Math.min(12, priority));
  
  // Dégradé HSL: 
  // 0 = bleu glacé (200, 80%, 70%)
  // 6 = jaune/orange (40, 90%, 50%)
  // 12 = rouge très foncé (0, 90%, 30%)
  
  if (p <= 6) {
    // Bleu glacé vers jaune/orange
    const hue = 200 - (p * 26.67); // 200 -> 40
    const sat = 80 + (p * 1.67);   // 80 -> 90
    const light = 70 - (p * 3.33); // 70 -> 50
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  } else {
    // Jaune/orange vers rouge foncé
    const t = p - 6;
    const hue = 40 - (t * 6.67);   // 40 -> 0
    const sat = 90;                 // constant
    const light = 50 - (t * 3.33); // 50 -> 30
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
};

const getTextColor = (priority: number): string => {
  // Texte blanc pour les couleurs foncées (> 4)
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

export function HeatPriorityBadge({ 
  priority, 
  size = 'default',
  showLabel = true 
}: HeatPriorityBadgeProps) {
  if (priority === null || priority === undefined) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        —
      </Badge>
    );
  }

  const p = Math.max(0, Math.min(12, priority));
  const bgColor = getHeatColor(p);
  const textColor = getTextColor(p);
  const label = getLabel(p);

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-1.5 py-0.5' 
    : 'text-xs px-2 py-1';

  const Icon = p <= 3 ? Snowflake : Flame;

  return (
    <Badge 
      className={`${sizeClasses} flex items-center gap-1 font-medium`}
      style={{ 
        backgroundColor: bgColor, 
        color: textColor,
        border: 'none'
      }}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="font-bold">{p}</span>
      {showLabel && <span className="opacity-80">• {label}</span>}
    </Badge>
  );
}

// Export pour usage dans les selects
export const HEAT_PRIORITY_OPTIONS = Array.from({ length: 13 }, (_, i) => ({
  value: i,
  label: `${i} - ${getLabel(i)}`,
  color: getHeatColor(i),
}));
