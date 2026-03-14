import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { FinancialSummary } from '@/hooks/useFinancialSummary';

interface ResultBlockProps {
  summary: FinancialSummary | null;
  isLoading: boolean;
}

function formatEuro(val: number | undefined | null): string {
  return (val ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function colorClass(val: number | undefined | null): string {
  if (!val) return 'text-foreground';
  return val >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
}

export function ResultBlock({ summary, isLoading }: ResultBlockProps) {
  const rows = [
    { label: 'CA net', value: summary?.ca_net },
    { label: '- Charges variables', value: summary?.charges_variables, indent: true },
    { label: 'Marge contributive', value: summary?.marge_contributive, highlight: true },
    { label: '- Charges fixes', value: summary?.charges_fixes, indent: true },
    { label: 'Résultat d\'exploitation', value: summary?.resultat_exploitation, bold: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Résultat
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 animate-pulse bg-muted rounded" />
        ) : (
          <div className="space-y-2">
            {rows.map(row => (
              <div
                key={row.label}
                className={`flex justify-between items-center ${row.bold ? 'border-t pt-2 mt-2' : ''} ${row.indent ? 'pl-3' : ''}`}
              >
                <span className={`text-sm ${row.bold || row.highlight ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {row.label}
                </span>
                <span className={`text-sm tabular-nums font-medium ${row.bold ? colorClass(row.value) : 'text-foreground'}`}>
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
