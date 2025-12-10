import { useTechniciensStatia } from '@/statia/hooks/useTechniciensStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function HeatmapModal() {
  const { techniciens, isLoading } = useTechniciensStatia();
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-4">Heatmap CA Techniciens</h4>
      <p className="text-muted-foreground text-center py-8">
        {techniciens.length} techniciens actifs
      </p>
    </Card>
  );
}
