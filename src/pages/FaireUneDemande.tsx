/**
 * Page Faire une demande RH
 * Permet aux employés de créer et suivre leurs demandes de documents RH
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Send, Plus, Check, Download, FileText, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { useMyDocumentRequests } from '@/hooks/useDocumentRequests';
import { 
  DOCUMENT_REQUEST_TYPES, 
  DOCUMENT_REQUEST_STATUS_LABELS,
  type DocumentRequestType,
  type DocumentRequestStatus 
} from '@/types/documentRequest';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMyDocuments } from '@/hooks/useCollaboratorDocuments';

const STATUS_BADGE_VARIANTS: Record<DocumentRequestStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  REJECTED: 'destructive',
};

const STATUS_ICONS: Record<DocumentRequestStatus, typeof Clock> = {
  PENDING: Clock,
  IN_PROGRESS: Loader2,
  COMPLETED: CheckCircle,
  REJECTED: XCircle,
};

export default function FaireUneDemande() {
  const { downloadDocument } = useMyDocuments();
  const { 
    requests, 
    isLoading, 
    error, 
    createRequest,
    markAsSeen,
    unreadCount 
  } = useMyDocumentRequests();

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestType, setRequestType] = useState<DocumentRequestType>('ATTESTATION_EMPLOYEUR');
  const [description, setDescription] = useState('');

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  const handleCreateRequest = async () => {
    await createRequest.mutateAsync({
      request_type: requestType,
      description: description || undefined,
    });
    setDescription('');
    setShowRequestDialog(false);
  };

  const handleMarkAsSeen = async (requestId: string) => {
    await markAsSeen.mutateAsync(requestId);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton nouvelle demande */}
      <Card className="border-l-4 border-l-helpconfort-orange bg-gradient-to-br from-helpconfort-orange/5 via-background to-background">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-helpconfort-orange" />
            Faire une demande RH
          </CardTitle>
          <Button onClick={() => setShowRequestDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Demandez ici vos documents RH : attestations, duplicatas de bulletins de salaire, etc.
            Votre responsable RH sera notifié et traitera votre demande dans les meilleurs délais.
          </p>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Mes demandes
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
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
              <Send className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Aucune demande pour l'instant</p>
              <p className="text-sm mt-2">
                Cliquez sur "Nouvelle demande" pour demander un document RH.
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
                      req.is_unread 
                        ? 'bg-helpconfort-orange/5 border-helpconfort-orange/30' 
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-full ${
                        req.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                        req.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        <StatusIcon className={`h-4 w-4 ${req.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={req.is_unread ? 'font-semibold' : 'font-medium'}>
                            {DOCUMENT_REQUEST_TYPES.find((t) => t.value === req.request_type)?.label}
                          </span>
                          {req.is_unread && (
                            <Badge variant="default" className="bg-helpconfort-orange text-white text-[10px] px-1.5">
                              Nouveau
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Demandé le {formatDate(req.requested_at)}
                        </div>
                        {req.description && (
                          <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {req.description}
                          </div>
                        )}
                        {req.response_note && (
                          <div className="mt-3 text-sm bg-muted p-3 rounded-md">
                            <span className="font-semibold text-foreground">Réponse RH : </span>
                            {req.response_note}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <Badge variant={STATUS_BADGE_VARIANTS[req.status]}>
                        {DOCUMENT_REQUEST_STATUS_LABELS[req.status]}
                      </Badge>
                      {req.response_document && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (req.response_document) {
                              downloadDocument(req.response_document);
                            }
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Document
                        </Button>
                      )}
                      {req.is_unread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleMarkAsSeen(req.id)}
                          disabled={markAsSeen.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Marquer lu
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog création de demande */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle demande de document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type de document</label>
              <Select
                value={requestType}
                onValueChange={(v) => setRequestType(v as DocumentRequestType)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {DOCUMENT_REQUEST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Précisions (optionnel)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Précisez votre besoin, période concernée…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? 'Envoi…' : 'Envoyer la demande'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
