/**
 * Page Coffre-fort RH - Vue salarié
 * Permet aux employés de consulter leurs documents RH et demander des documents
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Download, Loader2, FolderOpen, File, Send, Plus 
} from 'lucide-react';
import { useMyDocuments } from '@/hooks/useCollaboratorDocuments';
import { useMyDocumentRequests } from '@/hooks/useDocumentRequests';
import { DOCUMENT_TYPES, DocumentType } from '@/types/collaboratorDocument';
import { 
  DOCUMENT_REQUEST_TYPES, 
  DOCUMENT_REQUEST_STATUS_LABELS,
  type DocumentRequestType,
  type DocumentRequestStatus 
} from '@/types/documentRequest';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
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

const STATUS_BADGE_VARIANTS: Record<DocumentRequestStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  REJECTED: 'destructive',
};

export default function MonCoffreRH() {
  const queryClient = useQueryClient();
  const { documents, isLoading, error, downloadDocument } = useMyDocuments();
  const { 
    requests, 
    isLoading: isLoadingRequests, 
    error: requestError, 
    createRequest 
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeLabel = (type: DocumentType) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.doc_type as DocumentType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<DocumentType, typeof documents>);

  const handleCreateRequest = async () => {
    await createRequest.mutateAsync({
      request_type: requestType,
      description: description || undefined,
    });
    setDescription('');
    setShowRequestDialog(false);
  };

  if (error) {
    return (
      <MainLayout>
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
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Bloc Coffre-fort documents */}
        <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Chargement de vos documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun document disponible dans votre coffre-fort.</p>
                <p className="text-sm mt-2">
                  Les documents mis à disposition par votre agence apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedDocuments).map(([type, docs]) => (
                  <div key={type}>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      {getDocTypeLabel(type as DocumentType)}
                      <Badge variant="secondary">{docs.length}</Badge>
                    </h3>
                    <div className="space-y-2">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{doc.title}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatDate(doc.created_at)}</span>
                                <span>·</span>
                                <span>{formatFileSize(doc.file_size)}</span>
                                {doc.period_month && doc.period_year && (
                                  <>
                                    <span>·</span>
                                    <span>{`${doc.period_month}/${doc.period_year}`}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloc Demandes de documents */}
        <Card className="border-l-4 border-l-helpconfort-orange bg-gradient-to-br from-helpconfort-orange/5 via-background to-background">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Send className="h-5 w-5 text-helpconfort-orange" />
                Mes demandes de documents
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
                    className="flex items-start justify-between rounded-md border px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {DOCUMENT_REQUEST_TYPES.find((t) => t.value === req.request_type)?.label}
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
                          Voir le document
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
    </MainLayout>
  );
}
