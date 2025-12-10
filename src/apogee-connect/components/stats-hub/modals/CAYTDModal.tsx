import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

export default function CAYTDModal() {
  const { data, isLoading } = useStatiaIndicateurs();
  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
        <p className="text-sm text-muted-foreground">CA depuis janvier</p>
        <p className="text-4xl font-bold text-green-600 mt-2">
          {data?.caYTD ? formatCurrency(data.caYTD) : '–'}
        </p>
      </Card>
    </div>
  );
}
