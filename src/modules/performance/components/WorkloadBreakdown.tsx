/**
 * WorkloadBreakdown — Decomposition productif/non-productif/SAV
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface Props {
  workload: {
    productive: number;
    nonProductive: number;
    sav: number;
    other: number;
    total: number;
  };
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}h${min > 0 ? min.toString().padStart(2, '0') : ''}` : `${min}min`;
}

export function WorkloadBreakdown({ workload }: Props) {
  const total = Math.max(workload.total, 1);
  const segments = [
    { label: 'Productif', value: workload.productive, color: 'bg-primary' },
    { label: 'Non-productif', value: workload.nonProductive, color: 'bg-accent' },
    { label: 'SAV', value: workload.sav, color: 'bg-orange-500' },
    { label: 'Autre', value: workload.other, color: 'bg-muted-foreground/30' },
  ].filter(s => s.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Répartition temps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Bar */}
        <div className="flex h-3 rounded-full overflow-hidden bg-muted">
          {segments.map((s) => (
            <div
              key={s.label}
              className={`${s.color} transition-all`}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-xs">
              <div className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-medium ml-auto">{formatMinutes(s.value)}</span>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground pt-1 border-t">
          Total: {formatMinutes(workload.total)}
        </div>
      </CardContent>
    </Card>
  );
}
