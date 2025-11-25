import { Button } from '@/components/ui/button';

interface PeriodSelectorProps {
  value: 'day' | '7days' | 'month' | 'year' | 'rolling12';
  onChange: (period: 'day' | '7days' | 'month' | 'year' | 'rolling12') => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const periods = [
    { value: 'day', label: 'Jour' },
    { value: '7days', label: '7 derniers jours' },
    { value: 'month', label: 'Mois en cours' },
    { value: 'year', label: 'Année en cours' },
    { value: 'rolling12', label: '12 mois glissants' },
  ] as const;

  return (
    <div className="flex gap-2 flex-wrap">
      {periods.map((period) => (
        <Button
          key={period.value}
          onClick={() => onChange(period.value)}
          variant={value === period.value ? 'default' : 'outline'}
          className={value === period.value 
            ? 'bg-gradient-to-r from-primary to-helpconfort-blue-dark text-primary-foreground' 
            : 'border-primary/20 hover:border-primary/40'
          }
          size="sm"
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
