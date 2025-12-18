import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, setHours, setMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, Loader2, RotateCcw, Calculator, Send, Lock, CheckCircle, AlertTriangle, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBulkCreateTimeEvents, useDeleteDayEvents, type TimeEventType } from '@/hooks/technician/useTimeEvents';
import { useSaveTimesheet, useSubmitTimesheet, useWeekTimesheet, useCountersignTimesheet, type DayEntry, type TimesheetStatus } from '@/hooks/technician/useTimesheets';
import { cn } from '@/lib/utils';

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
  const fin = parseTimeToDate(new Date(), entry.fin);

  if (!debut || !fin) return 0;

  let totalMs = fin.getTime() - debut.getTime();

  const pause = parseTimeToDate(new Date(), entry.pause);
  const reprise = parseTimeToDate(new Date(), entry.reprise);

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

function getStatusBadge(status: TimesheetStatus) {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="secondary">Brouillon</Badge>;
    case 'SUBMITTED':
      return <Badge variant="default" className="bg-blue-500">En attente validation</Badge>;
    case 'N2_MODIFIED':
      return <Badge variant="destructive" className="bg-orange-500">Modifié par N2 - À contre-signer</Badge>;
    case 'COUNTERSIGNED':
      return <Badge variant="default" className="bg-purple-500">Contre-signé</Badge>;
    case 'VALIDATED':
      return <Badge variant="default" className="bg-green-500">Validé</Badge>;
    default:
      return null;
  }
}

