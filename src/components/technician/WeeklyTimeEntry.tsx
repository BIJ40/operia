import { useState } from 'react';
import { format, startOfWeek, addDays, setHours, setMinutes, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, Loader2, RotateCcw, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useBulkCreateTimeEvents, useDeleteDayEvents, type TimeEventType } from '@/hooks/technician/useTimeEvents';
import { cn } from '@/lib/utils';

interface DayEntry {
  debut: string;
  pause: string;
  reprise: string;
  fin: string;
}

interface WeeklyTimeEntryProps {
  weekStart: Date;
  existingDays: Array<{
    date: string;
    totalMinutes: number;
    events: Array<{ event_type: string; occurred_at: string }>;
  }>;
  onSaved?: () => void;
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

function parseTimeToDate(date: Date, timeStr: string): Date | null {
  if (!timeStr || timeStr.length !== 5) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return setMinutes(setHours(date, hours), minutes);
}

function calculateDayMinutes(entry: DayEntry): number {
  const debut = parseTimeToDate(new Date(), entry.debut);
  const pause = parseTimeToDate(new Date(), entry.pause);
  const reprise = parseTimeToDate(new Date(), entry.reprise);
  const fin = parseTimeToDate(new Date(), entry.fin);

  if (!debut || !fin) return 0;

  let totalMs = fin.getTime() - debut.getTime();

  if (pause && reprise) {
    totalMs -= (reprise.getTime() - pause.getTime());
  }

  return Math.max(0, Math.round(totalMs / 60000));
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function WeeklyTimeEntry({ weekStart, existingDays, onSaved }: WeeklyTimeEntryProps) {
  const bulkCreate = useBulkCreateTimeEvents();
  const deleteDay = useDeleteDayEvents();

  // Initialize entries from existing data
  const initEntries = (): Record<number, DayEntry> => {
    const entries: Record<number, DayEntry> = {};
    for (let i = 0; i < 5; i++) {
      const dayDate = format(addDays(weekStart, i), 'yyyy-MM-dd');
      const existing = existingDays.find(d => d.date === dayDate);
      
      if (existing && existing.events.length > 0) {
        const dayEvents = existing.events;
        entries[i] = {
          debut: dayEvents.find(e => e.event_type === 'start_day')
            ? format(new Date(dayEvents.find(e => e.event_type === 'start_day')!.occurred_at), 'HH:mm')
            : '',
          pause: dayEvents.find(e => e.event_type === 'start_break')
            ? format(new Date(dayEvents.find(e => e.event_type === 'start_break')!.occurred_at), 'HH:mm')
            : '',
          reprise: dayEvents.find(e => e.event_type === 'end_break')
            ? format(new Date(dayEvents.find(e => e.event_type === 'end_break')!.occurred_at), 'HH:mm')
            : '',
          fin: dayEvents.find(e => e.event_type === 'end_day')
            ? format(new Date(dayEvents.find(e => e.event_type === 'end_day')!.occurred_at), 'HH:mm')
            : '',
        };
      } else {
        entries[i] = { debut: '', pause: '', reprise: '', fin: '' };
      }
    }
    return entries;
  };

  const [entries, setEntries] = useState<Record<number, DayEntry>>(initEntries);
  const [saving, setSaving] = useState(false);

  const updateEntry = (dayIndex: number, field: keyof DayEntry, value: string) => {
    setEntries(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value }
    }));
  };

  const resetDay = (dayIndex: number) => {
    setEntries(prev => ({
      ...prev,
      [dayIndex]: { debut: '', pause: '', reprise: '', fin: '' }
    }));
  };

  const dayMinutes = DAYS.map((_, i) => calculateDayMinutes(entries[i]));
  const totalMinutes = dayMinutes.reduce((sum, m) => sum + m, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Process each day
      for (let i = 0; i < 5; i++) {
        const entry = entries[i];
        const dayDate = addDays(weekStart, i);
        
        // Skip empty days
        if (!entry.debut && !entry.fin) continue;

        // Delete existing events for this day
        await deleteDay.mutateAsync(dayDate);

        // Create new events
        const events: Array<{ eventType: TimeEventType; occurredAt: Date }> = [];

        if (entry.debut) {
          const time = parseTimeToDate(dayDate, entry.debut);
          if (time) events.push({ eventType: 'start_day', occurredAt: time });
        }
        if (entry.pause) {
          const time = parseTimeToDate(dayDate, entry.pause);
          if (time) events.push({ eventType: 'start_break', occurredAt: time });
        }
        if (entry.reprise) {
          const time = parseTimeToDate(dayDate, entry.reprise);
          if (time) events.push({ eventType: 'end_break', occurredAt: time });
        }
        if (entry.fin) {
          const time = parseTimeToDate(dayDate, entry.fin);
          if (time) events.push({ eventType: 'end_day', occurredAt: time });
        }

        if (events.length > 0) {
          await bulkCreate.mutateAsync(events);
        }
      }

      toast.success('Heures enregistrées');
      onSaved?.();
    } catch (error) {
      console.error('Error saving weekly time:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Saisie rapide de la semaine</span>
          <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Calculator className="h-4 w-4" />
            Total: <span className="font-semibold text-foreground">{formatMinutes(totalMinutes)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {/* Header */}
        <div 
          className="grid gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground min-w-[500px]"
          style={{ gridTemplateColumns: 'minmax(70px, 1fr) repeat(4, 70px) minmax(80px, auto)' }}
        >
          <div>Jour</div>
          <div>Début</div>
          <div>Pause</div>
          <div>Reprise</div>
          <div>Fin</div>
          <div className="text-right">Durée</div>
        </div>

        {/* Days */}
        <div className="divide-y divide-border min-w-[500px]">
          {DAYS.map((day, i) => {
            const dayDate = addDays(weekStart, i);
            const minutes = dayMinutes[i];
            
            return (
              <div 
                key={i} 
                className="grid gap-2 items-center px-4 py-3"
                style={{ gridTemplateColumns: 'minmax(70px, 1fr) repeat(4, 70px) minmax(80px, auto)' }}
              >
                <div>
                  <div className="text-sm font-medium">{day}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(dayDate, 'd MMM', { locale: fr })}
                  </div>
                </div>
                <Input
                  type="time"
                  value={entries[i].debut}
                  onChange={(e) => updateEntry(i, 'debut', e.target.value)}
                  className="h-8 text-xs px-2"
                />
                <Input
                  type="time"
                  value={entries[i].pause}
                  onChange={(e) => updateEntry(i, 'pause', e.target.value)}
                  className="h-8 text-xs px-2"
                />
                <Input
                  type="time"
                  value={entries[i].reprise}
                  onChange={(e) => updateEntry(i, 'reprise', e.target.value)}
                  className="h-8 text-xs px-2"
                />
                <Input
                  type="time"
                  value={entries[i].fin}
                  onChange={(e) => updateEntry(i, 'fin', e.target.value)}
                  className="h-8 text-xs px-2"
                />
                <div className="flex items-center justify-end gap-1">
                  <span className={cn(
                    "text-sm font-medium tabular-nums whitespace-nowrap",
                    minutes > 0 ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {minutes > 0 ? formatMinutes(minutes) : '-'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => resetDay(i)}
                    title="Réinitialiser"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save button */}
        <div className="p-4 border-t bg-muted/30">
          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={saving || totalMinutes === 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer les heures
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
