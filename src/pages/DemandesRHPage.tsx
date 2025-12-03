import { useState, useMemo, useCallback } from 'react';
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
import { Loader2, Inbox, Upload, FileText, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

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
  const [isUploading, setIsUploading] = useState(false);

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

  const filteredRequests = useMemo(
    () =>
      statusFilter === 'ALL'
        ? requests
        : requests.filter((r) => r.status === statusFilter),
    [requests, statusFilter]
  );

  const currentRequest = filteredRequests.find((r) => r.id === selectedRequestId) ?? null;

  const formatDate = (date: string) => {
    return format(new Date(date), "dd MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleSubmit = async () => {
    if (!currentRequest || !agencyId || !user?.id) return;

    setIsUploading(true);
    let documentId: string | null = null;

    try {
      // 1) Upload file if provided
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

      // 2) Update request with response
      await updateRequest.mutateAsync({
        id: currentRequest.id,
        status: newStatus,
        response_note: responseNote || undefined,
        response_document_id: documentId,
      });

      // 3) Create notification for the employee
      const statusLabel = newStatus === 'COMPLETED' ? 'traitée' : newStatus === 'REJECTED' ? 'refusée' : 'mise à jour';
      const typeLabel = DOCUMENT_REQUEST_TYPES.find(t => t.value === currentRequest.request_type)?.label || 'document';
      
      await supabase.from('rh_notifications').insert({
        collaborator_id: currentRequest.collaborator_id,
        agency_id: agencyId,
        notification_type: 'DOCUMENT_REQUEST_RESPONSE',
        title: `Demande ${statusLabel}`,
        message: `Votre demande de "${typeLabel}" a été ${statusLabel}.${responseNote ? ` Message: ${responseNote}` : ''}${documentId ? ' Un document a été joint.' : ''}`,
        related_request_id: currentRequest.id,
        related_document_id: documentId,
      });

      // Reset form
      setSelectedRequestId(null);
      setResponseNote('');
      setSelectedFile(null);
      toast.success('Réponse envoyée et notification créée');
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
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

                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => {
                        setSelectedRequestId(req.id);
                        setResponseNote(req.response_note || '');
                        setNewStatus(
                          req.status === 'PENDING' ? 'IN_PROGRESS' : (req.status as DocumentRequestStatus)
                        );
                        setSelectedFile(null);
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        selectedRequestId === req.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {collaboratorName}
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
                        <Badge variant={STATUS_BADGE_VARIANTS[req.status]}>
                          {DOCUMENT_REQUEST_STATUS_LABELS[req.status]}
                        </Badge>
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

                  {/* Upload document */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Joindre un document (optionnel)
                    </Label>
                    {selectedFile ? (
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-xs flex-1 truncate">{selectedFile.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={removeFile}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
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
                            Cliquez pour sélectionner un fichier
                          </span>
                        </label>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Le document sera visible dans le coffre-fort du salarié
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequestId(null);
                        setResponseNote('');
                        setSelectedFile(null);
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
    </div>
  );
}