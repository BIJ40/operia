import { useStatiaSAVMetrics } from '@/statia/hooks/useStatiaSAVMetrics';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

export default function SAVListeModal() {
  const { data, isLoading } = useStatiaSAVMetrics();
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  const count = data?.nbSavGlobal ?? 0;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <h4 className="font-semibold">Dossiers SAV ({count})</h4>
      </div>
      <p className="text-muted-foreground text-center py-8">Liste détaillée disponible prochainement</p>
    </Card>
  );
}
