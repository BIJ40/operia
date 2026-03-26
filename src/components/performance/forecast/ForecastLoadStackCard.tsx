import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ForecastTeamStats, ForecastProbableTeamStats } from '@/modules/performance/forecast/types';

interface ForecastLoadStackCardProps {
  teamStats: ForecastTeamStats;
  probableTeamStats?: ForecastProbableTeamStats;
}

function minutesToH(m: number): string {
  return `${Math.round(m / 60)}h`;
}

export function ForecastLoadStackCard({ teamStats, probableTeamStats }: ForecastLoadStackCardProps) {
  const capacity = teamStats.totalAdjustedMinutes;
  if (capacity <= 0) return null;

  const committed = teamStats.totalCommittedMinutes ?? 0;
  const probableAssigned = (teamStats.totalProbableMinutes ?? 0) - (probableTeamStats?.unassignedTeamMinutes ?? 0);
  const unassigned = probableTeamStats?.unassignedTeamMinutes ?? 0;
  const totalLoad = committed + probableAssigned + unassigned;
  const available = Math.max(0, capacity - totalLoad);

  // For visual scaling, use max(capacity, totalLoad) as 100%
  const reference = Math.max(capacity, totalLoad);
  const pctCommitted = (committed / reference) * 100;
  const pctProbable = (probableAssigned / reference) * 100;
  const pctUnassigned = (unassigned / reference) * 100;
  const pctAvailable = (available / reference) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Composition de la charge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stacked bar */}
        <div className="flex h-6 rounded-md overflow-hidden bg-muted">
          {pctCommitted > 0 && (
            <div className="bg-primary transition-all" style={{ width: `${pctCommitted}%` }} title={`Engagé: ${minutesToH(committed)}`} />
          )}
          {pctProbable > 0 && (
            <div className="bg-amber-400 dark:bg-amber-500 transition-all" style={{ width: `${pctProbable}%` }} title={`Probable: ${minutesToH(probableAssigned)}`} />
          )}
          {pctUnassigned > 0 && (
            <div className="bg-orange-300 dark:bg-orange-400 transition-all" style={{ width: `${pctUnassigned}%` }} title={`Non affecté: ${minutesToH(unassigned)}`} />
          )}
          {pctAvailable > 0 && (
            <div className="bg-muted-foreground/10 transition-all" style={{ width: `${pctAvailable}%` }} title={`Disponible: ${minutesToH(available)}`} />
          )}
        </div>

        {/* Text */}
        <p className="text-xs text-muted-foreground">
          {minutesToH(committed)} engagées
          {probableAssigned > 0 && <>, {minutesToH(probableAssigned)} probables</>}
          {unassigned > 0 && <>, dont {minutesToH(unassigned)} non affectées</>}
          {available > 0 && <> — {minutesToH(available)} disponibles</>}
          {totalLoad > capacity && (
            <span className="text-red-600 dark:text-red-400"> — dépassement de {minutesToH(totalLoad - capacity)}</span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
