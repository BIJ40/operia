import { useApporteursStatia } from '@/statia/hooks/useApporteursStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';

export default function EncoursModal() {
  const { data, isLoading } = useApporteursStatia();
  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/30">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-orange-500" />
        <div>
          <p className="text-sm text-muted-foreground">Encours Global TTC</p>
          <p className="text-4xl font-bold text-orange-600 mt-1">
            {data?.duGlobal ? formatCurrency(data.duGlobal) : '–'}
          </p>
        </div>
      </div>
    </Card>
  );
}
