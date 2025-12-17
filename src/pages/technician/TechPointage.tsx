import { useState, useEffect } from 'react';
import { format, setHours, setMinutes, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Coffee, 
  Loader2,
  CheckCircle2,
  Edit3,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  useTodayTimeEvents, 
  useCreateTimeEvent, 
  deriveTimeState,
  type TimeEventType 
} from '@/hooks/technician/useTimeEvents';
import { 
  useWeekTimesheet, 
  useWeekTimeEvents, 
  useSubmitTimesheet 
} from '@/hooks/technician/useTimesheets';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { WeeklyTimeEntry } from '@/components/technician/WeeklyTimeEntry';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EVENT_LABELS: Record<TimeEventType, string> = {
  start_day: 'Début journée',
  start_break: 'Début pause',
  end_break: 'Fin pause',
  end_day: 'Fin journée',
};

const EVENT_ICONS: Record<TimeEventType, typeof Play> = {
  start_day: Play,
  start_break: Coffee,
  end_break: Play,
  end_day: Square,
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export default function TechPointage() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();
  const { data: events = [], isLoading: eventsLoading } = useTodayTimeEvents();
  const createEvent = useCreateTimeEvent();
  
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
  const [confirmDialog, setConfirmDialog] = useState<TimeEventType | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualTime, setManualTime] = useState(format(new Date(), 'HH:mm'));
  const [currentTime, setCurrentTime] = useState(new Date());

  // Week view state
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [weekView, setWeekView] = useState<'summary' | 'entry'>('summary');

  const { data: timesheet, isLoading: timesheetLoading, refetch: refetchTimesheet } = useWeekTimesheet(selectedWeek);
  const { data: weekDays = [], isLoading: weekEventsLoading, refetch: refetchEvents } = useWeekTimeEvents(selectedWeek);
  const submitMutation = useSubmitTimesheet();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset manual time when toggling mode
  useEffect(() => {
    if (!manualMode) {
      setManualTime(format(new Date(), 'HH:mm'));
    }
  }, [manualMode]);

  const timeState = deriveTimeState(events);
  const isLoading = profileLoading || eventsLoading;
  const isWeekLoading = timesheetLoading || weekEventsLoading;

  const contractMinutes = profile?.work_profile?.weekly_contract_minutes || 2100;
  const totalMinutes = weekDays.reduce((sum, d) => sum + d.totalMinutes, 0);
  const overtimeMinutes = Math.max(0, totalMinutes - contractMinutes);
  const progress = Math.min(100, (totalMinutes / contractMinutes) * 100);

  const getOccurredAt = (): Date => {
    if (!manualMode) return new Date();
    const [hours, minutes] = manualTime.split(':').map(Number);
    return setMinutes(setHours(new Date(), hours), minutes);
  };

  const handleCreateEvent = async (eventType: TimeEventType) => {
    try {
      const occurredAt = getOccurredAt();
      await createEvent.mutateAsync({ 
        eventType, 
        occurredAt,
        source: manualMode ? 'manual' : 'mobile'
      });
      toast.success(EVENT_LABELS[eventType] + ' enregistré à ' + format(occurredAt, 'HH:mm'));
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    }
    setConfirmDialog(null);
  };

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync({
        weekStart: selectedWeek,
        days: weekDays,
      });
      toast.success('Feuille de temps soumise');
      setShowSubmitDialog(false);
    } catch {
      toast.error('Erreur lors de la soumission');
    }
  };

  const handleWeeklyEntrySaved = () => {
    refetchTimesheet();
    refetchEvents();
    setWeekView('summary');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun profil salarié configuré
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = {
    not_started: 'bg-muted text-muted-foreground',
    working: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    on_break: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    finished: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const statusLabels = {
    not_started: 'Non commencé',
    working: 'En cours',
    on_break: 'En pause',
    finished: 'Terminé',
  };

  const timesheetStatusConfig = {
    draft: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: AlertCircle },
    submitted: { label: 'Soumis', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
    approved: { label: 'Validé', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
    rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  };

  const displayTime = manualMode ? manualTime : format(currentTime, 'HH:mm');
  const status = timesheet?.status || 'draft';
  const StatusIcon = timesheetStatusConfig[status].icon;
  const canSubmit = status === 'draft' || status === 'rejected';

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Pointage
        </h1>
        <div className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE d MMMM', { locale: fr })}
        </div>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'week')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
          <TabsTrigger value="week">Ma semaine</TabsTrigger>
        </TabsList>

        {/* Today tab */}
        <TabsContent value="today" className="mt-4 space-y-4">
          {/* Manual mode toggle */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="manual-mode" className="text-sm">
                    Saisie manuelle
                  </Label>
                </div>
                <Switch
                  id="manual-mode"
                  checked={manualMode}
                  onCheckedChange={setManualMode}
                />
              </div>
              {manualMode && (
                <div className="mt-3 flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Heure :</Label>
                  <Input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <Badge className={cn('text-sm px-4 py-1', statusColors[timeState.status])}>
                  {statusLabels[timeState.status]}
                </Badge>
                
                <div className={cn(
                  "text-5xl font-bold tabular-nums transition-colors",
                  manualMode && "text-primary"
                )}>
                  {displayTime}
                </div>

                {manualMode && (
                  <div className="text-xs text-muted-foreground">
                    Mode saisie manuelle
                  </div>
                )}

                {timeState.status !== 'not_started' && (
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground">Travaillé</div>
                      <div className="font-semibold text-lg">
                        {formatMinutes(timeState.totalWorkedMinutes)}
                      </div>
                    </div>
                    {timeState.totalBreakMinutes > 0 && (
                      <div className="text-center">
                        <div className="text-muted-foreground">Pause</div>
                        <div className="font-semibold text-lg">
                          {formatMinutes(timeState.totalBreakMinutes)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeState.status === 'not_started' && (
                <Button
                  className="w-full h-14 text-lg"
                  onClick={() => setConfirmDialog('start_day')}
                  disabled={createEvent.isPending}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Début de journée
                </Button>
              )}

              {timeState.status === 'working' && (
                <>
                  <Button
                    variant="secondary"
                    className="w-full h-14 text-lg"
                    onClick={() => setConfirmDialog('start_break')}
                    disabled={createEvent.isPending}
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    Commencer une pause
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full h-14 text-lg"
                    onClick={() => setConfirmDialog('end_day')}
                    disabled={createEvent.isPending}
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Fin de journée
                  </Button>
                </>
              )}

              {timeState.status === 'on_break' && (
                <Button
                  className="w-full h-14 text-lg"
                  onClick={() => setConfirmDialog('end_break')}
                  disabled={createEvent.isPending}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Reprendre le travail
                </Button>
              )}

              {timeState.status === 'finished' && (
                <div className="flex flex-col items-center py-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                  <div className="font-medium">Journée terminée</div>
                  <div className="text-sm text-muted-foreground">
                    Total travaillé : {formatMinutes(timeState.totalWorkedMinutes)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Événements du jour</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Aucun pointage aujourd'hui
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => {
                    const Icon = EVENT_ICONS[event.event_type];
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {EVENT_LABELS[event.event_type]}
                          </span>
                          {event.source === 'manual' && (
                            <Badge variant="outline" className="text-xs">Manuel</Badge>
                          )}
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                          {format(new Date(event.occurred_at), 'HH:mm')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Week tab */}
        <TabsContent value="week" className="mt-4 space-y-4">
          {/* Week navigation */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="text-center">
                  <div className="font-medium text-sm">
                    Semaine du {format(selectedWeek, 'd MMMM yyyy', { locale: fr })}
                  </div>
                  <Badge className={cn('mt-1', timesheetStatusConfig[status].color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {timesheetStatusConfig[status].label}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {isWeekLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={weekView} onValueChange={(v) => setWeekView(v as 'summary' | 'entry')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Récapitulatif</TabsTrigger>
                <TabsTrigger value="entry" className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Saisie
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4 space-y-4">
                {/* Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Synthèse</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progression</span>
                        <span className="font-medium">
                          {formatMinutes(totalMinutes)} / {formatMinutes(contractMinutes)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/50 p-2">
                        <div className="text-lg font-bold">{formatMinutes(contractMinutes)}</div>
                        <div className="text-xs text-muted-foreground">Contrat</div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2">
                        <div className="text-lg font-bold">{formatMinutes(totalMinutes)}</div>
                        <div className="text-xs text-muted-foreground">Réalisé</div>
                      </div>
                      <div className={cn(
                        'rounded-lg p-2',
                        overtimeMinutes > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted/50'
                      )}>
                        <div className={cn(
                          'text-lg font-bold',
                          overtimeMinutes > 0 && 'text-amber-700 dark:text-amber-400'
                        )}>
                          {overtimeMinutes > 0 ? '+' : ''}{formatMinutes(overtimeMinutes)}
                        </div>
                        <div className="text-xs text-muted-foreground">H. sup.</div>
                      </div>
                    </div>

                    {timesheet?.rejection_comment && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                        <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                          Motif de rejet
                        </div>
                        <div className="text-sm text-red-600 dark:text-red-300">
                          {timesheet.rejection_comment}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Daily breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Détail par jour</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {weekDays.map((day) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between p-3"
                        >
                          <div>
                            <div className="text-sm font-medium capitalize">
                              {day.dayName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(day.date), 'd MMM', { locale: fr })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium tabular-nums">
                              {day.totalMinutes > 0 ? formatMinutes(day.totalMinutes) : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {day.events.length} évt.
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Submit button */}
                {canSubmit && (
                  <Button
                    className="w-full h-12"
                    onClick={() => setShowSubmitDialog(true)}
                    disabled={totalMinutes === 0}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Soumettre pour validation
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="entry" className="mt-4">
                <WeeklyTimeEntry 
                  weekStart={selectedWeek}
                  existingDays={weekDays}
                  onSaved={handleWeeklyEntrySaved}
                />
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation dialog */}
      <AlertDialog 
        open={confirmDialog !== null} 
        onOpenChange={() => setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le pointage</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous enregistrer "{confirmDialog && EVENT_LABELS[confirmDialog]}" à{' '}
              <span className="font-semibold">{format(getOccurredAt(), 'HH:mm')}</span> ?
              {manualMode && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  (Saisie manuelle)
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog && handleCreateEvent(confirmDialog)}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soumettre la feuille de temps</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de soumettre votre feuille de temps pour validation.
              <br /><br />
              <strong>Total : {formatMinutes(totalMinutes)}</strong>
              {overtimeMinutes > 0 && (
                <>
                  <br />
                  Dont <strong>{formatMinutes(overtimeMinutes)}</strong> heures supplémentaires potentielles
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Soumettre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
