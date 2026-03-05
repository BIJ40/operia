/**
 * SuggestionCard v2 - Score breakdown + reasons + blockers
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, User, Calendar, Star, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Suggestion } from '@/hooks/usePlanningAugmente';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApply?: () => void;
  onDismiss?: () => void;
  isLoading?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

const SCORE_LABELS: Record<string, string> = {
  coherence: 'Cohérence',
  equity: 'Équité',
  route: 'Distance',
  gap: 'Trous',
  proximity: 'Proximité',
  continuity: 'Continuité',
};

export function SuggestionCard({ suggestion, onApply, onDismiss, isLoading }: SuggestionCardProps) {
  const breakdown = suggestion.score_breakdown || {};

  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">#{suggestion.rank}</Badge>
            <span className="text-sm font-medium text-foreground">{suggestion.date} à {suggestion.hour}</span>
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold cursor-help ${scoreBg(suggestion.score)} ${scoreColor(suggestion.score)}`}>
                  <Star className="w-3.5 h-3.5" />
                  {suggestion.score}/100
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs space-y-1 max-w-xs">
                <p className="font-medium mb-1">Détail du score</p>
                {Object.entries(breakdown).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span>{SCORE_LABELS[key] || key}</span>
                    <span className="font-mono">{val}</span>
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" /><span className="truncate">{suggestion.tech_name}</span></div>
          <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>{suggestion.duration} min</span></div>
          <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /><span>Buffer: {suggestion.buffer} min</span></div>
        </div>

        {/* Reasons */}
        {suggestion.reasons.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1">
            {suggestion.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={reason.startsWith('⚠') ? 'text-amber-500 mt-0.5' : 'text-primary mt-0.5'}>•</span>
                {reason}
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        {(onApply || onDismiss) && (
          <div className="flex gap-2 pt-1">
            {onApply && (
              <Button size="sm" onClick={onApply} disabled={isLoading} className="flex-1">
                <Check className="w-3.5 h-3.5 mr-1" />Appliquer
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="outline" onClick={onDismiss} disabled={isLoading} className="flex-1">
                <X className="w-3.5 h-3.5 mr-1" />Ignorer
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
