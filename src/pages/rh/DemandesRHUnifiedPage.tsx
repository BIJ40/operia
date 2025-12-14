/**
 * Page N2 unifiée pour traiter TOUTES les demandes RH (EPI, congés, documents)
 * Source de vérité: table rh_requests
 */
import { useState, useMemo } from 'react';
import { 
  useAgencyRequests, 
  useApproveRequest, 
  useRejectRequest,
  type RHRequestWithEmployee,
  type RequestStatus,
  type RequestType,
} from '@/hooks/rh-backoffice';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Inbox, Check, X, User, Calendar, FileText, HardHat } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const REQUEST_TYPE_LABELS: Record<RequestType, { label: string; icon: typeof Calendar }> = {
  LEAVE: { label: 'Congés', icon: Calendar },
  EPI_RENEWAL: { label: 'Renouvellement EPI', icon: HardHat },
  DOCUMENT: { label: 'Document', icon: FileText },
  OTHER: { label: 'Autre', icon: FileText },
};

const STATUS_BADGE_VARIANTS: Record<RequestStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  DRAFT: 'outline',
  SUBMITTED: 'default',
  APPROVED: 'secondary',
  REJECTED: 'destructive',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
};

export default function DemandesRHUnifiedPage() {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('SUBMITTED');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'ALL'>('ALL');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  // Fetch requests from rh_requests table
  const { data: requests = [], isLoading, error } = useAgencyRequests({
    status: statusFilter !== 'ALL' ? [statusFilter] : undefined,
    request_type: typeFilter !== 'ALL' ? [typeFilter] : undefined,
  });

  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  // Fetch collaborator names
  const employeeIds = useMemo(() => [...new Set(requests.map(r => r.employee_user_id))], [requests]);
  
  const { data: collaborators = {} } = useQuery({
    queryKey: ['collaborators-for-rh-requests', employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, user_id, first_name, last_name')
        .in('user_id', employeeIds);
      
      if (error) throw error;
      
      return (data || []).reduce((acc, c) => {
        if (c.user_id) {
          acc[c.user_id] = `${c.first_name} ${c.last_name}`;
        }
        return acc;
      }, {} as Record<string, string>);
    },
    enabled: employeeIds.length > 0,
  });

  const currentRequest = requests.find(r => r.id === selectedRequestId);

  const formatDate = (date: string) => {
    return format(new Date(date), "dd MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const formatPayload = (request: RHRequestWithEmployee) => {
    const payload = request.payload || {};
    
    if (request.request_type === 'LEAVE') {
      const startDate = payload.start_date ? format(new Date(payload.start_date as string), 'dd/MM/yyyy') : '?';
      const endDate = payload.end_date ? format(new Date(payload.end_date as string), 'dd/MM/yyyy') : '?';
      return `Du ${startDate} au ${endDate}`;
    }
    
    if (request.request_type === 'EPI_RENEWAL') {
      const items = payload.items as string[] || [];
      return items.length > 0 ? items.join(', ') : 'EPI à renouveler';
    }
    
    return payload.description as string || '-';
  };

  const handleApprove = async () => {
    if (!currentRequest) return;
    await approveMutation.mutateAsync({ requestId: currentRequest.id });
    setSelectedRequestId(null);
  };

  const handleReject = async () => {
    if (!currentRequest || !rejectComment.trim()) return;
    await rejectMutation.mutateAsync({ requestId: currentRequest.id, comment: rejectComment });
    setSelectedRequestId(null);
    setRejectComment('');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Demandes RH"
        subtitle="Gérez toutes les demandes de vos collaborateurs (congés, EPI, documents)"
        backTo={ROUTES.rh.index}
        backLabel="Espace RH"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Demandes en cours ({requests.length})
          </CardTitle>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Type</span>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as RequestType | 'ALL')}>
                <SelectTrigger className="h-8 w-[150px] text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="LEAVE">Congés</SelectItem>
                  <SelectItem value="EPI_RENEWAL">EPI</SelectItem>
                  <SelectItem value="DOCUMENT">Documents</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Statut</span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | 'ALL')}>
                <SelectTrigger className="h-8 w-[150px] text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="SUBMITTED">En attente</SelectItem>
                  <SelectItem value="APPROVED">Approuvés</SelectItem>
                  <SelectItem value="REJECTED">Refusés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="text-sm text-destructive mb-4">
              Erreur lors du chargement des demandes.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Liste des demandes */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {requests.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Aucune demande pour ces filtres.
                </div>
              ) : (
                requests.map((req) => {
                  const typeInfo = REQUEST_TYPE_LABELS[req.request_type];
                  const TypeIcon = typeInfo.icon;
                  const employeeName = collaborators[req.employee_user_id] || 'Collaborateur';

                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setSelectedRequestId(req.id)}
                      className={`w-full rounded-md border px-3 py-3 text-left text-sm transition ${
                        selectedRequestId === req.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {employeeName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <TypeIcon className="h-3 w-3" />
                            {typeInfo.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatPayload(req)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatDate(req.created_at)}
                          </div>
                        </div>
                        <Badge variant={STATUS_BADGE_VARIANTS[req.status]}>
                          {STATUS_LABELS[req.status]}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Panneau de traitement */}
            <div className="border-l pl-4 space-y-4 hidden lg:block">
              {!currentRequest ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Sélectionnez une demande pour la traiter.
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Demandeur</div>
                      <div className="text-sm font-medium flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-primary" />
                        {collaborators[currentRequest.employee_user_id] || 'Collaborateur'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Type de demande</div>
                      <div className="text-sm font-medium mt-1">
                        {REQUEST_TYPE_LABELS[currentRequest.request_type].label}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Détails</div>
                      <div className="text-sm mt-1">{formatPayload(currentRequest)}</div>
                    </div>

                    {currentRequest.payload?.description && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground">Commentaire</div>
                        <div className="text-sm mt-1 text-muted-foreground">
                          {currentRequest.payload.description as string}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Date de demande</div>
                      <div className="text-sm mt-1">{formatDate(currentRequest.created_at)}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Statut actuel</div>
                      <Badge variant={STATUS_BADGE_VARIANTS[currentRequest.status]} className="mt-1">
                        {STATUS_LABELS[currentRequest.status]}
                      </Badge>
                    </div>
                  </div>

                  {currentRequest.status === 'SUBMITTED' && (
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={handleApprove}
                          disabled={approveMutation.isPending}
                          className="flex-1"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Approuver
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Motif de refus (si refus)</Label>
                        <Textarea
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          placeholder="Expliquez le motif du refus..."
                          rows={2}
                        />
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={rejectMutation.isPending || !rejectComment.trim()}
                          className="w-full"
                        >
                          {rejectMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <X className="h-4 w-4 mr-2" />
                          )}
                          Refuser
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentRequest.status !== 'SUBMITTED' && currentRequest.decision_comment && (
                    <div className="pt-4 border-t">
                      <div className="text-xs font-semibold text-muted-foreground">Commentaire de décision</div>
                      <div className="text-sm mt-1">{currentRequest.decision_comment}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
