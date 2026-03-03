import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ApporteurStatsV2Request } from '../../types/apporteur-stats-v2';

type Period = ApporteurStatsV2Request['period'];

const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Mois' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Année' },
];

interface PeriodSelectorProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
      {PERIODS.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-lg text-xs h-7 px-3',
            value === p.value && 'bg-background shadow-sm text-foreground font-medium'
          )}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
