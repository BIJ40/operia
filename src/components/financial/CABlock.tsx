import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Euro } from 'lucide-react';
import type { FinancialSummary } from '@/hooks/useFinancialSummary';

interface CABlockProps {
  summary: FinancialSummary | null;
  isLoading: boolean;
}

function formatEuro(val: number | undefined | null): string {
  return (val ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function CABlock({ summary, isLoading }: CABlockProps) {
  const rows = [
    { label: 'CA total', value: summary?.ca_total },
    { label: 'Achats', value: summary?.achats, negative: true },
    { label: 'Sous-traitance', value: summary?.sous_traitance, negative: true },
    { label: 'CA net', value: summary?.ca_net, bold: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Euro className="h-4 w-4 text-muted-foreground" />
          Chiffre d'affaires
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-24 animate-pulse bg-muted rounded" />
        ) : (
          <div className="space-y-2">
            {rows.map(row => (
              <div key={row.label} className={`flex justify-between items-center ${row.bold ? 'border-t pt-2 mt-2' : ''}`}>
                <span className={`text-sm ${row.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {row.negative && row.value ? '- ' : ''}{row.label}
                </span>
                <span className={`text-sm tabular-nums ${row.bold ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                  {formatEuro(row.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
