import { useApporteursStatia } from '@/statia/hooks/useApporteursStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { Trophy, Building2 } from 'lucide-react';

export default function TopApporteursModal() {
  const { data, isLoading } = useApporteursStatia();
  const topApporteurs = data?.topApporteurs ?? [];
  
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h4 className="font-semibold">Top 10 Apporteurs CA</h4>
      </div>
      <div className="space-y-2">
        {topApporteurs.slice(0, 10).map((a, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-yellow-500 text-white' : 'bg-muted'}`}>{a.rank}</span>
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{a.name}</span>
            </div>
            <span className="font-bold text-primary">{formatCurrency(a.ca)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
