/**
 * CapacityBreakdown — Jours ouvrés - absences = capacité effective
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import type { CapacityResult } from '../engine/types';

interface Props {
  capacity: CapacityResult;
  weeklyHoursSource: 'contract' | 'default';
  weeklyHours: number;
}

export function CapacityBreakdown({ capacity, weeklyHoursSource, weeklyHours }: Props) {
  const effectiveDays = capacity.workingDays - capacity.absenceDays;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Capacité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-lg font-bold">{capacity.workingDays}</div>
            <div className="text-[10px] text-muted-foreground">Jours ouvrés</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">-{capacity.absenceDays}</div>
            <div className="text-[10px] text-muted-foreground">Absences</div>
          </div>
          <div className="bg-primary/10 rounded-lg p-2">
            <div className="text-lg font-bold text-primary">{effectiveDays}</div>
            <div className="text-[10px] text-muted-foreground">Effectifs</div>
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Base horaire</span>
            <span className="font-medium">
              {weeklyHours}h/sem
              {weeklyHoursSource === 'default' && (
                <span className="text-amber-500 ml-1">(défaut)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Capacité théorique</span>
            <span className="font-medium">{Math.round(capacity.theoreticalMinutes / 60)}h</span>
          </div>
          <div className="flex justify-between">
            <span>Capacité ajustée</span>
            <span className="font-medium">{Math.round(capacity.adjustedCapacityMinutes / 60)}h</span>
          </div>
          {capacity.absenceSource === 'planning_unavailability' && (
            <div className="text-amber-500 text-[10px] mt-1">
              ⚠ Absences détectées par planning (non certifiées)
            </div>
          )}
          {capacity.absenceSource === 'none' && (
            <div className="text-amber-500 text-[10px] mt-1">
              ⚠ Aucune donnée d'absence disponible
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
