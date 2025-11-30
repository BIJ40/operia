/**
 * Badge SLA pour afficher le statut d'échéance d'un ticket
 * 🟩 OK - Dans les délais
 * 🟨 Warning - Approche de l'échéance (< 1h)
 * 🟥 Late - En retard
 */

import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInHours, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

export type SLAStatus = 'ok' | 'warning' | 'late';

interface SLABadgeProps {
  dueAt: string | null;
  status?: string;
  slaStatus?: SLAStatus;
  showTimeRemaining?: boolean;
  size?: 'sm' | 'md';
}

const SLA_CONFIG = {
  ok: {
    label: 'Dans les délais',
    icon: Clock,
    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  },
  warning: {
    label: 'Échéance proche',
    icon: AlertTriangle,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  },
  late: {
    label: 'En retard',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  },
};

/**
 * Calcule le statut SLA côté client
 */
export function calculateSLAStatus(dueAt: string | null, ticketStatus?: string): SLAStatus {
  // Si ticket résolu/fermé, pas de SLA
  if (ticketStatus && ['resolved', 'closed'].includes(ticketStatus)) {
    return 'ok';
  }

  if (!dueAt) return 'ok';

  const dueDate = new Date(dueAt);
  const now = new Date();

  if (isPast(dueDate)) {
    return 'late';
  }

  // Warning si moins d'1h restante
  const minutesRemaining = differenceInMinutes(dueDate, now);
  if (minutesRemaining <= 60) {
    return 'warning';
  }

  return 'ok';
}

/**
 * Formate le temps restant ou le retard
 */
function formatTimeRemaining(dueAt: string): string {
  const dueDate = new Date(dueAt);
  const now = new Date();

  if (isPast(dueDate)) {
    return `En retard de ${formatDistanceToNow(dueDate, { locale: fr })}`;
  }

  const hours = differenceInHours(dueDate, now);
  const minutes = differenceInMinutes(dueDate, now) % 60;

  if (hours > 24) {
    return formatDistanceToNow(dueDate, { locale: fr, addSuffix: false }) + ' restants';
  }

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''} restants`;
  }

  return `${minutes}m restants`;
}

export function SLABadge({
  dueAt,
  status,
  slaStatus: providedStatus,
  showTimeRemaining = true,
  size = 'sm',
}: SLABadgeProps) {
  // Si ticket résolu/fermé, ne pas afficher
  if (status && ['resolved', 'closed'].includes(status)) {
    return null;
  }

  if (!dueAt) return null;

  const slaStatus = providedStatus || calculateSLAStatus(dueAt, status);
  const config = SLA_CONFIG[slaStatus];
  const Icon = config.icon;

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${sizeClasses} flex items-center gap-1 font-medium`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {showTimeRemaining ? formatTimeRemaining(dueAt) : config.label}
    </Badge>
  );
}

/**
 * Badge compact pour le Kanban (juste l'icône + indicateur)
 */
export function SLAIndicator({ dueAt, status }: { dueAt: string | null; status?: string }) {
  if (!dueAt || (status && ['resolved', 'closed'].includes(status))) {
    return null;
  }

  const slaStatus = calculateSLAStatus(dueAt, status);
  
  const colorClasses = {
    ok: 'text-green-500',
    warning: 'text-yellow-500',
    late: 'text-red-500 animate-pulse',
  };

  return (
    <Clock className={`w-4 h-4 ${colorClasses[slaStatus]}`} />
  );
}
