/**
 * DataQualityBadge — Shows active data quality flags
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import type { DataQualityFlags, TechnicianSnapshot } from '../engine/types';

interface Props {
  flags: DataQualityFlags;
  snapshots?: TechnicianSnapshot[];
  className?: string;
}

const FLAG_LABELS: Record<string, string> = {
  missingContract: 'Durée hebdo non renseignée — capacité estimée (35h par défaut)',
  missingExplicitDurations: 'Aucune durée explicite — durées estimées',
  missingPlanningCoverage: 'Aucune activité planning trouvée',
  missingAbsenceData: 'Aucune donnée d\'absence disponible',
  highFallbackUsage: 'Plus de 50% des durées sont estimées',
  duplicateResolutionApplied: 'Résolution de doublons appliquée',
  partialPeriodCoverage: 'Données partielles sur la période',
};

const ABSENCE_LABELS: Record<string, string> = {
  none: 'Aucune donnée d\'absence disponible',
  partial: 'Absences partiellement fiables (mix RH + planning)',
  reliable: '',
};

export function DataQualityBadge({ flags, snapshots, className }: Props) {
  // Count boolean flags
  const booleanFlags = ['missingContract', 'missingExplicitDurations', 'missingPlanningCoverage',
    'highFallbackUsage', 'duplicateResolutionApplied', 'partialPeriodCoverage'] as const;
  
  const activeFlags = booleanFlags.filter(k => flags[k]);
  const hasAbsenceIssue = flags.absenceReliability !== 'reliable';
  const totalIssues = activeFlags.length + (hasAbsenceIssue ? 1 : 0);

  if (totalIssues === 0) return null;

  // If snapshots provided, count impacted technicians per flag
  const techCounts = snapshots ? computeTechCounts(snapshots) : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 cursor-help ${className || ''}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs">{totalIssues}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5">
            <div className="font-medium text-xs">Alertes qualité données</div>
            {activeFlags.map((key) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  {FLAG_LABELS[key]}
                  {techCounts && techCounts[key] > 0 && (
                    <span className="font-medium"> — {techCounts[key]} tech.</span>
                  )}
                </span>
              </div>
            ))}
            {hasAbsenceIssue && (
              <div className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{ABSENCE_LABELS[flags.absenceReliability]}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function computeTechCounts(snapshots: TechnicianSnapshot[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const keys = ['missingContract', 'missingExplicitDurations', 'missingPlanningCoverage',
    'highFallbackUsage', 'duplicateResolutionApplied', 'partialPeriodCoverage'] as const;
  
  for (const key of keys) {
    counts[key] = snapshots.filter(s => s.dataQualityFlags[key]).length;
  }
  return counts;
}
