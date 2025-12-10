import { useTechniciensStatia } from '@/statia/hooks/useTechniciensStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

export default function CAMensuelTechModal() {
  const { techniciens, isLoading } = useTechniciensStatia();
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-4">CA Mensuel par Technicien</h4>
      <div className="space-y-2">
        {techniciens.slice(0, 8).map(t => (
          <div key={t.id} className="flex justify-between p-2 bg-muted/30 rounded">
            <span>{t.nom}</span>
            <span className="font-bold">{formatCurrency(t.ca)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
