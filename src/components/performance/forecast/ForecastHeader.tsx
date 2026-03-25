import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import type { ForecastTeamTensionStats, ForecastTeamStats, PredictedTensionLevel, ForecastConfidenceLevel } from '@/modules/performance/forecast/types';

interface ForecastHeaderProps {
  horizonLabel: string;
  teamTension: ForecastTeamTensionStats;
  teamStats: ForecastTeamStats;
}

const TENSION_STYLES: Record<PredictedTensionLevel, { label: string; className: string }> = {
  comfort: { label: 'Confortable', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  watch: { label: 'À surveiller', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  tension: { label: 'Tendu', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  critical: { label: 'Critique', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const CONFIDENCE_STYLES: Record<ForecastConfidenceLevel, { label: string; className: string }> = {
  high: { label: 'Confiance haute', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  medium: { label: 'Confiance moyenne', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Confiance faible', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export function ForecastHeader({ horizonLabel, teamTension, teamStats }: ForecastHeaderProps) {
  const tensionStyle = TENSION_STYLES[teamTension.predictedTensionLevel];
  const confidenceStyle = CONFIDENCE_STYLES[teamStats.averageConfidenceLevel];

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Prévision de charge
        </h2>
        <p className="text-sm text-muted-foreground">
          Capacité, engagement, probabilité et tension à venir — {horizonLabel}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={tensionStyle.className}>
          {tensionStyle.label}
        </Badge>
        <Badge variant="outline" className={confidenceStyle.className}>
          {confidenceStyle.label}
        </Badge>
      </div>
    </div>
  );
}
