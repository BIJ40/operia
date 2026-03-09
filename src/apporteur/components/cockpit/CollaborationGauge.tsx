import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CollaborationScore } from '../../types/apporteur-stats-v2';

const SCORE_LABELS: Record<string, string> = {
  volume_score: 'Volume',
  regularite_score: 'Régularité',
  transfo_score: 'Transformation',
  delay_score: 'Réactivité',
};

interface CollaborationGaugeProps {
  data: CollaborationScore;
}

export function CollaborationGauge({ data }: CollaborationGaugeProps) {
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (data.score / 100) * circumference;

  // Color based on score value, no tier labeling
  const strokeColor = data.score >= 75 ? 'stroke-[hsl(var(--ap-success))]' :
    data.score >= 50 ? 'stroke-[hsl(var(--ap-warning))]' : 'stroke-[hsl(var(--ap-danger))]';

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-3 pb-3 px-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Indice de collaboration
        </p>

        <div className="flex items-center gap-4">
          {/* Gauge */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
              <circle
                cx="50" cy="50" r="42"
                fill="none" strokeWidth="6" strokeLinecap="round"
                className={strokeColor}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">{Math.round(data.score)}</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-2">
            {Object.entries(data.details).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-24 truncate">
                  {SCORE_LABELS[key] || key}
                </span>
                <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      val >= 75 ? 'bg-[hsl(var(--ap-success))]' : val >= 50 ? 'bg-[hsl(var(--ap-warning))]' : 'bg-[hsl(var(--ap-danger))]'
                    )}
                    style={{ width: `${Math.min(100, val)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground w-8 text-right">{Math.round(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
