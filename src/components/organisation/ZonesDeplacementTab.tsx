/**
 * ZonesDeplacementTab - Récapitulatif mensuel des zones BTP par technicien
 */

import { useMemo, useState } from 'react';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { useZonesDeplacement, ZONE_LABELS, type TechZoneSummary } from '@/hooks/useZonesDeplacement';

const ZONE_COLORS: Record<string, string> = {
  '1A': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  '1B': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  '2': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  '3': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  '4': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  '5': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const ZONE_DISTANCES: Record<string, string> = {
  '1A': '0–5 km',
  '1B': '5–10 km',
  '2': '10–20 km',
  '3': '20–30 km',
  '4': '30–40 km',
  '5': '40–50 km',
};

export default function ZonesDeplacementTab() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const { data, isLoading, error } = useZonesDeplacement({ month });

  const displayMonth = useMemo(() => {
    const [y, m] = month.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return format(d, 'MMMM yyyy', { locale: fr });
  }, [month]);

  const navigateMonth = (delta: number) => {
    const [y, m] = month.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1 + delta, 1);
    setMonth(format(d, 'yyyy-MM'));
  };

  const totals = useMemo(() => {
    if (!data?.length) return null;
    const sums: Record<string, number> = {};
    ZONE_LABELS.forEach(z => { sums[z] = 0; });
    let total = 0;
    data.forEach(t => {
      ZONE_LABELS.forEach(z => { sums[z] += t.zones[z] || 0; });
      total += t.total;
    });
    return { sums, total };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Zones de déplacement BTP</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center capitalize">{displayMonth}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-2">
        {ZONE_LABELS.map(z => (
          <span key={z} className={`text-xs px-2 py-1 rounded-full font-medium ${ZONE_COLORS[z]}`}>
            Zone {z} · {ZONE_DISTANCES[z]}
          </span>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48 gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{(error as Error).message}</span>
        </div>
      ) : !data?.length ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Aucune donnée pour ce mois.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Technicien</TableHead>
                {ZONE_LABELS.map(z => (
                  <TableHead key={z} className="text-center w-20">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-semibold">{z}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">{ZONE_DISTANCES[z]}</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center w-20 font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(tech => (
                <TableRow key={tech.techId}>
                  <TableCell className="font-medium">{tech.techName}</TableCell>
                  {ZONE_LABELS.map(z => (
                    <TableCell key={z} className="text-center">
                      {tech.zones[z] > 0 ? (
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold ${ZONE_COLORS[z]}`}>
                          {tech.zones[z]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">–</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold">{tech.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {totals && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  {ZONE_LABELS.map(z => (
                    <TableCell key={z} className="text-center font-bold">{totals.sums[z]}</TableCell>
                  ))}
                  <TableCell className="text-center font-bold text-primary">{totals.total}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      )}
    </div>
  );
}
