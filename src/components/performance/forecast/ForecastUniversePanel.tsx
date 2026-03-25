import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ForecastSnapshot, ForecastRecommendation } from '@/modules/performance/forecast/types';

interface ForecastUniversePanelProps {
  snapshots: ForecastSnapshot[];
  recommendations: ForecastRecommendation[];
}

function mToH(m: number): string { return `${Math.round(m / 60)}h`; }

export function ForecastUniversePanel({ snapshots, recommendations }: ForecastUniversePanelProps) {
  // Aggregate universe minutes from probable workloads
  const universeMinutes = new Map<string, number>();
  let total = 0;

  for (const snap of snapshots) {
    if (!snap.probableWorkload) continue;
    for (const [uni, mins] of Object.entries(snap.probableWorkload.universeBreakdown)) {
      if (!uni || uni === 'unknown') continue;
      universeMinutes.set(uni, (universeMinutes.get(uni) ?? 0) + mins);
      total += mins;
    }
  }

  if (universeMinutes.size === 0) return null;

  const watchUniverses = new Set(
    recommendations.filter(r => r.type === 'watch_universe' && r.universe).map(r => r.universe!)
  );

  const sorted = [...universeMinutes.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Univers (probable)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.map(([uni, mins]) => {
            const pct = total > 0 ? Math.round((mins / total) * 100) : 0;
            const isWatch = watchUniverses.has(uni);
            return (
              <div key={uni} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{uni}</span>
                  {isWatch && (
                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      à surveiller
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="tabular-nums">{mToH(mins)}</span>
                  <span className="tabular-nums text-xs w-8 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
