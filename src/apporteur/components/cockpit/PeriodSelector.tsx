import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ApporteurStatsV2Request } from '../../types/apporteur-stats-v2';

type Period = ApporteurStatsV2Request['period'];

const PERIODS: { value: Period; label: string }[] = [
  { value: 'month', label: 'Mois' },
  { value: 'quarter', label: 'Trimestre' },
  { value: '6months', label: '6 mois' },
  { value: 'year', label: 'Année' },
  { value: '12months', label: '12 mois' },
];

interface PeriodSelectorProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-xl p-1.5">
      <Calendar className="w-4 h-4 text-primary ml-1.5 shrink-0" />
      {PERIODS.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-lg text-sm h-8 px-3.5 font-medium transition-all',
            value === p.value
              ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
          )}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
