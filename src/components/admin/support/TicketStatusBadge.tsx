/**
 * Badge de statut pour les tickets support
 * Phase 3 - UI : Affichage des nouveaux statuts
 * P2: Dark mode support
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

// P2: Couleurs avec support dark mode
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500 dark:bg-blue-600 text-white',
  in_progress: 'bg-orange-500 dark:bg-orange-600 text-white',
  waiting_user: 'bg-yellow-500 dark:bg-yellow-600 text-white dark:text-yellow-100',
  resolved: 'bg-green-500 dark:bg-green-600 text-white',
  closed: 'bg-gray-500 dark:bg-gray-600 text-white',
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
  const colorClass = STATUS_COLORS[normalized] || 'bg-gray-500 dark:bg-gray-600 text-white';

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-1.5 py-0.5' 
    : 'text-xs px-2 py-1';

  return (
    <Badge 
      className={`${colorClass} ${sizeClasses} flex items-center gap-1`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {label}
    </Badge>
  );
}
