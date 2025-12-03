import { useState, useMemo } from 'react';
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
import { MainLayout } from '@/components/layout/MainLayout';
import { Loader2, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_BADGE_VARIANTS: Record<DocumentRequestStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'outline',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  REJECTED: 'destructive',
};

export default function DemandesRHPage() {
  const { requests, isLoading, error, updateRequest } = useAgencyDocumentRequests();

  const [statusFilter, setStatusFilter] = useState<DocumentRequestStatus | 'ALL'>('PENDING');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [newStatus, setNewStatus] = useState<DocumentRequestStatus>('COMPLETED');

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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
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
              <div className="space-y-2">
                {filteredRequests.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    Aucune demande pour ce filtre.
                  </div>
                ) : (
                  filteredRequests.map((req) => {
                    const typeLabel =
                      DOCUMENT_REQUEST_TYPES.find((t) => t.value === req.request_type)?.label ??
                      req.request_type;

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
                        }}
                        className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                          selectedRequestId === req.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{typeLabel}</div>
                            <div className="text-xs text-muted-foreground">
                              Demandé le {formatDate(req.requested_at)}
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
                        Demande sélectionnée
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
                      <div className="text-xs font-semibold text-muted-foreground">
                        Statut de la demande
                      </div>
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
                      <div className="text-xs font-semibold text-muted-foreground">
                        Réponse au collaborateur
                      </div>
                      <Textarea
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        rows={4}
                        placeholder="Message qui apparaîtra dans l'espace salarié..."
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequestId(null);
                          setResponseNote('');
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!currentRequest) return;
                          await updateRequest.mutateAsync({
                            id: currentRequest.id,
                            status: newStatus,
                            response_note: responseNote || undefined,
                          });
                          setSelectedRequestId(null);
                          setResponseNote('');
                        }}
                        disabled={updateRequest.isPending}
                      >
                        {updateRequest.isPending ? 'Enregistrement…' : 'Enregistrer'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
