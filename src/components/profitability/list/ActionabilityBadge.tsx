/**
 * ActionabilityBadge — Badge showing the actionability level.
 */
import { Badge } from '@/components/ui/badge';
import { ACTIONABILITY_COLORS, ACTIONABILITY_LABELS, ACTIONABILITY_ICONS } from '../constants';
import type { ActionabilityLevel } from '@/types/projectProfitability';

interface ActionabilityBadgeProps {
  level: ActionabilityLevel;
  className?: string;
}

export function ActionabilityBadge({ level, className = '' }: ActionabilityBadgeProps) {
  return (
    <Badge variant="outline" className={`${ACTIONABILITY_COLORS[level]} ${className}`}>
      {ACTIONABILITY_ICONS[level]} {ACTIONABILITY_LABELS[level]}
    </Badge>
  );
}
