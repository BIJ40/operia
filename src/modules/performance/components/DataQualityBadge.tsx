/**
 * DataQualityBadge — Shows active data quality flags
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import type { DataQualityFlags } from '../engine/types';

interface Props {
  flags: DataQualityFlags;
  className?: string;
}

const FLAG_LABELS: Record<keyof DataQualityFlags, string> = {
  missingContract: 'Contrat RH absent — capacité estimée (35h par défaut)',
  missingExplicitDurations: 'Aucune durée explicite — durées estimées',
  missingPlanningCoverage: 'Aucune activité planning trouvée',
  missingAbsenceData: 'Aucune donnée d\'absence disponible',
  highFallbackUsage: 'Plus de 50% des durées sont estimées',
  duplicateResolutionApplied: 'Résolution de doublons appliquée',
  partialPeriodCoverage: 'Données partielles sur la période',
};

export function DataQualityBadge({ flags, className }: Props) {
  const activeFlags = (Object.entries(flags) as [keyof DataQualityFlags, boolean][])
    .filter(([, v]) => v);

  if (activeFlags.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 cursor-help ${className || ''}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs">{activeFlags.length}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5">
            <div className="font-medium text-xs">Alertes qualité données</div>
            {activeFlags.map(([key]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{FLAG_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
