/**
 * ReliabilityBadge — Colored badge showing the reliability level.
 */
import { Badge } from '@/components/ui/badge';
import { RELIABILITY_COLORS, RELIABILITY_LABELS } from '../constants';
import type { ReliabilityLevel } from '@/types/projectProfitability';

interface ReliabilityBadgeProps {
  level: ReliabilityLevel;
  score?: number;
  className?: string;
}

export function ReliabilityBadge({ level, score, className = '' }: ReliabilityBadgeProps) {
  return (
    <Badge variant="outline" className={`${RELIABILITY_COLORS[level]} ${className}`}>
      {RELIABILITY_LABELS[level]}{score != null ? ` (${score}%)` : ''}
    </Badge>
  );
}
