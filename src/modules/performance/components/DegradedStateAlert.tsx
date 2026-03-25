/**
 * DegradedStateAlert — Explicit alert when data quality is insufficient
 */

import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, FileWarning } from 'lucide-react';
import type { DataQualityFlags } from '../engine/types';

interface Props {
  flags: DataQualityFlags;
  technicianName?: string;
}

export function DegradedStateAlert({ flags, technicianName }: Props) {
  const alerts: string[] = [];

  if (flags.missingContract) {
    alerts.push('Contrat RH absent — capacité estimée à 35h/semaine par défaut');
  }
  if (flags.missingAbsenceData) {
    alerts.push('Aucune donnée d\'absence disponible — capacité non ajustée');
  }
  if (flags.highFallbackUsage) {
    alerts.push('Plus de 50% des durées sont estimées (pas de durée réelle disponible)');
  }
  if (flags.missingPlanningCoverage) {
    alerts.push('Aucune activité exploitable trouvée sur la période');
  }
  if (flags.partialPeriodCoverage) {
    alerts.push('Couverture partielle de la période sélectionnée');
  }

  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <FileWarning className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-medium text-sm">
              Données partielles{technicianName ? ` — ${technicianName}` : ''}
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {alerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
