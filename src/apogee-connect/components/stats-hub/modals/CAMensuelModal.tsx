import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

export default function CAMensuelModal() {
  const { data, isLoading } = useStatiaIndicateurs();

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-l-4 border-l-primary">
          <p className="text-sm text-muted-foreground">CA Période HT</p>
          <p className="text-3xl font-bold text-primary">
            {data?.caJour ? formatCurrency(data.caJour) : '–'}
          </p>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <p className="text-sm text-muted-foreground">CA Devis</p>
          <p className="text-3xl font-bold text-green-600">
            {data?.caDevis ? formatCurrency(data.caDevis) : '–'}
          </p>
        </Card>
      </div>
    </div>
  );
}
