import { useApporteursStatia } from '@/statia/hooks/useApporteursStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { TrendingDown, Building2 } from 'lucide-react';

export default function FlopApporteursModal() {
  const { data, isLoading } = useApporteursStatia();
  const topApporteurs = data?.topApporteurs ?? [];
  const flopApporteurs = [...topApporteurs].reverse().slice(0, 10);
  
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-5 w-5 text-red-500" />
        <h4 className="font-semibold">Apporteurs à plus faible CA</h4>
      </div>
      <div className="space-y-2">
        {flopApporteurs.map((a, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{a.name}</span>
            </div>
            <span className="font-bold text-muted-foreground">{formatCurrency(a.ca)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
