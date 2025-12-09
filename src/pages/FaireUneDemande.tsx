/**
 * Page Demande de congé
 * Wizard simplifié pour demander des congés/absences
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, Eye, Upload
} from 'lucide-react';
import { useMyLeaveRequests, useUpdateLeaveRequest } from '@/hooks/useLeaveRequests';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LEAVE_TYPE_LABELS, 
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_COLORS,
  EVENT_SUBTYPE_LABELS,
  type LeaveStatus,
  type LeaveType
} from '@/types/leaveRequest';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LeaveRequestWizard } from '@/components/leave/LeaveRequestWizard';
import { JustificationUpload } from '@/components/leave/JustificationUpload';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';

const STATUS_ICONS: Record<LeaveStatus, typeof Clock> = {
  DRAFT: Clock,
  PENDING_MANAGER: Clock,
  PENDING_JUSTIFICATIVE: AlertCircle,
  ACKNOWLEDGED: Eye,
  APPROVED: CheckCircle,
  REFUSED: XCircle,
  CLOSED: CheckCircle,
};

export default function FaireUneDemande() {
  const { data: requests = [], isLoading, error } = useMyLeaveRequests();
  const updateMutation = useUpdateLeaveRequest();
  const [showWizard, setShowWizard] = useState(false);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  // Compter les demandes en attente de justificatif
  const pendingJustificativeCount = requests.filter(r => r.status === 'PENDING_JUSTIFICATIVE').length;

  // Callback pour quand un justificatif est uploadé
  const handleJustificationUploaded = async (leaveRequestId: string, documentId: string) => {
    await updateMutation.mutateAsync({
      id: leaveRequestId,
      justification_document_id: documentId,
      status: 'ACKNOWLEDGED', // Mark as acknowledged after justification uploaded
    });
    setUploadingForId(null);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Faire une demande"
        subtitle="Demandez un congé, une absence ou un document"
        backTo={ROUTES.rh.index}
        backLabel="Espace RH"
      />
      {/* Bouton principal */}
      <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-helpconfort-blue" />
            Demande de congé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Faites une demande de congés payés, sans solde, événement familial ou maladie.
            Votre responsable sera notifié automatiquement.
          </p>
          <Button 
            onClick={() => setShowWizard(true)}
            className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Demande de congés
          </Button>
        </CardContent>
      </Card>

      {/* Alerte justificatif requis */}
      {pendingJustificativeCount > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  {pendingJustificativeCount} demande{pendingJustificativeCount > 1 ? 's' : ''} en attente de justificatif
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Veuillez fournir les documents demandés pour finaliser vos demandes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des demandes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Mes demandes de congés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-destructive mb-4">
              Une erreur est survenue lors du chargement de vos demandes.
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Aucune demande pour l'instant</p>
              <p className="text-sm mt-2">
                Cliquez sur "Demande de congés" pour créer votre première demande.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const StatusIcon = STATUS_ICONS[req.status];
                return (
                  <div
                    key={req.id}
                    className={`flex items-start justify-between rounded-lg border p-4 transition-colors ${
                      req.status === 'PENDING_JUSTIFICATIVE' 
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' 
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-full ${
                        req.status === 'APPROVED' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                        req.status === 'REFUSED' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                        req.status === 'PENDING_JUSTIFICATIVE' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                        req.status === 'ACKNOWLEDGED' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {LEAVE_TYPE_LABELS[req.type]}
                            {req.event_subtype && ` - ${EVENT_SUBTYPE_LABELS[req.event_subtype]}`}
                          </span>
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
                        {req.manager_comment && (
                          <div className="mt-3 text-sm bg-muted p-3 rounded-md">
                            <span className="font-semibold text-foreground">Commentaire : </span>
                            {req.manager_comment}
                          </div>
                        )}
                        {req.refusal_reason && (
                          <div className="mt-3 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-red-700 dark:text-red-400">
                            <span className="font-semibold">Motif du refus : </span>
                            {req.refusal_reason}
                          </div>
                        )}
                        
                        {/* Upload justificatif si nécessaire */}
                        {req.status === 'PENDING_JUSTIFICATIVE' && !req.justification_document_id && (
                          <div className="mt-4">
                            {uploadingForId === req.id ? (
                              <JustificationUpload
                                leaveRequestId={req.id}
                                leaveType={req.type as LeaveType}
                                collaboratorId={req.collaborator_id}
                                agencyId={req.agency_id}
                                onUploadComplete={(docId) => handleJustificationUploaded(req.id, docId)}
                              />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUploadingForId(req.id)}
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Ajouter le justificatif
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <Badge className={LEAVE_STATUS_COLORS[req.status]}>
                        {LEAVE_STATUS_LABELS[req.status]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wizard */}
      <LeaveRequestWizard open={showWizard} onOpenChange={setShowWizard} />
    </div>
  );
}
