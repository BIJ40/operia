import { Card, CardContent } from '@/components/ui/card';

const ITEMS = [
  { color: 'bg-primary', label: 'Engagé (planifié)' },
  { color: 'bg-amber-400 dark:bg-amber-500', label: 'Probable (pipeline)' },
  { color: 'bg-orange-300 dark:bg-orange-400', label: 'Non affecté équipe' },
  { color: 'bg-muted', label: 'Disponible' },
];

const TENSION_ITEMS = [
  { color: 'bg-emerald-500', label: 'Confort' },
  { color: 'bg-amber-500', label: 'Surveillance' },
  { color: 'bg-orange-500', label: 'Tension' },
  { color: 'bg-red-500', label: 'Critique' },
];

export function ForecastLegend() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-3 px-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Charge :</span>
        {ITEMS.map(i => (
          <span key={i.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${i.color}`} />
            {i.label}
          </span>
        ))}
        <span className="mx-2 text-border">|</span>
        <span className="font-medium text-foreground">Tension :</span>
        {TENSION_ITEMS.map(i => (
          <span key={i.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${i.color}`} />
            {i.label}
          </span>
        ))}
      </CardContent>
    </Card>
  );
}
