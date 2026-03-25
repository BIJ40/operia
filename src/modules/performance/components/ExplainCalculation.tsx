/**
 * ExplainCalculation V2 — Drill-down panel with calculationTrace + penalties + absences
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { CalculationTrace, CalculationWarningCode, ConfidenceBreakdown } from '../engine/types';

interface Props {
  trace: CalculationTrace;
  confidence?: ConfidenceBreakdown;
}

const WARNING_LABELS: Record<CalculationWarningCode, string> = {
  MISSING_CONTRACT: 'Contrat RH absent',
  MISSING_ABSENCE_DATA: 'Données absences manquantes',
  HIGH_FALLBACK_USAGE: 'Durées majoritairement estimées',
  AMBIGUOUS_MATCHING: 'Rapprochement ambigu',
  ZERO_WORKING_DAYS: 'Aucun jour ouvré',
  NO_ACTIVITY: 'Aucune activité',
  UNKNOWN_TECHNICIAN: 'Technicien non identifié',
  ABERRANT_DURATION: 'Durée aberrante corrigée',
  PARTIAL_PERIOD: 'Période partielle',
};

export function ExplainCalculation({ trace, confidence }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Traçabilité calcul
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-7 gap-1">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Réduire' : 'Détails'}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 text-xs">
          {/* Warnings */}
          {trace.warnings.length > 0 && (
            <div className="space-y-1">
              <div className="font-medium text-muted-foreground">Alertes</div>
              <div className="flex flex-wrap gap-1">
                {trace.warnings.map((w) => (
                  <Badge key={w} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    {WARNING_LABELS[w]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Penalties */}
          {confidence && confidence.penalties.length > 0 && (
            <div className="space-y-1">
              <div className="font-medium text-muted-foreground">Pénalités confiance</div>
              <div className="space-y-0.5">
                {confidence.penalties.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{p.reason}</span>
                    <span className="text-red-500 font-mono">-{Math.round(p.value * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capacity */}
          <div className="space-y-1">
            <div className="font-medium text-muted-foreground">Capacité</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>Jours ouvrés:</span><span className="font-mono">{trace.capacityTrace.workingDays}</span>
              <span>Absences:</span><span className="font-mono">{trace.capacityTrace.absenceDays} ({trace.capacityTrace.absenceSource})</span>
              <span>Base:</span><span className="font-mono">{trace.capacityTrace.weeklyHours}h/sem ({trace.capacityTrace.weeklyHoursSource})</span>
            </div>
          </div>

          {/* Duration sources */}
          <div className="space-y-1">
            <div className="font-medium text-muted-foreground">Sources de durée</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(trace.durationTrace.itemCountBySource).map(([src, count]) => (
                <div key={src} className="contents">
                  <span>{src}:</span>
                  <span className="font-mono">{count} items ({Math.round((trace.durationTrace.minutesBySource[src] || 0) / 60)}h)</span>
                </div>
              ))}
              <span className="font-medium">Total:</span>
              <span className="font-mono font-medium">{Math.round(trace.durationTrace.totalMinutes / 60)}h</span>
            </div>
          </div>

          {/* Allocation */}
          <div className="space-y-1">
            <div className="font-medium text-muted-foreground">Allocation</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>Créneaux partagés:</span><span className="font-mono">{trace.allocationTrace.sharedSlots}</span>
              <span>Méthode:</span><span className="font-mono">{trace.allocationTrace.method}</span>
            </div>
          </div>

          {/* Consolidation */}
          <div className="space-y-1">
            <div className="font-medium text-muted-foreground">Consolidation</div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
              <span>Fusionnés: {trace.consolidationTrace.merged}</span>
              <span>Séparés: {trace.consolidationTrace.keptSeparate}</span>
              <span>Éliminés: {trace.consolidationTrace.discarded}</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
