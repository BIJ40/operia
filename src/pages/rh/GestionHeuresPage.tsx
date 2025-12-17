import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, addWeeks, subWeeks, eachDayOfInterval, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  FileText,
  Loader2,
  User,
  Download,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Collaborator {
  id: string;
  first_name: string;
  last_name: string;
  type: string;
  work_profile?: {
    weekly_contract_minutes: number;
  };
}

interface Timesheet {
  id: string;
  collaborator_id: string;
  week_start: string;
  total_minutes: number;
  contract_minutes: number;
  overtime_minutes: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  computed: { days: Array<{ date: string; dayName: string; totalMinutes: number }> };
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_comment: string | null;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

const statusConfig = {
  draft: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: AlertCircle },
  submitted: { label: 'À valider', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: 'Validé', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function GestionHeuresPage() {
  const { user, agencyId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionComment, setRejectionComment] = useState('');

  const weekStartStr = format(selectedWeek, 'yyyy-MM-dd');

  // Fetch collaborators (technicians)
  const { data: collaborators = [] } = useQuery({
    queryKey: ['collaborators-technicians', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from('collaborators')
        .select(`
          id, first_name, last_name, type,
          collaborator_work_profiles(weekly_contract_minutes)
        `)
        .eq('agency_id', agencyId)
        .in('type', ['TECHNICIEN', 'COMMERCIAL'])
        .is('leaving_date', null);

      if (error) throw error;
      return (data || []).map(c => ({
        ...c,
        work_profile: c.collaborator_work_profiles?.[0]
      })) as Collaborator[];
    },
    enabled: !!agencyId,
  });

  // Fetch timesheets for the week
  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['timesheets-week', agencyId, weekStartStr],
    queryFn: async () => {
      if (!agencyId) return [];

      const collaboratorIds = collaborators.map(c => c.id);
      if (collaboratorIds.length === 0) return [];

      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .in('collaborator_id', collaboratorIds)
        .eq('week_start', weekStartStr);

      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        status: t.status as Timesheet['status'],
        computed: t.computed as Timesheet['computed']
      })) as Timesheet[];
    },
    enabled: !!agencyId && collaborators.length > 0,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', timesheetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets-week'] });
      toast.success('Feuille de temps validée');
      setShowDetailDialog(false);
    },
    onError: () => {
      toast.error('Erreur lors de la validation');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ timesheetId, comment }: { timesheetId: string; comment: string }) => {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
          rejection_comment: comment,
        })
        .eq('id', timesheetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets-week'] });
      toast.success('Feuille de temps rejetée');
      setShowRejectDialog(false);
      setShowDetailDialog(false);
      setRejectionComment('');
    },
    onError: () => {
      toast.error('Erreur lors du rejet');
    },
  });

  const pendingTimesheets = timesheets.filter(t => t.status === 'submitted');
  const displayTimesheets = activeTab === 'pending' ? pendingTimesheets : timesheets;

  const getCollaborator = (id: string) => collaborators.find(c => c.id === id);

  const openDetail = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setSelectedCollaborator(getCollaborator(timesheet.collaborator_id) || null);
    setShowDetailDialog(true);
  };

  const handleExportPDF = async (timesheet: Timesheet) => {
    // TODO: Implement PDF generation via edge function
    toast.info('Export PDF en cours de développement');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gestion des Heures"
        subtitle="Validation des feuilles de temps des techniciens"
        backTo="/rh/equipe"
        backLabel="Mon équipe"
      />

      {/* Week navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <div className="text-lg font-medium">
                Semaine du {format(selectedWeek, 'd MMMM yyyy', { locale: fr })}
              </div>
              {pendingTimesheets.length > 0 && (
                <Badge variant="secondary" className="mt-1">
                  {pendingTimesheets.length} à valider
                </Badge>
              )}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'all')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            À valider
            {pendingTimesheets.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">
                {pendingTimesheets.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Toutes les feuilles</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayTimesheets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {activeTab === 'pending' 
                  ? 'Aucune feuille de temps en attente de validation'
                  : 'Aucune feuille de temps pour cette semaine'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {displayTimesheets.map((timesheet) => {
                const collaborator = getCollaborator(timesheet.collaborator_id);
                if (!collaborator) return null;
                
                const StatusIcon = statusConfig[timesheet.status].icon;
                const progress = Math.min(100, (timesheet.total_minutes / timesheet.contract_minutes) * 100);

                return (
                  <Card 
                    key={timesheet.id} 
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-shadow",
                      timesheet.status === 'submitted' && "border-amber-200 dark:border-amber-800"
                    )}
                    onClick={() => openDetail(timesheet)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {collaborator.first_name} {collaborator.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {collaborator.type}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-semibold tabular-nums">
                              {formatMinutes(timesheet.total_minutes)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              sur {formatMinutes(timesheet.contract_minutes)}
                            </div>
                          </div>

                          <Badge className={cn('text-xs', statusConfig[timesheet.status].color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[timesheet.status].label}
                          </Badge>
                        </div>
                      </div>

                      <Progress value={progress} className="h-2 mt-3" />

                      {timesheet.overtime_minutes > 0 && (
                        <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                          +{formatMinutes(timesheet.overtime_minutes)} heures supplémentaires
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedCollaborator?.first_name} {selectedCollaborator?.last_name}
            </DialogTitle>
            <DialogDescription>
              Semaine du {format(selectedWeek, 'd MMMM yyyy', { locale: fr })}
            </DialogDescription>
          </DialogHeader>

          {selectedTimesheet && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xl font-bold">{formatMinutes(selectedTimesheet.contract_minutes)}</div>
                  <div className="text-xs text-muted-foreground">Contrat</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xl font-bold">{formatMinutes(selectedTimesheet.total_minutes)}</div>
                  <div className="text-xs text-muted-foreground">Réalisé</div>
                </div>
                <div className={cn(
                  'rounded-lg p-3',
                  selectedTimesheet.overtime_minutes > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted/50'
                )}>
                  <div className={cn(
                    'text-xl font-bold',
                    selectedTimesheet.overtime_minutes > 0 && 'text-amber-700 dark:text-amber-400'
                  )}>
                    {selectedTimesheet.overtime_minutes > 0 ? '+' : ''}{formatMinutes(selectedTimesheet.overtime_minutes)}
                  </div>
                  <div className="text-xs text-muted-foreground">Heures sup.</div>
                </div>
              </div>

              {/* Daily breakdown */}
              <div className="border rounded-lg">
                <div className="bg-muted/50 px-3 py-2 text-sm font-medium border-b">
                  Détail par jour
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="divide-y">
                    {selectedTimesheet.computed.days.map((day) => (
                      <div key={day.date} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <div className="text-sm font-medium capitalize">{day.dayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(day.date), 'd MMM', { locale: fr })}
                          </div>
                        </div>
                        <div className="font-medium tabular-nums">
                          {day.totalMinutes > 0 ? formatMinutes(day.totalMinutes) : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {selectedTimesheet.rejection_comment && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                  <div className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                    Motif de rejet précédent
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-300">
                    {selectedTimesheet.rejection_comment}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => selectedTimesheet && handleExportPDF(selectedTimesheet)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>

            {selectedTimesheet?.status === 'submitted' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
                <Button
                  onClick={() => selectedTimesheet && approveMutation.mutate(selectedTimesheet.id)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Valider
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter la feuille de temps</AlertDialogTitle>
            <AlertDialogDescription>
              Indiquez le motif du rejet. Le technicien pourra corriger et soumettre à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="rejection">Motif du rejet</Label>
            <Textarea
              id="rejection"
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Ex: Heures de pause manquantes pour le mardi..."
              className="mt-2"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTimesheet && rejectMutation.mutate({
                timesheetId: selectedTimesheet.id,
                comment: rejectionComment,
              })}
              disabled={!rejectionComment.trim() || rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Rejeter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
