/**
 * PlanningGrid - Vue grille hebdomadaire des techniciens et créneaux
 * Affiche les créneaux occupés/libres par technicien par jour
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, ChevronLeft, ChevronRight, Loader2, User } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PlanningTechnician, PlanningSlot } from '@/hooks/usePlanningData';

interface PlanningGridProps {
  technicians: PlanningTechnician[];
  slots: PlanningSlot[];
  isLoading: boolean;
  weekStart: Date;
  onWeekChange: (date: Date) => void;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // Lun-Sam
}

function getTechName(tech: PlanningTechnician): string {
  return tech.name || `${tech.prenom || tech.firstname || ''} ${tech.nom || tech.lastname || ''}`.trim() || `Tech #${tech.id}`;
}

function getTechInitials(tech: PlanningTechnician): string {
  if (tech.initiales) return tech.initiales;
  const name = getTechName(tech);
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function parseDateSafe(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch {
    return null;
  }
}

function SlotCell({ slotsForCell }: { slotsForCell: PlanningSlot[] }) {
  if (slotsForCell.length === 0) {
    return (
      <div className="h-full min-h-[48px] bg-green-50 dark:bg-green-950/20 rounded border border-dashed border-green-200 dark:border-green-900/40 flex items-center justify-center">
        <span className="text-[10px] text-green-500 dark:text-green-600">Libre</span>
      </div>
    );
  }

  return (
    <div className="space-y-1 min-h-[48px]">
      {slotsForCell.slice(0, 3).map((slot, i) => {
        const type = ((slot.type || slot.label || '') as string).toLowerCase();
        const isRT = type.includes('rt') || type.includes('releve');
        const isTVX = type.includes('tvx') || type.includes('travaux');
        const isDep = type.includes('dep') || type.includes('depannage');

        let bgClass = 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
        if (isRT) bgClass = 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
        if (isTVX) bgClass = 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800';
        if (isDep) bgClass = 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';

        return (
          <div
            key={i}
            className={`px-1.5 py-1 rounded border text-[10px] truncate ${bgClass}`}
            title={`${slot.ref || ''} - ${slot.label || slot.type || ''}`}
          >
            <span className="font-medium">{slot.ref || `#${slot.projectId || '?'}`}</span>
            {slot.label && <span className="ml-1 opacity-70">{String(slot.label).substring(0, 15)}</span>}
          </div>
        );
      })}
      {slotsForCell.length > 3 && (
        <span className="text-[10px] text-muted-foreground pl-1">+{slotsForCell.length - 3} autres</span>
      )}
    </div>
  );
}

export function PlanningGrid({ technicians, slots, isLoading, weekStart, onWeekChange }: PlanningGridProps) {
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // Index slots by techId + date
  const slotsByTechDate = useMemo(() => {
    const map = new Map<string, PlanningSlot[]>();
    for (const slot of slots) {
      const techId = slot.userId;
      const dateStr = slot.date || slot.dateDebut;
      const date = parseDateSafe(dateStr as string);
      if (!techId || !date) continue;

      for (const day of weekDays) {
        if (isSameDay(date, day)) {
          const key = `${techId}-${format(day, 'yyyy-MM-dd')}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(slot);
        }
      }
    }
    return map;
  }, [slots, weekDays]);

  const weekLabel = `${format(weekStart, 'dd MMM', { locale: fr })} — ${format(addDays(weekStart, 5), 'dd MMM yyyy', { locale: fr })}`;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Planning semaine
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onWeekChange(addWeeks(weekStart, -1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground min-w-[140px] text-center">
              {weekLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onWeekChange(addWeeks(weekStart, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {!isLoading && (
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]">
              {technicians.length} techniciens
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {slots.length} créneaux
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Chargement planning...</span>
          </div>
        ) : technicians.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun technicien trouvé
          </p>
        ) : (
          <ScrollArea className="h-full">
            <div className="min-w-[600px]">
              {/* Header row */}
              <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: '120px repeat(6, 1fr)' }}>
                <div className="text-xs font-medium text-muted-foreground p-1">Technicien</div>
                {weekDays.map((day, i) => (
                  <div key={i} className="text-xs font-medium text-center text-muted-foreground p-1">
                    {format(day, 'EEE dd', { locale: fr })}
                  </div>
                ))}
              </div>

              {/* Tech rows */}
              {technicians.map((tech) => (
                <div
                  key={tech.id}
                  className="grid gap-1 mb-1"
                  style={{ gridTemplateColumns: '120px repeat(6, 1fr)' }}
                >
                  <div className="flex items-center gap-1.5 p-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{
                        backgroundColor: (tech.bgcolor as string) || 'hsl(var(--primary))',
                        color: (tech.color as string) || 'white',
                      }}
                    >
                      {getTechInitials(tech)}
                    </div>
                    <span className="text-xs truncate text-foreground">
                      {getTechName(tech)}
                    </span>
                  </div>
                  {weekDays.map((day, i) => {
                    const key = `${tech.id}-${format(day, 'yyyy-MM-dd')}`;
                    const cellSlots = slotsByTechDate.get(key) || [];
                    return (
                      <div key={i} className="p-0.5">
                        <SlotCell slotsForCell={cellSlots} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
