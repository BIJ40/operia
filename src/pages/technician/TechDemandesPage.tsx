/**
 * Page Mes Demandes - Demandes du technicien (congés, EPI, docs)
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Inbox,
  ChevronLeft,
  Loader2,
  Plus,
  FileText,
  Clock,
  Eye,
  CheckSquare,
  CheckCircle,
  XCircle,
  Trash2,
  Archive,
  Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useMyRequests,
  useCreateRequest,
  useCancelRequest,
  useDownloadMyLetter,
  useArchiveMyRequest,
  canArchiveRequest,
  type RequestType,
  type RequestStatus,
} from '@/hooks/rh-employee/useMyRequests';

const REQUEST_TYPES: { value: RequestType; label: string; emoji: string }[] = [
  { value: 'EPI_RENEWAL', label: 'EPI', emoji: '🦺' },
  { value: 'LEAVE', label: 'Congés', emoji: '🏖️' },
  { value: 'DOCUMENT', label: 'Document', emoji: '📄' },
  { value: 'OTHER', label: 'Autre', emoji: '📝' },
];

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-muted text-muted-foreground', icon: <FileText className="w-3 h-3" /> },
  SUBMITTED: { label: 'Attente', color: 'bg-amber-500/20 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  SEEN: { label: 'Vu', color: 'bg-blue-500/20 text-blue-700', icon: <Eye className="w-3 h-3" /> },
  PROCESSED: { label: 'Traité', color: 'bg-emerald-500/20 text-emerald-700', icon: <CheckSquare className="w-3 h-3" /> },
  APPROVED: { label: 'OK', color: 'bg-emerald-500/20 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
  REJECTED: { label: 'Refusé', color: 'bg-destructive/20 text-destructive', icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'Annulé', color: 'bg-muted text-muted-foreground', icon: <XCircle className="w-3 h-3" /> },
};

function CreateRequestDialog({ onClose }: { onClose: () => void }) {
  const [requestType, setRequestType] = useState<RequestType>('EPI_RENEWAL');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const createRequest = useCreateRequest();

  const handleSubmit = () => {
    const payload: Record<string, unknown> = { description };
    if (requestType === 'EPI_RENEWAL') {
      payload.items = items
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);
    } else if (requestType === 'LEAVE') {
      payload.start_date = startDate;
      payload.end_date = endDate;
    }
    createRequest.mutate({ request_type: requestType, payload }, { onSuccess: () => onClose() });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_TYPES.map((rt) => (
              <SelectItem key={rt.value} value={rt.value}>
                {rt.emoji} {rt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {requestType === 'EPI_RENEWAL' && (
        <div className="space-y-2">
          <Label>Équipements (virgule)</Label>
          <Input value={items} onChange={(e) => setItems(e.target.value)} placeholder="Casque, Gants..." />
        </div>
      )}
      {requestType === 'LEAVE' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Début</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Fin</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Motif</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails..." rows={3} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={createRequest.isPending}>
          {createRequest.isPending ? '...' : 'Envoyer'}
        </Button>
      </div>
    </div>
  );
}

export default function TechDemandesPage() {
  const { data: requests = [], isLoading } = useMyRequests({ archived: false });
  const cancelRequest = useCancelRequest();
  const downloadLetter = useDownloadMyLetter();
  const archiveRequest = useArchiveMyRequest();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-4 space-y-4">
      {/* Header avec retour */}
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Mes demandes</h1>
          <p className="text-xs text-muted-foreground">Congés, EPI, documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] rounded-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle demande</DialogTitle>
            </DialogHeader>
            <CreateRequestDialog onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm">Aucune demande en cours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const typeInfo = REQUEST_TYPES.find((rt) => rt.value === req.request_type) || REQUEST_TYPES[3];
            const statusInfo = STATUS_CONFIG[req.status as RequestStatus] || STATUS_CONFIG.SUBMITTED;
            const showCancel = req.status === 'SUBMITTED';
            const showDownload = req.generated_letter_path && req.employee_can_download;
            const showArchive = canArchiveRequest(req.status as RequestStatus);

            return (
              <Card key={req.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{typeInfo.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{typeInfo.label}</span>
                        <Badge className={`${statusInfo.color} text-[10px] px-1.5 py-0 flex items-center gap-1`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {(req.payload as { description?: string })?.description || 'Sans motif'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(req.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {(showCancel || showDownload || showArchive) && (
                    <div className="flex gap-2 mt-3 pt-2 border-t">
                      {showCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-destructive"
                          onClick={() => cancelRequest.mutate(req.id)}
                          disabled={cancelRequest.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Annuler
                        </Button>
                      )}
                      {showDownload && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => downloadLetter.mutate(req.id)}
                          disabled={downloadLetter.isPending}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Télécharger
                        </Button>
                      )}
                      {showArchive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => archiveRequest.mutate(req.id)}
                          disabled={archiveRequest.isPending}
                        >
                          <Archive className="h-3 w-3 mr-1" />
                          Archiver
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
