import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Coffee, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
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
  
  const [confirmDialog, setConfirmDialog] = useState<TimeEventType | null>(null);

  const timeState = deriveTimeState(events);
  const isLoading = profileLoading || eventsLoading;

  const handleCreateEvent = async (eventType: TimeEventType) => {
    try {
      await createEvent.mutateAsync({ eventType });
      toast.success(EVENT_LABELS[eventType] + ' enregistré');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    }
    setConfirmDialog(null);
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

      {/* Status card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <Badge className={cn('text-sm px-4 py-1', statusColors[timeState.status])}>
              {statusLabels[timeState.status]}
            </Badge>
            
            <div className="text-4xl font-bold tabular-nums">
              {format(new Date(), 'HH:mm')}
            </div>

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

      {/* Confirmation dialog */}
      <AlertDialog 
        open={confirmDialog !== null} 
        onOpenChange={() => setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le pointage</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous enregistrer "{confirmDialog && EVENT_LABELS[confirmDialog]}" à {format(new Date(), 'HH:mm')} ?
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
    </div>
  );
}
