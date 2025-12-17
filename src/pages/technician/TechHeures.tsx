import { useState } from 'react';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  useWeekTimesheet, 
  useWeekTimeEvents, 
  useSubmitTimesheet 
} from '@/hooks/technician/useTimesheets';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export default function TechHeures() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const { data: timesheet, isLoading: timesheetLoading } = useWeekTimesheet(selectedWeek);
  const { data: weekDays = [], isLoading: eventsLoading } = useWeekTimeEvents(selectedWeek);
  const submitMutation = useSubmitTimesheet();

  const isLoading = profileLoading || timesheetLoading || eventsLoading;

  const contractMinutes = profile?.work_profile?.weekly_contract_minutes || 2100;
  const totalMinutes = weekDays.reduce((sum, d) => sum + d.totalMinutes, 0);
  const overtimeMinutes = Math.max(0, totalMinutes - contractMinutes);
  const progress = Math.min(100, (totalMinutes / contractMinutes) * 100);

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

  const statusConfig = {
    draft: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: AlertCircle },
    submitted: { label: 'Soumis', color: 'bg-blue-100 text-blue-800', icon: Clock },
    approved: { label: 'Validé', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: XCircle },
  };

  const status = timesheet?.status || 'draft';
  const StatusIcon = statusConfig[status].icon;
  const canSubmit = status === 'draft' || status === 'rejected';

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Mes heures
        </h1>
      </div>

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
              <div className="font-medium">
                Semaine du {format(selectedWeek, 'd MMMM yyyy', { locale: fr })}
              </div>
              <Badge className={cn('mt-1', statusConfig[status].color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[status].label}
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

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-2xl font-bold">{formatMinutes(contractMinutes)}</div>
              <div className="text-xs text-muted-foreground">Contrat</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-2xl font-bold">{formatMinutes(totalMinutes)}</div>
              <div className="text-xs text-muted-foreground">Réalisé</div>
            </div>
            <div className={cn(
              'rounded-lg p-3',
              overtimeMinutes > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted/50'
            )}>
              <div className={cn(
                'text-2xl font-bold',
                overtimeMinutes > 0 && 'text-amber-700 dark:text-amber-400'
              )}>
                {overtimeMinutes > 0 ? '+' : ''}{formatMinutes(overtimeMinutes)}
              </div>
              <div className="text-xs text-muted-foreground">Heures sup.</div>
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
                    {day.events.length} événement(s)
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
