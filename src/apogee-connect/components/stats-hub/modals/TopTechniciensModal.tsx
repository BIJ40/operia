import { useTechniciensStatia } from '@/statia/hooks/useTechniciensStatia';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { Trophy, User } from 'lucide-react';

export default function TopTechniciensModal() {
  const { topTechniciens, isLoading } = useTechniciensStatia();
  
  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h4 className="font-semibold">Top 10 Techniciens</h4>
      </div>
      <div className="space-y-2">
        {topTechniciens.map((t, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: t.color || (i < 3 ? '#EAB308' : '#888') }}
              >
                {t.rank}
              </span>
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t.name}</span>
            </div>
            <span className="font-bold text-green-600">{formatCurrency(t.ca)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
