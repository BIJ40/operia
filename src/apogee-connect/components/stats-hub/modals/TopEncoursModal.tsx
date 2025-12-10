import { useApporteursStatia } from '@/statia/hooks/useApporteursStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { AlertCircle, Building2 } from 'lucide-react';

export default function TopEncoursModal() {
  const { flopApporteurs, isLoading } = useApporteursStatia();
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-orange-500" />
        <h4 className="font-semibold">Top 10 Encours</h4>
      </div>
      <div className="space-y-2">
        {flopApporteurs.slice(0, 10).map((a, i) => (
          <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{a.nom}</span>
            </div>
            <span className="font-bold text-orange-600">{formatCurrency(a.encours || 0)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
