import { useTechniciensStatia } from '@/statia/hooks/useTechniciensStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

export default function CAMensuelTechModal() {
  const { topTechniciens, isLoading } = useTechniciensStatia();
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-4">CA par Technicien</h4>
      <div className="space-y-2">
        {topTechniciens.slice(0, 8).map((t, i) => (
          <div key={i} className="flex justify-between p-2 bg-muted/30 rounded">
            <span>{t.name}</span>
            <span className="font-bold">{formatCurrency(t.ca)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
