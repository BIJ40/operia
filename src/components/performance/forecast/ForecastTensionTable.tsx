import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type {
  ForecastSnapshot,
  ForecastTensionSnapshot,
  PredictedTensionLevel,
  ForecastConfidenceLevel,
} from '@/modules/performance/forecast/types';

interface ForecastTensionTableProps {
  snapshots: ForecastSnapshot[];
  tensionSnapshots: ForecastTensionSnapshot[];
  onSelectTechnician: (technicianId: string) => void;
}

const TENSION_ORDER: Record<PredictedTensionLevel, number> = {
  critical: 0, tension: 1, watch: 2, comfort: 3,
};

const TENSION_BADGE: Record<PredictedTensionLevel, { label: string; className: string }> = {
  critical: { label: 'Critique', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  tension: { label: 'Tendu', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  watch: { label: 'Surveillance', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  comfort: { label: 'Confort', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

const CONFIDENCE_BADGE: Record<ForecastConfidenceLevel, { label: string; className: string }> = {
  high: { label: 'Haute', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  medium: { label: 'Moyenne', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Faible', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

function mToH(m: number): string { return `${Math.round(m / 60)}h`; }

export function ForecastTensionTable({ snapshots, tensionSnapshots, onSelectTechnician }: ForecastTensionTableProps) {
  const tensionMap = new Map(tensionSnapshots.map(t => [t.technicianId, t]));

  const rows = snapshots
    .map(snap => ({ snap, tension: tensionMap.get(snap.technicianId) }))
    .filter((r): r is { snap: ForecastSnapshot; tension: ForecastTensionSnapshot } => !!r.tension)
    .sort((a, b) => {
      const tDiff = TENSION_ORDER[a.tension.predictedTensionLevel] - TENSION_ORDER[b.tension.predictedTensionLevel];
      if (tDiff !== 0) return tDiff;
      return (b.tension.globalLoadRatio ?? 0) - (a.tension.globalLoadRatio ?? 0);
    });

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Technicien</TableHead>
            <TableHead className="text-right">Capacité</TableHead>
            <TableHead className="text-right">Engagé</TableHead>
            <TableHead className="text-right">Probable</TableHead>
            <TableHead className="text-right">Disponible</TableHead>
            <TableHead className="text-right">Ratio</TableHead>
            <TableHead>Tension</TableHead>
            <TableHead>Confiance</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ snap, tension }) => {
            const capacity = snap.projectedCapacity.adjustedCapacityMinutes;
            const committed = snap.committedWorkload?.committedMinutes ?? 0;
            const probable = snap.probableWorkload?.probableMinutes ?? 0;
            const available = snap.projectedAvailableMinutesAfterProbable
              ?? snap.projectedAvailableMinutesAfterCommitted
              ?? capacity;
            const ratio = snap.projectedGlobalLoadRatio ?? snap.projectedCommittedLoadRatio;
            const isNegative = available < 0;
            const tensionBadge = TENSION_BADGE[tension.predictedTensionLevel];
            const confBadge = CONFIDENCE_BADGE[tension.confidenceLevel];

            return (
              <TableRow
                key={snap.technicianId}
                className="cursor-pointer"
                onClick={() => onSelectTechnician(snap.technicianId)}
              >
                <TableCell className="font-medium">{snap.name}</TableCell>
                <TableCell className="text-right tabular-nums">{mToH(capacity)}</TableCell>
                <TableCell className="text-right tabular-nums">{committed > 0 ? mToH(committed) : '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{probable > 0 ? mToH(probable) : '—'}</TableCell>
                <TableCell className={`text-right tabular-nums ${isNegative ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                  {isNegative ? `-${mToH(Math.abs(available))}` : mToH(available)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {ratio != null ? `${Math.round(ratio * 100)}%` : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={tensionBadge.className}>
                    {tensionBadge.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={confBadge.className}>
                    {confBadge.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
