import { Card, CardContent } from '@/components/ui/card';
import { FileWarning } from 'lucide-react';

interface ForecastEmptyStateProps {
  hasCommittedData: boolean;
  hasProbableData: boolean;
  horizonLabel: string;
}

export function ForecastEmptyState({ hasCommittedData, hasProbableData, horizonLabel }: ForecastEmptyStateProps) {
  let message = `Aucun engagement ni charge probable détecté sur l'horizon ${horizonLabel}. La capacité future reste largement disponible.`;

  if (!hasCommittedData && hasProbableData) {
    message = `Aucune intervention planifiée sur ${horizonLabel}, mais de la charge probable est détectée. Vérifiez le planning.`;
  } else if (hasCommittedData && !hasProbableData) {
    message = `Des interventions sont planifiées sur ${horizonLabel}, mais aucun dossier probable n'a été identifié.`;
  }

  return (
    <Card className="border-muted">
      <CardContent className="pt-6 text-center py-12">
        <FileWarning className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium mb-2">Prévision limitée</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
      </CardContent>
    </Card>
  );
}
