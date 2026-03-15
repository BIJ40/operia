import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeeklyLoadEntry } from '@/statia/shared/chargeTravauxEngine';

interface Props {
  data: WeeklyLoadEntry[];
}

export function ChargeSemaineCard({ data }: Props) {
  const maxHours = Math.max(...data.map(d => d.hours), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Charge hebdomadaire</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée</p>
        ) : (
          <div className="flex items-end gap-3 h-32">
            {data.map((w, i) => {
              const height = maxHours > 0 ? (w.hours / maxHours) * 100 : 0;
              const isFirst = i === 0;
              return (
                <div key={w.weekLabel} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{w.hours}h</span>
                  <div className="w-full relative" style={{ height: '80px' }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${isFirst ? 'bg-primary' : 'bg-primary/60'}`}
                      style={{ height: `${height}%`, minHeight: w.hours > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <span className={`text-xs ${isFirst ? 'font-semibold' : 'text-muted-foreground'}`}>{w.weekLabel}</span>
                  <span className="text-[10px] text-muted-foreground">{w.projects}p</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
