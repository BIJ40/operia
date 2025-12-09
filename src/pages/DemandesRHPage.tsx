import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAgencyDocumentRequests } from '@/hooks/useDocumentRequests';
import { 
  DOCUMENT_REQUEST_TYPES, 
  DOCUMENT_REQUEST_STATUS_LABELS,
  type DocumentRequestStatus 
} from '@/types/documentRequest';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Inbox, Upload, FileText, X, User, Eye, EyeOff, FolderOpen, FileSignature, Lock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CollaboratorDocument } from '@/types/collaboratorDocument';
import { GenerateDocumentDialog } from '@/components/rh/GenerateDocumentDialog';
import { useLockDocumentRequest, useUnlockDocumentRequest, isLockExpired } from '@/hooks/rh/useDocumentRequestLock';

const STATUS_BADGE_VARIANTS: Record<DocumentRequestStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  REJECTED: 'destructive',
};

const BUCKET_NAME = 'rh-documents';

export default function DemandesRHPage() {
  const { requests, isLoading, error, updateRequest } = useAgencyDocumentRequests();
  const { agencyId, user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<DocumentRequestStatus | 'ALL'>('PENDING');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [newStatus, setNewStatus] = useState<DocumentRequestStatus>('COMPLETED');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  // Fetch collaborator info for each request
  const { data: collaborators = {} } = useQuery({
    queryKey: ['collaborators-for-requests', requests.map(r => r.collaborator_id)],
    queryFn: async () => {
      const uniqueIds = [...new Set(requests.map(r => r.collaborator_id))];
      if (uniqueIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, first_name, last_name')
        .in('id', uniqueIds);
      
      if (error) throw error;
      
      return (data || []).reduce((acc, c) => {
        acc[c.id] = `${c.first_name} ${c.last_name}`;
        return acc;
      }, {} as Record<string, string>);
    },
    enabled: requests.length > 0,
  });

  const currentRequest = requests.find((r) => r.id === selectedRequestId) ?? null;

  // Fetch existing documents for the current collaborator
  const { data: existingDocs = [] } = useQuery({
    queryKey: ['collaborator-docs-for-picker', currentRequest?.collaborator_id],
    queryFn: async () => {
      if (!currentRequest?.collaborator_id) return [];
      
      const { data, error } = await supabase
        .from('collaborator_documents')
        .select('*')
        .eq('collaborator_id', currentRequest.collaborator_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CollaboratorDocument[];
    },
    enabled: !!currentRequest?.collaborator_id,
  });

  const filteredRequests = useMemo(
    () =>
      statusFilter === 'ALL'
        ? requests
        : requests.filter((r) => r.status === statusFilter),
    [requests, statusFilter]
  );

  const formatDate = (date: string) => {
    return format(new Date(date), "dd MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setSelectedDocumentId(null); // Clear document selection when uploading new file
    }
  }, []);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleSelectExistingDoc = (docId: string) => {
    setSelectedDocumentId(docId);
    setSelectedFile(null); // Clear file when selecting existing doc
    setShowDocPicker(false);
  };

  const lockMutation = useLockDocumentRequest();
  const unlockMutation = useUnlockDocumentRequest();

  // Cleanup: unlock on unmount - use ref to avoid stale closure
  const selectedRequestIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    selectedRequestIdRef.current = selectedRequestId;
  }, [selectedRequestId]);

  useEffect(() => {
    return () => {
      if (selectedRequestIdRef.current) {
        unlockMutation.mutate(selectedRequestIdRef.current);
      }
    };
  }, []);

  const handleSelectRequest = async (req: typeof requests[0]) => {
    // Check if locked by someone else
    if (req.locked_by && req.locked_by !== user?.id && !isLockExpired(req.locked_at)) {
      toast.error('Cette demande est en cours de traitement par un autre utilisateur');
      return;
    }

    // Unlock previous if any
    if (selectedRequestId && selectedRequestId !== req.id) {
      unlockMutation.mutate(selectedRequestId);
    }

    // Try to lock new request
    const result = await lockMutation.mutateAsync(req.id);
    if (!result.success) {
      return; // Toast already shown by hook
    }

    setSelectedRequestId(req.id);
    setResponseNote(req.response_note || '');
    setNewStatus(req.status === 'PENDING' ? 'IN_PROGRESS' : (req.status as DocumentRequestStatus));
    setSelectedFile(null);
    setSelectedDocumentId(req.response_document_id || null);
  };

  const handleDeselectRequest = () => {
    if (selectedRequestId) {
      unlockMutation.mutate(selectedRequestId);
    }
    setSelectedRequestId(null);
    setResponseNote('');
    setSelectedFile(null);
    setSelectedDocumentId(null);
  };

  const handleSubmit = async () => {
    if (!currentRequest || !agencyId || !user?.id) return;

    setIsUploading(true);
    let documentId: string | null = selectedDocumentId;

    try {
      // 1) Upload file if provided (new file takes precedence)
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${currentRequest.collaborator_id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Create document record
        const typeLabel = DOCUMENT_REQUEST_TYPES.find(t => t.value === currentRequest.request_type)?.label || 'Document';
        const { data: docData, error: docError } = await supabase
          .from('collaborator_documents')
          .insert({
            collaborator_id: currentRequest.collaborator_id,
            agency_id: agencyId,
            doc_type: 'ATTESTATION',
            title: `Réponse: ${typeLabel}`,
            description: responseNote || null,
            file_path: filePath,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            file_type: selectedFile.type,
            visibility: 'EMPLOYEE_VISIBLE',
            uploaded_by: user.id,
          })
          .select('id')
          .single();

        if (docError) {
          // Rollback: delete uploaded file
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
          throw docError;
        }

        documentId = docData.id;
      }

      // 2) Update request with response via RPC
      await updateRequest.mutateAsync({
        id: currentRequest.id,
        status: newStatus,
        response_note: responseNote || undefined,
        response_document_id: documentId,
      });

      // Unlock and reset form
      if (currentRequest.id) {
        unlockMutation.mutate(currentRequest.id);
      }
      setSelectedRequestId(null);
      setResponseNote('');
      setSelectedFile(null);
      setSelectedDocumentId(null);
      toast.success('Réponse enregistrée');
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Get selected document info
  const selectedDocInfo = existingDocs.find(d => d.id === selectedDocumentId);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Demandes de documents RH"
        subtitle="Gérez les demandes de documents de vos collaborateurs"
        backTo={ROUTES.pilotage.index}
        backLabel="Mon Agence"
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Demandes de documents RH
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtrer par statut</span>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as DocumentRequestStatus | 'ALL')}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Traités</SelectItem>
                <SelectItem value="REJECTED">Refusés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-destructive mb-4">
              Erreur lors du chargement des demandes.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Liste des demandes */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredRequests.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Aucune demande pour ce filtre.
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const typeLabel =
                    DOCUMENT_REQUEST_TYPES.find((t) => t.value === req.request_type)?.label ??
                    req.request_type;
                  const collaboratorName = collaborators[req.collaborator_id] || 'Collaborateur';
                  const isSeenByEmployee = !!req.employee_seen_at;
                  const isLockedByOther = req.locked_by && req.locked_by !== user?.id && !isLockExpired(req.locked_at);

                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => handleSelectRequest(req)}
                      disabled={isLockedByOther}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        selectedRequestId === req.id
                          ? 'border-primary bg-primary/5'
                          : isLockedByOther
                          ? 'opacity-50 cursor-not-allowed bg-muted/30'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {collaboratorName}
                            {isLockedByOther && (
                              <span title="En cours de traitement par un autre utilisateur">
                                <Lock className="h-3 w-3 text-amber-500" />
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {typeLabel} • {formatDate(req.requested_at)}
                          </div>
                          {req.description && (
                            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {req.description}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={STATUS_BADGE_VARIANTS[req.status]}>
                            {DOCUMENT_REQUEST_STATUS_LABELS[req.status]}
                          </Badge>
                          {isLockedByOther && (
                            <span className="text-[10px] text-amber-600 flex items-center gap-1">
                              <Lock className="h-3 w-3" /> En traitement
                            </span>
                          )}
                          {!isLockedByOther && (req.status === 'COMPLETED' || req.status === 'REJECTED') && (
                            <span className={`text-[10px] flex items-center gap-1 ${isSeenByEmployee ? 'text-green-600' : 'text-amber-600'}`}>
                              {isSeenByEmployee ? (
                                <><Eye className="h-3 w-3" /> Lu</>
                              ) : (
                                <><EyeOff className="h-3 w-3" /> Non lu</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Panneau de traitement */}
            <div className="border-l pl-4 space-y-4 hidden md:block">
              {!currentRequest ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Sélectionnez une demande à gauche pour la traiter.
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Demandeur
                    </div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {collaborators[currentRequest.collaborator_id] || 'Collaborateur'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Type de demande
                    </div>
                    <div className="text-sm font-medium">
                      {DOCUMENT_REQUEST_TYPES.find((t) => t.value === currentRequest.request_type)?.label}
                    </div>
                    {currentRequest.description && (
                      <div className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                        {currentRequest.description}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Statut de la demande
                    </Label>
                    <Select
                      value={newStatus}
                      onValueChange={(v) => setNewStatus(v as DocumentRequestStatus)}
                    >
                      <SelectTrigger className="h-8 w-[200px] text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="PENDING">En attente</SelectItem>
                        <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                        <SelectItem value="COMPLETED">Traité</SelectItem>
                        <SelectItem value="REJECTED">Refusé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Réponse au collaborateur
                    </Label>
                    <Textarea
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      rows={3}
                      placeholder="Message qui apparaîtra dans l'espace salarié..."
                    />
                  </div>

                  {/* Document associé */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Document associé
                    </Label>
                    
                    {/* Display currently selected document */}
                    {(selectedFile || selectedDocInfo) && (
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-xs flex-1 truncate">
                          {selectedFile ? selectedFile.name : selectedDocInfo?.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setSelectedFile(null);
                            setSelectedDocumentId(null);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {!selectedFile && !selectedDocInfo && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {/* Upload new document */}
                          <div className="flex-1 relative">
                            <Input
                              type="file"
                              onChange={handleFileChange}
                              className="hidden"
                              id="file-upload"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                            <label
                              htmlFor="file-upload"
                              className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Téléverser
                              </span>
                            </label>
                          </div>
                          
                          {/* Choose from existing docs */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-auto py-3"
                            onClick={() => setShowDocPicker(true)}
                          >
                            <FolderOpen className="h-4 w-4 mr-1" />
                            <span className="text-xs">Coffre</span>
                          </Button>
                        </div>

                        {/* Generate PDF button */}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                          onClick={() => setShowGenerateDialog(true)}
                        >
                          <FileSignature className="h-4 w-4" />
                          <span className="text-xs">Générer un document officiel (PDF tamponné)</span>
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-[10px] text-muted-foreground">
                      Le document sera visible dans le coffre-fort du salarié
                    </p>
                  </div>

                  {/* P1-03: Bouton "Prendre en charge" pour passer rapidement en IN_PROGRESS */}
                  {currentRequest.status === 'PENDING' && (
                    <div className="pt-2 border-t">
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
                        onClick={async () => {
                          try {
                            await updateRequest.mutateAsync({
                              id: currentRequest.id,
                              status: 'IN_PROGRESS',
                            });
                            setNewStatus('IN_PROGRESS');
                            toast.success('Demande prise en charge');
                          } catch (err: any) {
                            toast.error(`Erreur: ${err.message}`);
                          }
                        }}
                        disabled={updateRequest.isPending}
                      >
                        {updateRequest.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        Prendre en charge
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">
                        Le collaborateur sera notifié que sa demande est en cours de traitement
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequestId(null);
                        setResponseNote('');
                        setSelectedFile(null);
                        setSelectedDocumentId(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={isUploading || updateRequest.isPending}
                    >
                      {isUploading || updateRequest.isPending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Picker Dialog */}
      <Dialog open={showDocPicker} onOpenChange={setShowDocPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir un document existant</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {existingDocs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Aucun document dans le coffre-fort de ce collaborateur.
              </div>
            ) : (
              existingDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleSelectExistingDoc(doc.id)}
                  className="w-full text-left p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{doc.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                        {doc.visibility === 'EMPLOYEE_VISIBLE' && (
                          <Badge variant="outline" className="ml-2 text-[10px]">Visible</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Document Dialog */}
      {currentRequest && (
        <GenerateDocumentDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          requestId={currentRequest.id}
          requestType={currentRequest.request_type}
          collaboratorId={currentRequest.collaborator_id}
          collaboratorName={collaborators[currentRequest.collaborator_id] || 'Collaborateur'}
          onSuccess={(documentId) => {
            setSelectedDocumentId(documentId);
          }}
        />
      )}
    </div>
  );
}
