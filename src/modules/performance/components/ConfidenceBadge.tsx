/**
 * ConfidenceBadge — Badge 0-100% with sub-scores and tier on hover
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import type { ConfidenceBreakdown } from '../engine/types';

interface Props {
  confidence: ConfidenceBreakdown;
  className?: string;
}

const SUB_SCORE_LABELS: Record<string, string> = {
  durationConfidence: 'Durées',
  capacityConfidence: 'Capacité',
  matchingConfidence: 'Rapprochement',
  classificationConfidence: 'Classification',
};

const TIER_CONFIG = {
  high: { label: 'Élevée', color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30', Icon: ShieldCheck },
  medium: { label: 'Moyenne', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', Icon: Shield },
  low: { label: 'Faible', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30', Icon: ShieldAlert },
};

export function ConfidenceBadge({ confidence, className }: Props) {
  const pct = Math.round(confidence.globalConfidenceScore * 100);
  const tier = TIER_CONFIG[confidence.confidenceLevel];
  const Icon = tier.Icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1 cursor-help ${tier.color} ${className || ''}`}
          >
            <Icon className="w-3 h-3" />
            {pct}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium text-xs">
              Confiance {tier.label.toLowerCase()} ({pct}%)
            </div>
            {Object.entries(SUB_SCORE_LABELS).map(([key, label]) => {
              const val = Math.round((confidence[key as keyof ConfidenceBreakdown] as number) * 100);
              return (
                <div key={key} className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">{label}</span>
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
            {confidence.penalties.length > 0 && (
              <div className="border-t pt-1.5 mt-1.5">
                <div className="text-[10px] text-muted-foreground mb-1">Pénalités appliquées</div>
                {confidence.penalties.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{p.reason}</span>
                    <span className="text-red-500 font-mono">-{Math.round(p.value * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
