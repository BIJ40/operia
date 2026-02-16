/**
 * InsightsPanel - Bloc opportunités / recommandations
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info, Lightbulb, AlertCircle } from 'lucide-react';
import type { Insight, InsightLevel } from '../engine/insights';

interface Props {
  insights: Insight[];
}

const LEVEL_CONFIG: Record<InsightLevel, { icon: React.ElementType; bg: string; border: string; text: string }> = {
  danger: { icon: AlertCircle, bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600' },
  opportunity: { icon: Lightbulb, bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600' },
  info: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600' },
};

export function InsightsPanel({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Opportunités & Recommandations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Aucune recommandation pour le moment 👍</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Opportunités & Recommandations ({insights.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map(insight => {
          const config = LEVEL_CONFIG[insight.level];
          const Icon = config.icon;
          return (
            <div key={insight.id} className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg} ${config.border}`}>
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.text}`} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${config.text}`}>{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
