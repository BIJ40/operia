/**
 * Badge de priorité pour les tickets support
 * Phase 3 - UI : Affichage des nouvelles priorités
 */

import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, 
  Minus, 
  ArrowUp, 
  AlertTriangle, 
  Flame 
} from 'lucide-react';
import {
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  type TicketPriority,
} from '@/services/supportService';

interface TicketPriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'default';
}

const PRIORITY_ICONS: Record<string, React.ElementType> = {
  mineur: ArrowDown,
  normal: Minus,
  important: ArrowUp,
  urgent: AlertTriangle,
  bloquant: Flame,
};

export function TicketPriorityBadge({ priority, size = 'default' }: TicketPriorityBadgeProps) {
  const Icon = PRIORITY_ICONS[priority] || Minus;
  const label = TICKET_PRIORITY_LABELS[priority] || priority;
  const colorClass = TICKET_PRIORITY_COLORS[priority] || 'bg-gray-500';

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-1.5 py-0.5' 
    : 'text-xs px-2 py-1';

  return (
    <Badge 
      className={`${colorClass} text-white ${sizeClasses} flex items-center gap-1`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {label}
    </Badge>
  );
}
