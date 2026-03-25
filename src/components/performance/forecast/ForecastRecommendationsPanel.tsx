import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ForecastRecommendationsResult, ForecastRecommendationPriority } from '@/modules/performance/forecast/types';

interface ForecastRecommendationsPanelProps {
  recommendations: ForecastRecommendationsResult;
}

const MAX_PER_SECTION = 3;

const PRIORITY_STYLE: Record<ForecastRecommendationPriority, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
};

export function ForecastRecommendationsPanel({ recommendations }: ForecastRecommendationsPanelProps) {
  const { teamRecommendations, technicianRecommendations, universeRecommendations } = recommendations;

  const hasAny = teamRecommendations.length > 0 || technicianRecommendations.length > 0 || universeRecommendations.length > 0;
  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Recommandations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamRecommendations.length > 0 && (
          <Section title="Équipe" items={teamRecommendations.slice(0, MAX_PER_SECTION)} />
        )}
        {technicianRecommendations.length > 0 && (
          <Section title="Techniciens" items={technicianRecommendations.slice(0, MAX_PER_SECTION)} />
        )}
        {universeRecommendations.length > 0 && (
          <Section title="Univers" items={universeRecommendations.slice(0, MAX_PER_SECTION)} />
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, items }: { title: string; items: ForecastRecommendationsResult['all'] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</div>
      {items.map(rec => (
        <div key={rec.id} className="bg-muted/50 rounded-md p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLE[rec.priority]}`}>
              {rec.priority}
            </Badge>
            <span className="text-sm font-medium">{rec.title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{rec.message}</p>
          <p className="text-[10px] text-muted-foreground/70 italic">{rec.rationale}</p>
        </div>
      ))}
    </div>
  );
}
