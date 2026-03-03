import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Clock, FileX, CalendarX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { AlerteEntry } from '../../types/apporteur-stats-v2';

const ALERTE_CONFIG: Record<string, { icon: typeof AlertTriangle; label: string }> = {
  factures_retard_30j: { icon: Clock, label: 'Factures en retard +30j' },
  devis_non_valide_15j: { icon: FileX, label: 'Devis non validés +15j' },
  dossier_sans_rdv: { icon: CalendarX, label: 'Dossiers sans RDV' },
  dossier_sans_action_7j: { icon: Clock, label: 'Dossiers inactifs +7j' },
  rdv_annule: { icon: CalendarX, label: 'RDV annulés' },
  devis_refuse: { icon: FileX, label: 'Devis refusés' },
};

const SEVERITY_STYLES: Record<string, string> = {
  high: 'border-rose-300 bg-rose-50 dark:bg-rose-950/20',
  medium: 'border-amber-300 bg-amber-50 dark:bg-amber-950/20',
  low: 'border-slate-200 bg-slate-50 dark:bg-slate-900/20',
};

interface AlertesBannerProps {
  alertes: AlerteEntry[];
}

export function AlertesBanner({ alertes }: AlertesBannerProps) {
  const important = alertes.filter(a => a.severity === 'high' || a.severity === 'medium');
  if (important.length === 0) return null;

  return (
    <div className="space-y-2">
      {important.map((alerte) => {
        const conf = ALERTE_CONFIG[alerte.type] || { icon: AlertTriangle, label: alerte.type };
        const Icon = conf.icon;
        const style = SEVERITY_STYLES[alerte.severity] || SEVERITY_STYLES.low;

        return (
          <Card key={alerte.type} className={cn('rounded-xl border', style)}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  'w-4 h-4 shrink-0',
                  alerte.severity === 'high' ? 'text-rose-600' : 'text-amber-600'
                )} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {conf.label}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    — {alerte.count} dossier(s)
                    {alerte.amount ? ` · ${formatCurrency(alerte.amount)}` : ''}
                  </span>
                </div>
                {alerte.sample_refs.length > 0 && (
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {alerte.sample_refs.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
