/**
 * ApporteurAlertsPage - Veille et alertes
 */

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bell } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { useProfile } from '@/contexts/ProfileContext';
import { useApporteurAlerts } from '../hooks/useApporteurAlerts';
import { AlertCard } from '../components/AlertCard';

type PeriodKey = '30j' | '90j' | '6m';

function getPeriodDates(period: PeriodKey): { from: string; to: string } {
  const to = format(new Date(), 'yyyy-MM-dd');
  const map: Record<PeriodKey, Date> = {
    '30j': subDays(new Date(), 30),
    '90j': subDays(new Date(), 90),
    '6m': subMonths(new Date(), 6),
  };
  return { from: format(map[period], 'yyyy-MM-dd'), to };
}

interface Props {
  onSelectApporteur?: (id: string) => void;
}

export function ApporteurAlertsPage({ onSelectApporteur }: Props) {
  const { agencyId } = useProfile();
  const [period, setPeriod] = useState<PeriodKey>('90j');

  const { from, to } = getPeriodDates(period);
  const { data: alerts = [], isLoading } = useApporteurAlerts({
    agencyId,
    dateFrom: from,
    dateTo: to,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            Alertes ({alerts.length})
          </h3>
        </div>
        <Select value={period} onValueChange={v => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30j">30 jours</SelectItem>
            <SelectItem value="90j">90 jours</SelectItem>
            <SelectItem value="6m">6 mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Aucune alerte détectée sur cette période 👍
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => (
            <AlertCard
              key={alert.id}
              apporteurName={alert.apporteur_name}
              title={alert.title}
              description={alert.description}
              level={alert.level}
              metric={alert.metric}
              onClick={() => onSelectApporteur?.(alert.apporteur_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
