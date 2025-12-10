import { useStatiaSAVMetrics } from '@/statia/hooks/useStatiaSAVMetrics';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

export default function TauxSAVModal() {
  const { data, isLoading } = useStatiaSAVMetrics();
  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-red-500" />
        <div>
          <p className="text-sm text-muted-foreground">Taux SAV (YTD)</p>
          <p className="text-4xl font-bold text-red-600 mt-1">
            {(data?.tauxSAVYTD ?? 0).toFixed(1)}%
          </p>
        </div>
      </div>
    </Card>
  );
}
