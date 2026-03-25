/**
 * ConfidenceBadge — Badge 0-100% with sub-scores on hover
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import type { ConfidenceBreakdown } from '../engine/types';

interface Props {
  confidence: ConfidenceBreakdown;
  className?: string;
}

const LABELS: Record<keyof Omit<ConfidenceBreakdown, 'globalConfidenceScore'>, string> = {
  durationConfidence: 'Durées',
  capacityConfidence: 'Capacité',
  matchingConfidence: 'Rapprochement',
  classificationConfidence: 'Classification',
};

export function ConfidenceBadge({ confidence, className }: Props) {
  const pct = Math.round(confidence.globalConfidenceScore * 100);
  const isGood = pct >= 70;
  const Icon = isGood ? ShieldCheck : ShieldAlert;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1 cursor-help ${
              isGood
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            } ${className || ''}`}
          >
            <Icon className="w-3 h-3" />
            {pct}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium text-xs">Score de confiance des données</div>
            {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((key) => {
              const val = Math.round(confidence[key] * 100);
              return (
                <div key={key} className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">{LABELS[key]}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${val >= 70 ? 'bg-green-500' : val >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="font-mono w-8 text-right">{val}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
