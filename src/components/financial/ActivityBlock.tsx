import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import type { FinancialSummary } from '@/hooks/useFinancialSummary';

interface ActivityBlockProps {
  summary: FinancialSummary | null;
  isLoading: boolean;
}

export function ActivityBlock({ summary, isLoading }: ActivityBlockProps) {
  const items = [
    { label: 'Interventions', value: summary?.nb_interventions ?? 0 },
    { label: 'Factures', value: summary?.nb_factures ?? 0 },
    { label: 'Heures facturées', value: summary?.heures_facturees ?? 0, suffix: 'h' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Activité
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-16 animate-pulse bg-muted rounded" />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {typeof item.value === 'number' ? item.value.toLocaleString('fr-FR') : item.value}
                  {item.suffix && <span className="text-sm font-normal text-muted-foreground">{item.suffix}</span>}
                </p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
