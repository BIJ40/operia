/**
 * SuggestionCard - Affiche une suggestion de créneau avec score et raisons
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, User, Calendar, Star } from 'lucide-react';

interface Suggestion {
  rank: number;
  date: string;
  hour: string;
  tech_id: number;
  tech_name: string;
  duration: number;
  buffer: number;
  score: number;
  reasons: string[];
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApply?: () => void;
  onDismiss?: () => void;
  isLoading?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

export function SuggestionCard({ suggestion, onApply, onDismiss, isLoading }: SuggestionCardProps) {
  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardContent className="p-4 space-y-3">
        {/* Header: Rank + Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              #{suggestion.rank}
            </Badge>
            <span className="text-sm font-medium text-foreground">
              {suggestion.date} à {suggestion.hour}
            </span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${scoreBg(suggestion.score)} ${scoreColor(suggestion.score)}`}>
            <Star className="w-3.5 h-3.5" />
            {suggestion.score}/100
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{suggestion.tech_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{suggestion.duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Buffer: {suggestion.buffer} min</span>
          </div>
        </div>

        {/* Reasons */}
        <ul className="text-xs text-muted-foreground space-y-1">
          {suggestion.reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-primary mt-0.5">•</span>
              {reason}
            </li>
          ))}
        </ul>

        {/* Actions */}
        {(onApply || onDismiss) && (
          <div className="flex gap-2 pt-1">
            {onApply && (
              <Button size="sm" onClick={onApply} disabled={isLoading} className="flex-1">
                <Check className="w-3.5 h-3.5 mr-1" />
                Appliquer
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="outline" onClick={onDismiss} disabled={isLoading} className="flex-1">
                <X className="w-3.5 h-3.5 mr-1" />
                Ignorer
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
