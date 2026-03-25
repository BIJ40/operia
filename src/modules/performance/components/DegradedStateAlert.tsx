/**
 * DegradedStateAlert V2 — Alert with actionable recommendations
 */

import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, FileWarning } from 'lucide-react';
import type { DataQualityFlags } from '../engine/types';

interface Props {
  flags: DataQualityFlags;
  technicianName?: string;
}

interface AlertItem {
  message: string;
  recommendation: string;
}

export function DegradedStateAlert({ flags, technicianName }: Props) {
  const alerts: AlertItem[] = [];

  if (flags.missingContract) {
    alerts.push({
      message: 'Contrat RH absent — capacité estimée à 35h/semaine par défaut',
      recommendation: 'Compléter les données RH',
    });
  }
  if (flags.absenceReliability === 'none') {
    alerts.push({
      message: 'Aucune donnée d\'absence disponible — capacité non ajustée',
      recommendation: 'Saisir les absences',
    });
  } else if (flags.absenceReliability === 'partial') {
    alerts.push({
      message: 'Absences partiellement fiables (détection planning uniquement)',
      recommendation: 'Compléter avec les absences RH',
    });
  }
  if (flags.highFallbackUsage) {
    alerts.push({
      message: 'Plus de 50% des durées sont estimées (pas de durée réelle disponible)',
      recommendation: 'Améliorer la saisie des durées',
    });
  }
  if (flags.missingPlanningCoverage) {
    alerts.push({
      message: 'Aucune activité exploitable trouvée sur la période',
      recommendation: 'Vérifier le planning',
    });
  }
  if (flags.partialPeriodCoverage) {
    alerts.push({
      message: 'Couverture partielle de la période sélectionnée',
      recommendation: 'Vérifier la période',
    });
  }
  if (flags.duplicateResolutionApplied) {
    alerts.push({
      message: 'Des doublons ont été détectés et résolus automatiquement',
      recommendation: 'Vérifier les doublons',
    });
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
            <ul className="text-xs text-muted-foreground space-y-1.5">
              {alerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span>{alert.message}</span>
                    <span className="ml-1.5 text-primary font-medium">→ {alert.recommendation}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
