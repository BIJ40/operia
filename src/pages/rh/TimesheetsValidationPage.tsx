import { useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Check, X, Edit2, Eye, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  useAgencyTimesheets,
  useValidateTimesheet,
  useFinalizeTimesheet,
  useRejectTimesheet,
  type AgencyTimesheet,
} from '@/hooks/rh/useAgencyTimesheets';
import type { DayEntry, TimesheetStatus } from '@/hooks/technician/useTimesheets';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<TimesheetStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  DRAFT: { label: 'Brouillon', variant: 'outline', color: 'text-muted-foreground' },
  SUBMITTED: { label: 'Soumis', variant: 'default', color: 'text-blue-600' },
  N2_MODIFIED: { label: 'Modifié N2', variant: 'destructive', color: 'text-orange-600' },
  COUNTERSIGNED: { label: 'Contre-signé', variant: 'secondary', color: 'text-purple-600' },
  VALIDATED: { label: 'Validé', variant: 'default', color: 'text-green-600' },
};

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function TimesheetCard({ 
  timesheet, 
  onView, 
  onValidate, 
  onFinalize, 
  onReject 
}: { 
  timesheet: AgencyTimesheet;
  onView: () => void;
  onValidate: () => void;
  onFinalize: () => void;
  onReject: () => void;
}) {
  const weekStart = parseISO(timesheet.week_start);
  const weekEnd = addDays(weekStart, 6);
  const statusConfig = STATUS_CONFIG[timesheet.status];
  
  const displayMinutes = timesheet.entries_modified 
    ? (timesheet.total_minutes_modified ?? timesheet.total_minutes)
    : timesheet.total_minutes;

  const hasModifications = timesheet.status === 'N2_MODIFIED';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {timesheet.collaborator?.first_name} {timesheet.collaborator?.last_name}
              </span>
              <Badge variant={statusConfig.variant} className="text-xs">
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Semaine du {format(weekStart, 'd MMM', { locale: fr })} au {format(weekEnd, 'd MMM yyyy', { locale: fr })}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className={cn("font-medium", hasModifications && "line-through text-muted-foreground")}>
                {formatMinutes(timesheet.total_minutes)}
              </span>
              {hasModifications && timesheet.total_minutes_modified && (
                <span className="font-medium text-destructive">
                  → {formatMinutes(timesheet.total_minutes_modified)}
                </span>
              )}
              <span className="text-muted-foreground">
                (contrat: {formatMinutes(timesheet.contract_minutes)})
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" />
              Voir
            </Button>
            
            {timesheet.status === 'SUBMITTED' && (
              <>
                <Button variant="default" size="sm" onClick={onValidate}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Valider
                </Button>
                <Button variant="destructive" size="sm" onClick={onReject}>
                  <X className="h-4 w-4 mr-1" />
                  Rejeter
                </Button>
              </>
            )}
            
            {timesheet.status === 'COUNTERSIGNED' && (
              <Button variant="default" size="sm" onClick={onFinalize}>
                <Check className="h-4 w-4 mr-1" />
                Finaliser
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationDialog({
  timesheet,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  timesheet: AgencyTimesheet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entries: DayEntry[], totalMinutes: number, comment?: string) => void;
  isLoading: boolean;
}) {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [comment, setComment] = useState('');

  // Initialize entries when dialog opens
  useState(() => {
    if (timesheet) {
      setEntries(timesheet.entries_original || []);
    }
  });

  if (!timesheet) return null;

  const weekStart = parseISO(timesheet.week_start);
  const originalEntries = timesheet.entries_original || [];

  const handleEntryChange = (dayIndex: number, field: keyof DayEntry, value: string) => {
    const newEntries = [...(entries.length ? entries : originalEntries)];
    if (!newEntries[dayIndex]) {
      newEntries[dayIndex] = { debut: '', pause: '', reprise: '', fin: '', minutes: 0 };
    }
    newEntries[dayIndex] = { ...newEntries[dayIndex], [field]: value };
    
    // Recalculate minutes for this day
    const entry = newEntries[dayIndex];
    if (entry.debut && entry.fin) {
      const [dh, dm] = entry.debut.split(':').map(Number);
      const [fh, fm] = entry.fin.split(':').map(Number);
      let minutes = (fh * 60 + fm) - (dh * 60 + dm);
      
      if (entry.pause && entry.reprise) {
        const [ph, pm] = entry.pause.split(':').map(Number);
        const [rh, rm] = entry.reprise.split(':').map(Number);
        minutes -= (rh * 60 + rm) - (ph * 60 + pm);
      }
      
      newEntries[dayIndex].minutes = Math.max(0, minutes);
    }
    
    setEntries(newEntries);
  };

  const currentEntries = entries.length ? entries : originalEntries;
  const totalMinutes = currentEntries.reduce((sum, e) => sum + (e?.minutes || 0), 0);

  const hasChanges = JSON.stringify(currentEntries) !== JSON.stringify(originalEntries);

  const handleSubmit = () => {
    onSubmit(currentEntries, totalMinutes, comment || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Validation - {timesheet.collaborator?.first_name} {timesheet.collaborator?.last_name}
          </DialogTitle>
          <DialogDescription>
            Semaine du {format(weekStart, 'd MMMM yyyy', { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entries table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Jour</th>
                  <th className="px-3 py-2 text-center font-medium">Début</th>
                  <th className="px-3 py-2 text-center font-medium">Pause</th>
                  <th className="px-3 py-2 text-center font-medium">Reprise</th>
                  <th className="px-3 py-2 text-center font-medium">Fin</th>
                  <th className="px-3 py-2 text-right font-medium">Durée</th>
                </tr>
              </thead>
              <tbody>
                {DAY_NAMES.map((dayName, i) => {
                  const original = originalEntries[i];
                  const current = currentEntries[i];
                  const isDifferent = current && original && JSON.stringify(current) !== JSON.stringify(original);

                  return (
                    <tr key={i} className={cn("border-t", isDifferent && "bg-destructive/5")}>
                      <td className="px-3 py-2 font-medium">{dayName}</td>
                      <td className="px-2 py-1">
                        <Input
                          type="time"
                          value={current?.debut || ''}
                          onChange={(e) => handleEntryChange(i, 'debut', e.target.value)}
                          className={cn(
                            "h-8 text-center",
                            isDifferent && current?.debut !== original?.debut && "border-destructive text-destructive"
                          )}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="time"
                          value={current?.pause || ''}
                          onChange={(e) => handleEntryChange(i, 'pause', e.target.value)}
                          className={cn(
                            "h-8 text-center",
                            isDifferent && current?.pause !== original?.pause && "border-destructive text-destructive"
                          )}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="time"
                          value={current?.reprise || ''}
                          onChange={(e) => handleEntryChange(i, 'reprise', e.target.value)}
                          className={cn(
                            "h-8 text-center",
                            isDifferent && current?.reprise !== original?.reprise && "border-destructive text-destructive"
                          )}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="time"
                          value={current?.fin || ''}
                          onChange={(e) => handleEntryChange(i, 'fin', e.target.value)}
                          className={cn(
                            "h-8 text-center",
                            isDifferent && current?.fin !== original?.fin && "border-destructive text-destructive"
                          )}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isDifferent && original?.minutes !== current?.minutes ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="line-through text-muted-foreground">
                              {formatMinutes(original?.minutes || 0)}
                            </span>
                            <span className="text-destructive font-medium">
                              {formatMinutes(current?.minutes || 0)}
                            </span>
                          </div>
                        ) : (
                          <span>{formatMinutes(current?.minutes || 0)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/50 font-medium">
                <tr className="border-t">
                  <td colSpan={5} className="px-3 py-2 text-right">Total semaine:</td>
                  <td className="px-3 py-2 text-right">
                    {hasChanges ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="line-through text-muted-foreground">
                          {formatMinutes(originalEntries.reduce((s, e) => s + (e?.minutes || 0), 0))}
                        </span>
                        <span className="text-destructive">{formatMinutes(totalMinutes)}</span>
                      </div>
                    ) : (
                      formatMinutes(totalMinutes)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Vous avez modifié les heures. Le technicien devra contre-signer ces modifications.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire de validation..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Validation...' : hasChanges ? 'Valider avec modifications' : 'Valider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  timesheet,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  timesheet: AgencyTimesheet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (comment: string) => void;
  isLoading: boolean;
}) {
  const [comment, setComment] = useState('');

  if (!timesheet) return null;

  const handleSubmit = () => {
    if (!comment.trim()) {
      toast.error('Un commentaire est requis pour rejeter');
      return;
    }
    onSubmit(comment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter la feuille de temps</DialogTitle>
          <DialogDescription>
            {timesheet.collaborator?.first_name} {timesheet.collaborator?.last_name} - 
            Semaine du {format(parseISO(timesheet.week_start), 'd MMMM yyyy', { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reject-comment">Motif du rejet *</Label>
          <Textarea
            id="reject-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Expliquez pourquoi la feuille est rejetée..."
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isLoading || !comment.trim()}>
            {isLoading ? 'Rejet...' : 'Rejeter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({
  timesheet,
  open,
  onOpenChange,
}: {
  timesheet: AgencyTimesheet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!timesheet) return null;

  const weekStart = parseISO(timesheet.week_start);
  const originalEntries = timesheet.entries_original || [];
  const modifiedEntries = timesheet.entries_modified;
  const hasModifications = !!modifiedEntries;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {timesheet.collaborator?.first_name} {timesheet.collaborator?.last_name}
          </DialogTitle>
          <DialogDescription>
            Semaine du {format(weekStart, 'd MMMM yyyy', { locale: fr })} - {STATUS_CONFIG[timesheet.status].label}
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Jour</th>
                <th className="px-3 py-2 text-center font-medium">Début</th>
                <th className="px-3 py-2 text-center font-medium">Pause</th>
                <th className="px-3 py-2 text-center font-medium">Reprise</th>
                <th className="px-3 py-2 text-center font-medium">Fin</th>
                <th className="px-3 py-2 text-right font-medium">Durée</th>
              </tr>
            </thead>
            <tbody>
              {DAY_NAMES.map((dayName, i) => {
                const original = originalEntries[i];
                const modified = modifiedEntries?.[i];
                const current = modified || original;
                const isDifferent = modified && JSON.stringify(modified) !== JSON.stringify(original);

                return (
                  <tr key={i} className={cn("border-t", isDifferent && "bg-destructive/5")}>
                    <td className="px-3 py-2 font-medium">{dayName}</td>
                    <td className="px-3 py-2 text-center">
                      {isDifferent && modified?.debut !== original?.debut ? (
                        <div>
                          <span className="line-through text-muted-foreground text-xs">{original?.debut || '-'}</span>
                          <span className="text-destructive ml-1">{modified?.debut || '-'}</span>
                        </div>
                      ) : (
                        current?.debut || '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isDifferent && modified?.pause !== original?.pause ? (
                        <div>
                          <span className="line-through text-muted-foreground text-xs">{original?.pause || '-'}</span>
                          <span className="text-destructive ml-1">{modified?.pause || '-'}</span>
                        </div>
                      ) : (
                        current?.pause || '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isDifferent && modified?.reprise !== original?.reprise ? (
                        <div>
                          <span className="line-through text-muted-foreground text-xs">{original?.reprise || '-'}</span>
                          <span className="text-destructive ml-1">{modified?.reprise || '-'}</span>
                        </div>
                      ) : (
                        current?.reprise || '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isDifferent && modified?.fin !== original?.fin ? (
                        <div>
                          <span className="line-through text-muted-foreground text-xs">{original?.fin || '-'}</span>
                          <span className="text-destructive ml-1">{modified?.fin || '-'}</span>
                        </div>
                      ) : (
                        current?.fin || '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isDifferent ? (
                        <div>
                          <span className="line-through text-muted-foreground text-xs">
                            {formatMinutes(original?.minutes || 0)}
                          </span>
                          <span className="text-destructive ml-1 font-medium">
                            {formatMinutes(modified?.minutes || 0)}
                          </span>
                        </div>
                      ) : (
                        formatMinutes(current?.minutes || 0)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50 font-medium">
              <tr className="border-t">
                <td colSpan={5} className="px-3 py-2 text-right">Total:</td>
                <td className="px-3 py-2 text-right">
                  {hasModifications ? (
                    <div>
                      <span className="line-through text-muted-foreground">
                        {formatMinutes(timesheet.total_minutes)}
                      </span>
                      <span className="text-destructive ml-2">
                        {formatMinutes(timesheet.total_minutes_modified || 0)}
                      </span>
                    </div>
                  ) : (
                    formatMinutes(timesheet.total_minutes)
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TimesheetsValidationPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'countersigned' | 'validated'>('pending');
  const [selectedTimesheet, setSelectedTimesheet] = useState<AgencyTimesheet | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'validate' | 'reject' | null>(null);

  const statusFilters: Record<string, TimesheetStatus[]> = {
    pending: ['SUBMITTED'],
    countersigned: ['COUNTERSIGNED', 'N2_MODIFIED'],
    validated: ['VALIDATED'],
  };

  const { data: timesheets, isLoading } = useAgencyTimesheets({
    status: statusFilters[activeTab],
  });

  const validateMutation = useValidateTimesheet();
  const finalizeMutation = useFinalizeTimesheet();
  const rejectMutation = useRejectTimesheet();

  const handleValidate = (entries: DayEntry[], totalMinutes: number, comment?: string) => {
    if (!selectedTimesheet) return;
    
    validateMutation.mutate(
      { timesheetId: selectedTimesheet.id, entries, totalMinutes, comment },
      {
        onSuccess: () => {
          toast.success('Feuille de temps validée');
          setDialogMode(null);
          setSelectedTimesheet(null);
        },
        onError: () => {
          toast.error('Erreur lors de la validation');
        },
      }
    );
  };

  const handleFinalize = (timesheet: AgencyTimesheet) => {
    finalizeMutation.mutate(
      { timesheetId: timesheet.id },
      {
        onSuccess: () => {
          toast.success('Feuille de temps finalisée');
        },
        onError: () => {
          toast.error('Erreur lors de la finalisation');
        },
      }
    );
  };

  const handleReject = (comment: string) => {
    if (!selectedTimesheet) return;
    
    rejectMutation.mutate(
      { timesheetId: selectedTimesheet.id, comment },
      {
        onSuccess: () => {
          toast.success('Feuille de temps rejetée');
          setDialogMode(null);
          setSelectedTimesheet(null);
        },
        onError: () => {
          toast.error('Erreur lors du rejet');
        },
      }
    );
  };

  const pendingCount = timesheets?.filter(t => t.status === 'SUBMITTED').length || 0;
  const countersignedCount = timesheets?.filter(t => ['COUNTERSIGNED', 'N2_MODIFIED'].includes(t.status)).length || 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Validation des Pointages"
        subtitle="Gérez les feuilles de temps de votre équipe"
        backTo="/rh"
        backLabel="RH"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Feuilles de temps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-2">
                À valider
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="countersigned" className="gap-2">
                En attente finalisation
                {countersignedCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {countersignedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="validated">Validées</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : timesheets && timesheets.length > 0 ? (
                timesheets.map((ts) => (
                  <TimesheetCard
                    key={ts.id}
                    timesheet={ts}
                    onView={() => {
                      setSelectedTimesheet(ts);
                      setDialogMode('view');
                    }}
                    onValidate={() => {
                      setSelectedTimesheet(ts);
                      setDialogMode('validate');
                    }}
                    onFinalize={() => handleFinalize(ts)}
                    onReject={() => {
                      setSelectedTimesheet(ts);
                      setDialogMode('reject');
                    }}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune feuille de temps dans cette catégorie</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ViewDialog
        timesheet={selectedTimesheet}
        open={dialogMode === 'view'}
        onOpenChange={(open) => !open && setDialogMode(null)}
      />

      <ValidationDialog
        timesheet={selectedTimesheet}
        open={dialogMode === 'validate'}
        onOpenChange={(open) => !open && setDialogMode(null)}
        onSubmit={handleValidate}
        isLoading={validateMutation.isPending}
      />

      <RejectDialog
        timesheet={selectedTimesheet}
        open={dialogMode === 'reject'}
        onOpenChange={(open) => !open && setDialogMode(null)}
        onSubmit={handleReject}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}
