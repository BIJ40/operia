import { useUniversStatia } from '@/statia/hooks/useUniversStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

export default function RepartitionUniversModal() {
  const { data, isLoading } = useUniversStatia();
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  const stats = data?.stats ?? [];

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-4">Répartition CA par Univers</h4>
      <div className="space-y-2">
        {stats.slice(0, 8).map((u, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>{u.univers}</span>
            </div>
            <span className="font-medium">{formatCurrency(u.caHT)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
