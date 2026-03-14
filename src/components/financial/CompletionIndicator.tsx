import { Progress } from '@/components/ui/progress';

interface CompletionIndicatorProps {
  score: number; // 0-100
}

export function CompletionIndicator({ score }: CompletionIndicatorProps) {
  const label = score >= 100 ? 'Complet' : score >= 50 ? 'Partiel' : 'À renseigner';

  return (
    <div className="flex items-center gap-3">
      <Progress value={score} className="h-2 flex-1" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {score}% — {label}
      </span>
    </div>
  );
}