export function WeeklyTimeEntry({ weekStart, existingDays, onSaved }: WeeklyTimeEntryProps) {
  const bulkCreate = useBulkCreateTimeEvents();
  const deleteDay = useDeleteDayEvents();
  const saveTimesheet = useSaveTimesheet();
  const submitTimesheet = useSubmitTimesheet();
  const countersignTimesheet = useCountersignTimesheet();
  
  const weekStartNormalized = startOfWeek(weekStart, { weekStartsOn: 1 });
  const { data: timesheet, isLoading: loadingTimesheet } = useWeekTimesheet(weekStartNormalized);

  // Initialize entries from existing data or timesheet
  const initEntries = (): Record<number, DayEntry> => {
    const entries: Record<number, DayEntry> = {};
    
    // If timesheet exists with entries_original, use that
    if (timesheet?.entries_original && timesheet.entries_original.length > 0) {
      for (let i = 0; i < 5; i++) {
        entries[i] = timesheet.entries_original[i] || { debut: '', pause: '', reprise: '', fin: '', minutes: 0 };
      }
      return entries;
    }
    
    // Otherwise use existing days from time_events
    for (let i = 0; i < 5; i++) {
      const dayDate = format(addDays(weekStartNormalized, i), 'yyyy-MM-dd');
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
          minutes: existing.totalMinutes,
        };
      } else {
        entries[i] = { debut: '', pause: '', reprise: '', fin: '', minutes: 0 };
      }
    }
    return entries;
  };

  const [entries, setEntries] = useState<Record<number, DayEntry>>(initEntries);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Update entries when timesheet loads
  useEffect(() => {
    if (timesheet?.entries_original && timesheet.entries_original.length > 0) {
      const newEntries: Record<number, DayEntry> = {};
      for (let i = 0; i < 5; i++) {
        newEntries[i] = timesheet.entries_original[i] || { debut: '', pause: '', reprise: '', fin: '', minutes: 0 };
      }
      setEntries(newEntries);
    }
  }, [timesheet?.id]);

  const status = timesheet?.status || 'DRAFT';
  const isLocked = status !== 'DRAFT';
  const needsCountersign = status === 'N2_MODIFIED';
  const isValidated = status === 'VALIDATED';

  const updateEntry = (dayIndex: number, field: keyof DayEntry, value: string) => {
    if (isLocked) return;
    setEntries(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value }
    }));
  };

  const resetDay = (dayIndex: number) => {
    if (isLocked) return;
    setEntries(prev => ({
      ...prev,
      [dayIndex]: { debut: '', pause: '', reprise: '', fin: '', minutes: 0 }
    }));
  };

  const dayMinutes = DAYS.map((_, i) => calculateDayMinutes(entries[i]));
  const totalMinutes = dayMinutes.reduce((sum, m) => sum + m, 0);

  // Get modified entries for comparison (if N2 modified)
  const modifiedEntries = timesheet?.entries_modified;
  const modifiedDayMinutes = modifiedEntries 
    ? DAYS.map((_, i) => modifiedEntries[i]?.minutes || 0)
    : null;
  const modifiedTotalMinutes = timesheet?.total_minutes_modified;

  const handleSave = async () => {
    if (isLocked) return;
    setSaving(true);
    try {
      // Save time events
      for (let i = 0; i < 5; i++) {
        const entry = entries[i];
        const dayDate = addDays(weekStartNormalized, i);
        
        if (!entry.debut && !entry.fin) continue;

        await deleteDay.mutateAsync(dayDate);

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

      // Save to timesheet
      const entriesArray = DAYS.map((_, i) => ({
        ...entries[i],
        minutes: dayMinutes[i]
      }));

      await saveTimesheet.mutateAsync({
        weekStart: weekStartNormalized,
        entries: entriesArray,
        totalMinutes,
      });

      toast.success('Heures enregistrées');
      onSaved?.();
    } catch (error) {
      console.error('Error saving weekly time:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isLocked) return;
    setSubmitting(true);
    try {
      const entriesArray = DAYS.map((_, i) => ({
        ...entries[i],
        minutes: dayMinutes[i]
      }));

      await submitTimesheet.mutateAsync({
        weekStart: weekStartNormalized,
        entries: entriesArray,
        totalMinutes,
      });

      toast.success('Feuille de temps soumise pour validation');
      onSaved?.();
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCountersign = async () => {
    if (!timesheet?.id || !needsCountersign) return;
    try {
      await countersignTimesheet.mutateAsync({ timesheetId: timesheet.id });
      toast.success('Contre-signature effectuée');
      onSaved?.();
    } catch (error) {
      console.error('Error countersigning:', error);
      toast.error('Erreur lors de la contre-signature');
    }
  };

  if (loadingTimesheet) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>Saisie heures semaine</span>
            {getStatusBadge(status)}
            {isLocked && !needsCountersign && <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total:</span>
            <span className={cn(
              "font-semibold",
              modifiedTotalMinutes && modifiedTotalMinutes !== totalMinutes 
                ? "text-destructive line-through" 
                : "text-foreground"
            )}>
              {formatMinutes(totalMinutes)}
            </span>
            {modifiedTotalMinutes && modifiedTotalMinutes !== totalMinutes && (
              <span className="font-semibold text-destructive">
                → {formatMinutes(modifiedTotalMinutes)}
              </span>
            )}
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
            const dayDate = addDays(weekStartNormalized, i);
            const minutes = dayMinutes[i];
            const modifiedMinutes = modifiedDayMinutes?.[i];
            const isModified = modifiedMinutes !== undefined && modifiedMinutes !== minutes;
            
            return (
              <div 
                key={i} 
                className={cn(
                  "grid gap-2 items-center px-4 py-3",
                  isModified && "bg-destructive/5"
                )}
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
                  className={cn("h-8 text-xs px-2", isLocked && "opacity-60")}
                  disabled={isLocked}
                />
                <Input
                  type="time"
                  value={entries[i].pause}
                  onChange={(e) => updateEntry(i, 'pause', e.target.value)}
                  className={cn("h-8 text-xs px-2", isLocked && "opacity-60")}
                  disabled={isLocked}
                />
                <Input
                  type="time"
                  value={entries[i].reprise}
                  onChange={(e) => updateEntry(i, 'reprise', e.target.value)}
                  className={cn("h-8 text-xs px-2", isLocked && "opacity-60")}
                  disabled={isLocked}
                />
                <Input
                  type="time"
                  value={entries[i].fin}
                  onChange={(e) => updateEntry(i, 'fin', e.target.value)}
                  className={cn("h-8 text-xs px-2", isLocked && "opacity-60")}
                  disabled={isLocked}
                />
                <div className="flex items-center justify-end gap-1">
                  <span className={cn(
                    "text-sm font-medium tabular-nums whitespace-nowrap",
                    minutes > 0 ? "text-foreground" : "text-muted-foreground",
                    isModified && "line-through text-muted-foreground"
                  )}>
                    {minutes > 0 ? formatMinutes(minutes) : '-'}
                  </span>
                  {isModified && (
                    <span className="text-sm font-medium tabular-nums whitespace-nowrap text-destructive">
                      → {formatMinutes(modifiedMinutes)}
                    </span>
                  )}
                  {!isLocked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => resetDay(i)}
                      title="Réinitialiser"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-muted/30 space-y-3">
          {/* Status messages */}
          {needsCountersign && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-700 dark:text-orange-400">Modifications par le responsable</p>
                <p className="text-orange-600 dark:text-orange-500">Les heures en rouge ont été modifiées. Veuillez contre-signer pour accepter.</p>
              </div>
            </div>
          )}

          {isValidated && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">Feuille de temps validée</p>
            </div>
          )}

          {status === 'SUBMITTED' && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <FileCheck className="h-5 w-5 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">En attente de validation par votre responsable</p>
            </div>
          )}

          {status === 'COUNTERSIGNED' && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <FileCheck className="h-5 w-5 text-purple-500 shrink-0" />
              <p className="text-sm text-purple-700 dark:text-purple-400">Contre-signé - En attente de validation finale</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isLocked && (
              <>
                <Button 
                  variant="outline"
                  className="flex-1" 
                  onClick={handleSave}
                  disabled={saving || totalMinutes === 0}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSubmit}
                  disabled={submitting || totalMinutes === 0}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Soumettre
                </Button>
              </>
            )}

            {needsCountersign && (
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600" 
                onClick={handleCountersign}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Contre-signer et accepter
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
