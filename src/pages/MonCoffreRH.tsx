/**
 * Page Coffre-fort RH - Vue salarié
 * Permet aux employés de consulter leurs documents RH et demander des documents
 */

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Send, Plus, Bell, Eye, Check, FolderOpen, Download
} from 'lucide-react';
import { useMyDocuments } from '@/hooks/useCollaboratorDocuments';
import { useMyDocumentRequests } from '@/hooks/useDocumentRequests';
import { 
  DOCUMENT_REQUEST_TYPES, 
  DOCUMENT_REQUEST_STATUS_LABELS,
  type DocumentRequestType,
  type DocumentRequestStatus 
} from '@/types/documentRequest';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HRDocumentViewer } from '@/components/collaborators/documents';

const STATUS_BADGE_VARIANTS: Record<DocumentRequestStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  REJECTED: 'destructive',
};

export default function MonCoffreRH() {
  const queryClient = useQueryClient();
  const requestsRef = useRef<HTMLDivElement>(null);
  const { documents, isLoading, error, downloadDocument, getSignedUrl } = useMyDocuments();
  const { 
    requests, 
    isLoading: isLoadingRequests, 
    error: requestError, 
    createRequest,
    markAsSeen,
    unreadCount 
  } = useMyDocumentRequests();

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestType, setRequestType] = useState<DocumentRequestType>('ATTESTATION_EMPLOYEUR');
  const [description, setDescription] = useState('');

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['my-documents'] });
    queryClient.invalidateQueries({ queryKey: ['my-document-requests'] });
  };

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

  const scrollToRequests = async () => {
    // Marquer toutes les demandes non lues comme vues
    const unreadRequests = requests.filter(r => r.is_unread);
    for (const req of unreadRequests) {
      await markAsSeen.mutateAsync(req.id);
    }
    requestsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-l-4 border-l-destructive bg-gradient-to-br from-destructive/5 via-background to-background">
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-destructive">Erreur lors du chargement de vos documents.</p>
            <Button variant="outline" onClick={handleRetry}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Bannière demandes non lues */}
        {unreadCount > 0 && (
          <Alert className="border-helpconfort-orange bg-helpconfort-orange/10">
            <Bell className="h-4 w-4 text-helpconfort-orange" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Vous avez <strong>{unreadCount}</strong> demande{unreadCount > 1 ? 's' : ''} RH traitée{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}.
              </span>
              <Button variant="outline" size="sm" onClick={scrollToRequests}>
                <Eye className="h-4 w-4 mr-1" />
                Voir
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Bloc Coffre-fort documents - Finder RH */}
        <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
              <h3 className="font-semibold">Mes documents</h3>
            </div>
            <HRDocumentViewer
              documents={documents}
              isLoading={isLoading}
              onDownload={downloadDocument}
              getSignedUrl={getSignedUrl}
            />
          </CardContent>
        </Card>

        {/* Bloc Demandes de documents */}
        <Card 
          ref={requestsRef}
          className="border-l-4 border-l-helpconfort-orange bg-gradient-to-br from-helpconfort-orange/5 via-background to-background"
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Send className="h-5 w-5 text-helpconfort-orange" />
                Mes demandes de documents
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </h3>
              <Button size="sm" onClick={() => setShowRequestDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Demander un document
              </Button>
            </div>
            {requestError && (
              <div className="text-sm text-destructive mb-4">
                Une erreur est survenue lors du chargement de vos demandes.
              </div>
            )}

            {isLoadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune demande enregistrée pour l'instant.</p>
                <p className="text-sm mt-2">
                  Vous pouvez demander une attestation, un duplicata de bulletin, etc.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-start justify-between rounded-md border px-3 py-3 transition-colors ${
                      req.is_unread 
                        ? 'bg-helpconfort-orange/5 border-helpconfort-orange/30 font-medium' 
                        : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={req.is_unread ? 'font-semibold' : 'font-medium'}>
                          {DOCUMENT_REQUEST_TYPES.find((t) => t.value === req.request_type)?.label}
                        </span>
                        {req.is_unread && (
                          <Badge variant="default" className="bg-helpconfort-orange text-white text-[10px] px-1.5">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Demandé le {formatDate(req.requested_at)}
                      </div>
                      {req.description && (
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {req.description}
                        </div>
                      )}
                      {req.response_note && (
                        <div className="mt-2 text-xs bg-muted p-2 rounded">
                          <span className="font-semibold">Réponse RH : </span>
                          {req.response_note}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4">
                      <Badge variant={STATUS_BADGE_VARIANTS[req.status]}>
                        {DOCUMENT_REQUEST_STATUS_LABELS[req.status]}
                      </Badge>
                      {req.response_document && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => {
                            if (req.response_document) {
                              downloadDocument(req.response_document);
                            }
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Voir le document
                        </Button>
                      )}
                      {req.is_unread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleMarkAsSeen(req.id)}
                          disabled={markAsSeen.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Marquer comme lu
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog création de demande */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demander un document RH</DialogTitle>
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
    </>
  );
}
