/**
 * Page Gestion des congés (N2 - Dirigeant/RH)
 * Permet de valider/refuser les demandes de congés des collaborateurs
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Calendar, Check, X, Clock, AlertCircle, Eye, User, MessageSquare
} from 'lucide-react';
import { useAgencyLeaveRequests, useUpdateLeaveRequest } from '@/hooks/useLeaveRequests';
import { 
  LEAVE_TYPE_LABELS, 
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_COLORS,
  EVENT_SUBTYPE_LABELS,
  type LeaveStatus,
  type LeaveRequest
} from '@/types/leaveRequest';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STATUS_ICONS: Record<LeaveStatus, typeof Clock> = {
  DRAFT: Clock,
  PENDING_MANAGER: Clock,
  PENDING_JUSTIFICATIVE: AlertCircle,
  ACKNOWLEDGED: Eye,
  APPROVED: Check,
  REFUSED: X,
  CLOSED: Check,
};

interface LeaveRequestWithCollaborator extends LeaveRequest {
  collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export default function GestionConges() {
  const { data: requests = [], isLoading, error } = useAgencyLeaveRequests();
  const updateMutation = useUpdateLeaveRequest();
  
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithCollaborator | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'refuse' | 'acknowledge' | null>(null);
  const [comment, setComment] = useState('');
  const [refusalReason, setRefusalReason] = useState('');

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  // Filter requests by status
  const pendingRequests = (requests as LeaveRequestWithCollaborator[]).filter(
    r => r.status === 'PENDING_MANAGER'
  );
  const sicknessRequests = (requests as LeaveRequestWithCollaborator[]).filter(
    r => r.type === 'MALADIE' && r.status !== 'CLOSED'
  );
  const processedRequests = (requests as LeaveRequestWithCollaborator[]).filter(
    r => r.status === 'APPROVED' || r.status === 'REFUSED' || r.status === 'CLOSED'
  );

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    const updates: Record<string, unknown> = {};

    if (actionType === 'approve') {
      updates.status = 'APPROVED';
      updates.manager_comment = comment || null;
    } else if (actionType === 'refuse') {
      updates.status = 'REFUSED';
      updates.refusal_reason = refusalReason;
    } else if (actionType === 'acknowledge') {
      // For sickness: acknowledge and request justification
      updates.status = 'PENDING_JUSTIFICATIVE';
      updates.manager_comment = comment || 'Merci de fournir votre arrêt maladie.';
    }

    await updateMutation.mutateAsync({
      id: selectedRequest.id,
      ...updates,
    });

    setSelectedRequest(null);
    setActionType(null);
    setComment('');
    setRefusalReason('');
  };

  const openActionDialog = (request: LeaveRequestWithCollaborator, action: 'approve' | 'refuse' | 'acknowledge') => {
    setSelectedRequest(request);
    setActionType(action);
  };

  const renderRequestCard = (req: LeaveRequestWithCollaborator) => {
    const StatusIcon = STATUS_ICONS[req.status];
    const collaboratorName = req.collaborator 
      ? `${req.collaborator.first_name} ${req.collaborator.last_name}`
      : 'Collaborateur inconnu';

    return (
      <div
        key={req.id}
        className={`rounded-lg border p-4 transition-colors ${
          req.status === 'PENDING_MANAGER' 
            ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' 
            : 'bg-card'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-full ${
              req.status === 'APPROVED' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
              req.status === 'REFUSED' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
              req.status === 'PENDING_JUSTIFICATIVE' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
              'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              <StatusIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{collaboratorName}</span>
                <Badge variant="outline" className="text-xs">
                  {req.collaborator?.role || 'N/A'}
                </Badge>
              </div>
              <div className="mt-1 text-sm font-medium">
                {LEAVE_TYPE_LABELS[req.type]}
                {req.event_subtype && ` - ${EVENT_SUBTYPE_LABELS[req.event_subtype]}`}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {req.end_date ? (
                  <>
                    Du {formatDate(req.start_date)} au {formatDate(req.end_date)}
                    {req.days_count && (
                      <span className="ml-2 font-medium text-foreground">
                        ({req.days_count} jour{Number(req.days_count) > 1 ? 's' : ''})
                      </span>
                    )}
                  </>
                ) : (
                  <>À partir du {formatDate(req.start_date)}</>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Demandé le {formatDate(req.created_at)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            <Badge className={LEAVE_STATUS_COLORS[req.status]}>
              {LEAVE_STATUS_LABELS[req.status]}
            </Badge>
            
            {/* Actions for pending requests */}
            {req.status === 'PENDING_MANAGER' && req.type !== 'MALADIE' && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => openActionDialog(req, 'approve')}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Accepter
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => openActionDialog(req, 'refuse')}
                >
                  <X className="h-3 w-3 mr-1" />
                  Refuser
                </Button>
              </div>
            )}

            {/* Actions for sickness */}
            {req.status === 'PENDING_MANAGER' && req.type === 'MALADIE' && (
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50 mt-2"
                onClick={() => openActionDialog(req, 'acknowledge')}
              >
                <Eye className="h-3 w-3 mr-1" />
                J'ai pris connaissance
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-helpconfort-blue" />
            Gestion des congés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Validez ou refusez les demandes de congés de vos collaborateurs.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
              <Clock className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{sicknessRequests.length}</p>
                <p className="text-sm text-muted-foreground">Maladies en cours</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{processedRequests.length}</p>
                <p className="text-sm text-muted-foreground">Traitées</p>
              </div>
              <Check className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      {error && (
        <div className="text-sm text-destructive">
          Une erreur est survenue lors du chargement des demandes.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              En attente ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sickness" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Maladies ({sicknessRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <Check className="h-4 w-4" />
              Traitées ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucune demande en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(renderRequestCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sickness" className="mt-4">
            {sicknessRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucune maladie en cours</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sicknessRequests.map(renderRequestCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed" className="mt-4">
            {processedRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucune demande traitée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {processedRequests.map(renderRequestCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setComment('');
        setRefusalReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Accepter la demande'}
              {actionType === 'refuse' && 'Refuser la demande'}
              {actionType === 'acknowledge' && 'Prise en connaissance'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {LEAVE_TYPE_LABELS[selectedRequest.type]}
                  {selectedRequest.event_subtype && ` - ${EVENT_SUBTYPE_LABELS[selectedRequest.event_subtype]}`}
                  <br />
                  {selectedRequest.end_date ? (
                    <>Du {formatDate(selectedRequest.start_date)} au {formatDate(selectedRequest.end_date)}</>
                  ) : (
                    <>À partir du {formatDate(selectedRequest.start_date)}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'refuse' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Motif du refus *</label>
                <Textarea
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  placeholder="Indiquez le motif du refus..."
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Commentaire (optionnel)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={actionType === 'acknowledge' 
                    ? "Message pour le collaborateur (ex: merci de fournir votre arrêt maladie)"
                    : "Ajouter un commentaire..."
                  }
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null);
              setActionType(null);
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleAction}
              disabled={updateMutation.isPending || (actionType === 'refuse' && !refusalReason.trim())}
              className={
                actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                actionType === 'refuse' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {updateMutation.isPending ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
