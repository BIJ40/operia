import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, Calendar } from 'lucide-react';

export default function DossiersModal() {
  const { data, isLoading } = useStatiaIndicateurs();

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Dossiers ce mois</p>
              <p className="text-2xl font-bold">{data?.dossiersRecusMois ?? '–'}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Moyenne/jour</p>
              <p className="text-2xl font-bold">{data?.moyenneDossiersJour?.toFixed(1) ?? '–'}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
