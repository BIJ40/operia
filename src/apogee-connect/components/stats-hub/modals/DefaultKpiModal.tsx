import { STATS_INDEX } from '../types';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface DefaultKpiModalProps {
  statId: string;
}

export default function DefaultKpiModal({ statId }: DefaultKpiModalProps) {
  const stat = STATS_INDEX.find(s => s.id === statId);
  
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-muted/30">
        <div className="flex items-start gap-4">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg">{stat?.title || 'Statistique'}</h3>
            {stat?.subtitle && (
              <p className="text-muted-foreground">{stat.subtitle}</p>
            )}
          </div>
        </div>
      </Card>
      
      <div className="text-center py-8 text-muted-foreground">
        <p>Détails disponibles prochainement</p>
        <p className="text-sm mt-2">
          Utilisez les flèches ← → pour naviguer vers d'autres statistiques
        </p>
      </div>
    </div>
  );
}
