import { Card, CardContent } from '@/components/ui/card';
import { Clock, Briefcase, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import type { ForecastTeamStats, ForecastTeamTensionStats } from '@/modules/performance/forecast/types';

interface ForecastTeamSummaryCardsProps {
  teamStats: ForecastTeamStats;
  teamTension: ForecastTeamTensionStats;
}

function minutesToDisplay(mins: number): string {
  const h = Math.round(mins / 60);
  return `${h}h`;
}

export function ForecastTeamSummaryCards({ teamStats, teamTension }: ForecastTeamSummaryCardsProps) {
  const availableAfterProbable = teamStats.totalAvailableAfterProbableMinutes
    ?? teamStats.totalAvailableAfterCommittedMinutes
    ?? teamStats.totalAdjustedMinutes;

  const isDeficit = availableAfterProbable < 0;
  const tensionCount = teamTension.techniciansInTension + teamTension.techniciansInCritical;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Capacité ajustée */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            Capacité ajustée
          </div>
          <div className="text-xl font-bold">{minutesToDisplay(teamStats.totalAdjustedMinutes)}</div>
          <div className="text-[10px] text-muted-foreground">
            théorique : {minutesToDisplay(teamStats.totalTheoreticalMinutes)}
          </div>
        </CardContent>
      </Card>

      {/* Charge engagée */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Briefcase className="w-3.5 h-3.5" />
            Engagé
          </div>
          <div className="text-xl font-bold">
            {teamStats.totalCommittedMinutes != null ? minutesToDisplay(teamStats.totalCommittedMinutes) : '—'}
          </div>
          {teamStats.averageCommittedLoadRatio != null && (
            <div className="text-[10px] text-muted-foreground">
              {Math.round(teamStats.averageCommittedLoadRatio * 100)}% capacité
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charge probable */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Probable
          </div>
          <div className="text-xl font-bold">
            {teamStats.totalProbableMinutes != null ? minutesToDisplay(teamStats.totalProbableMinutes) : '—'}
          </div>
          {teamStats.averageGlobalLoadRatio != null && (
            <div className="text-[10px] text-muted-foreground">
              ratio global : {Math.round(teamStats.averageGlobalLoadRatio * 100)}%
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disponible */}
      <Card className={isDeficit ? 'border-red-500/50' : undefined}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Activity className="w-3.5 h-3.5" />
            {isDeficit ? 'Déficit' : 'Disponible'}
          </div>
          <div className={`text-xl font-bold ${isDeficit ? 'text-red-600 dark:text-red-400' : ''}`}>
            {minutesToDisplay(Math.abs(availableAfterProbable))}
          </div>
          {isDeficit && (
            <div className="text-[10px] text-red-600 dark:text-red-400">déficit prévisionnel</div>
          )}
        </CardContent>
      </Card>

      {/* Tension */}
      <Card className={tensionCount > 0 ? 'border-orange-500/50' : undefined}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Tension
          </div>
          <div className="text-xl font-bold">
            {tensionCount > 0 ? tensionCount : '0'}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {teamTension.techniciansInCritical > 0 && (
              <span className="text-red-600 dark:text-red-400">{teamTension.techniciansInCritical} critique{teamTension.techniciansInCritical > 1 ? 's' : ''}</span>
            )}
            {teamTension.techniciansInCritical > 0 && teamTension.techniciansInTension > 0 && ' · '}
            {teamTension.techniciansInTension > 0 && (
              <span className="text-orange-600 dark:text-orange-400">{teamTension.techniciansInTension} tendu{teamTension.techniciansInTension > 1 ? 's' : ''}</span>
            )}
            {tensionCount === 0 && 'tous en confort'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
