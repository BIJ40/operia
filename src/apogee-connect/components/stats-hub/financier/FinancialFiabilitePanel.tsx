/**
 * FinancialFiabilitePanel — Data reliability score indicator
 */

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import type { FiabiliteScore } from '@/apogee-connect/types/financial';

interface FinancialFiabilitePanelProps {
  fiabilite: FiabiliteScore;
}

const LEVEL_CONFIG = {
  forte: {
    icon: ShieldCheck,
    label: 'Fiabilité forte',
    color: 'text-emerald-600 dark:text-emerald-400',
    progressColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
  },
  moyenne: {
    icon: Shield,
    label: 'Fiabilité moyenne',
    color: 'text-amber-600 dark:text-amber-400',
    progressColor: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
  },
  fragile: {
    icon: ShieldAlert,
    label: 'Fiabilité fragile',
    color: 'text-destructive',
    progressColor: 'bg-destructive',
    bgColor: 'bg-destructive/5 border-destructive/20',
  },
};

const SEVERITY_DOT = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  error: 'bg-destructive',
};

export function FinancialFiabilitePanel({ fiabilite }: FinancialFiabilitePanelProps) {
  const config = LEVEL_CONFIG[fiabilite.level];
  const Icon = config.icon;

  return (
    <Card className={cn('p-4 border', config.bgColor)}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className={cn('h-5 w-5', config.color)} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className={cn('text-sm font-semibold', config.color)}>{config.label}</p>
            <span className={cn('text-sm font-bold tabular-nums', config.color)}>{fiabilite.score}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', config.progressColor)}
              style={{ width: `${fiabilite.score}%` }}
            />
          </div>
        </div>
      </div>

      {fiabilite.details.length > 0 && (
        <div className="space-y-1">
          {fiabilite.details.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', SEVERITY_DOT[d.severity])} />
              <span className="text-muted-foreground flex-1">{d.label}</span>
              <span className="font-semibold tabular-nums">{d.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
