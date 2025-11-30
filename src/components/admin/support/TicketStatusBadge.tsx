/**
 * Badge de statut pour les tickets support
 * Phase 3 - UI : Affichage des nouveaux statuts
 */

import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  MessageSquare,
  CircleDot
} from 'lucide-react';
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  type TicketStatus,
} from '@/services/supportService';

interface TicketStatusBadgeProps {
  status: string;
  size?: 'sm' | 'default';
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  new: CircleDot,
  in_progress: Clock,
  waiting_user: MessageSquare,
  resolved: CheckCircle2,
  closed: XCircle,
};

// Normalise les anciens statuts vers les nouveaux
const normalizeStatus = (status: string): string => {
  if (status === 'waiting') return 'waiting_user';
  return status;
};

export function TicketStatusBadge({ status, size = 'default' }: TicketStatusBadgeProps) {
  const normalized = normalizeStatus(status);
  const Icon = STATUS_ICONS[normalized] || AlertCircle;
  const label = TICKET_STATUS_LABELS[normalized] || normalized;
  const colorClass = TICKET_STATUS_COLORS[normalized] || 'bg-gray-500';

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
