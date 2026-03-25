import { Button } from '@/components/ui/button';
import type { ForecastHorizon } from '@/modules/performance/forecast/types';

interface ForecastHorizonTabsProps {
  value: ForecastHorizon;
  onChange: (h: ForecastHorizon) => void;
}

const HORIZONS: { value: ForecastHorizon; label: string }[] = [
  { value: '7d', label: 'J+7' },
  { value: '14d', label: 'J+14' },
  { value: '30d', label: 'J+30' },
];

export function ForecastHorizonTabs({ value, onChange }: ForecastHorizonTabsProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
      {HORIZONS.map(h => (
        <Button
          key={h.value}
          variant={value === h.value ? 'default' : 'ghost'}
          size="sm"
          className="min-w-[60px]"
          onClick={() => onChange(h.value)}
        >
          {h.label}
        </Button>
      ))}
    </div>
  );
}
