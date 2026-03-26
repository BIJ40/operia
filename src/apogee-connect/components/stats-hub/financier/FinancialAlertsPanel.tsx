/**
 * FinancialAlertsPanel — Action-oriented alerts for financial risks
 */

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Users, ShieldAlert, Info } from 'lucide-react';
import type { FinancialAlert } from '@/apogee-connect/types/financial';
import { motion } from 'framer-motion';

const ICONS: Record<string, React.ReactNode> = {
  AlertTriangle: <AlertTriangle className="h-4 w-4" />,
  Clock: <Clock className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  ShieldAlert: <ShieldAlert className="h-4 w-4" />,
  Info: <Info className="h-4 w-4" />,
};

const SEVERITY_STYLES = {
  critical: 'border-destructive/30 bg-destructive/5',
  warning: 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10',
  info: 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10',
};

const ICON_STYLES = {
  critical: 'text-destructive',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

interface FinancialAlertsPanelProps {
  alerts: FinancialAlert[];
  isLoading: boolean;
}

export function FinancialAlertsPanel({ alerts, isLoading }: FinancialAlertsPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ShieldAlert className="h-8 w-8" />
          <p className="text-sm font-medium">Aucune alerte active</p>
          <p className="text-xs">Situation de recouvrement saine</p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      {alerts.map(alert => (
        <Card
          key={alert.id}
          className={cn('p-3.5 border transition-colors', SEVERITY_STYLES[alert.severity])}
        >
          <div className="flex items-start gap-3">
            <div className={cn('mt-0.5 shrink-0', ICON_STYLES[alert.severity])}>
              {ICONS[alert.icon] || ICONS.Info}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
              {alert.value !== undefined && (
                <p className="text-xs font-bold mt-1 tabular-nums">{formatEuros(alert.value)}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </motion.div>
  );
}
