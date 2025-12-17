/**
 * Page Documents & Services - Fonctionnalités salarié en vue mobile
 * Regroupe: Coffre RH, Véhicule, Matériel, Demandes
 */
import { useState } from 'react';
import { format, parseISO, differenceInDays, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileText, 
  Car, 
  Wrench, 
  Inbox,
  Loader2, 
  Download,
  File,
  Plus,
  AlertTriangle,
  MessageSquare,
  Send,
  Calendar,
  Fuel,
  Gauge,
  Hash,
  Laptop,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Archive,
  Eye,
  CheckSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMyDocuments, useDownloadDocument, useMyCollaborator } from '@/hooks/rh-employee';
import { useMyVehicle } from '@/hooks/rh-employee/useMyVehicle';
import { useMyEquipment, type MyEquipmentItem } from '@/hooks/rh-employee/useMyEquipment';
import { useMyRequests, useCreateRequest, useCancelRequest, useDownloadMyLetter, useArchiveMyRequest, canArchiveRequest, type RequestType, type RequestStatus } from '@/hooks/rh-employee/useMyRequests';
import { useTechnicianProfile } from '@/hooks/technician/useTechnicianProfile';
import { toast } from 'sonner';

// === COFFRE RH TAB ===
function CoffreTab() {
  const { data: documents = [], isLoading } = useMyDocuments();
  const { downloadDocument } = useDownloadDocument();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (filePath: string, fileName: string, docId: string) => {
    setDownloading(docId);
    try {
      await downloadDocument(filePath, fileName);
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
    setDownloading(null);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">Aucun document disponible</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3 min-w-0">
            <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{doc.title}</div>
              <div className="text-xs text-muted-foreground">
                {doc.period_month && doc.period_year
                  ? format(new Date(doc.period_year, doc.period_month - 1), 'MMMM yyyy', { locale: fr })
                  : format(new Date(doc.created_at!), 'd MMM yyyy', { locale: fr })}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDownload(doc.file_path, doc.file_name, doc.id)}
            disabled={downloading === doc.id}
          >
            {downloading === doc.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}

// === VEHICULE TAB ===
function VehiculeTab() {
  const { data: vehicle, isLoading } = useMyVehicle();
  const { mutate: createRequest, isPending: isCreatingRequest } = useCreateRequest();
  const [modalType, setModalType] = useState<'anomaly' | 'request' | null>(null);
  const [requestCategory, setRequestCategory] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  const handleSubmitRequest = () => {
    if (!requestMessage.trim()) {
      toast.error("Veuillez saisir un message");
      return;
    }
    const isAnomaly = modalType === 'anomaly';
    const title = isAnomaly 
      ? `Signalement véhicule: ${requestCategory || 'Anomalie'}`
      : `Demande véhicule: ${requestCategory || 'Autre'}`;
    const description = `Véhicule: ${vehicle?.registration || 'N/A'} - ${vehicle?.brand || ''} ${vehicle?.model || ''}\n\n${requestMessage}`;

    createRequest({
      request_type: 'OTHER',
      payload: {
        title,
        description,
        vehicle_id: vehicle?.id,
        vehicle_registration: vehicle?.registration,
        category: requestCategory,
        is_anomaly: isAnomaly,
        is_vehicle_request: true,
      }
    }, {
      onSuccess: () => {
        toast.success(isAnomaly ? "Signalement envoyé" : "Demande envoyée");
        setModalType(null);
        setRequestCategory('');
        setRequestMessage('');
      },
      onError: () => toast.error("Erreur lors de l'envoi")
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Car className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">Aucun véhicule assigné</p>
      </div>
    );
  }

  const DateBadge = ({ date }: { date: string | null }) => {
    if (!date) return <span className="text-xs text-muted-foreground">-</span>;
    const parsedDate = parseISO(date);
    const daysUntil = differenceInDays(parsedDate, new Date());
    const isOverdue = isBefore(parsedDate, new Date());
    let variant: "default" | "destructive" | "secondary" = "default";
    if (isOverdue || daysUntil <= 30) variant = "destructive";
    else if (daysUntil <= 90) variant = "secondary";
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs">{format(parsedDate, "dd/MM/yy", { locale: fr })}</span>
        <Badge variant={variant} className="text-[10px] px-1 py-0">
          {isOverdue ? "!" : daysUntil <= 30 ? `${daysUntil}j` : "OK"}
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-destructive border-destructive" onClick={() => setModalType('anomaly')}>
          <AlertTriangle className="h-4 w-4 mr-1" />
          Signaler
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setModalType('request')}>
          <MessageSquare className="h-4 w-4 mr-1" />
          Demande
        </Button>
      </div>

      {/* Info véhicule */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Immat.</span>
            <span className="font-mono font-medium">{vehicle.registration}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Véhicule</span>
            <span className="text-sm">{vehicle.brand} {vehicle.model}</span>
          </div>
          {vehicle.mileage_km && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" />Km</span>
              <span className="text-sm">{vehicle.mileage_km.toLocaleString('fr-FR')}</span>
            </div>
          )}
          {vehicle.fuel_type && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Fuel className="h-3 w-3" />Carburant</span>
              <span className="text-sm">{vehicle.fuel_type}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Échéances */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Échéances</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">CT</span>
            <DateBadge date={vehicle.ct_due_at} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Révision</span>
            <DateBadge date={vehicle.next_revision_at} />
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={modalType !== null} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent className="max-w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>{modalType === 'anomaly' ? 'Signaler une anomalie' : 'Faire une demande'}</DialogTitle>
            <DialogDescription>
              {modalType === 'anomaly' ? 'Décrivez le problème' : 'Décrivez votre demande'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={requestCategory} onValueChange={setRequestCategory}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                {modalType === 'anomaly' ? (
                  <>
                    <SelectItem value="panne">Panne</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="voyant">Voyant</SelectItem>
                    <SelectItem value="bruit">Bruit</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="entretien">Entretien</SelectItem>
                    <SelectItem value="nettoyage">Nettoyage</SelectItem>
                    <SelectItem value="accessoire">Accessoire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Description..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalType(null)}>Annuler</Button>
            <Button onClick={handleSubmitRequest} disabled={isCreatingRequest || !requestMessage.trim()}>
              <Send className="h-4 w-4 mr-1" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === MATERIEL TAB ===
function MaterielTab() {
  const { data: equipment = [], isLoading } = useMyEquipment();

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (equipment.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">Aucun matériel assigné</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {equipment.map((item) => {
        const isIT = item.categorie === 'informatique';
        return (
          <Card key={item.id}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isIT ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                  {isIT ? <Laptop className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.nom}</div>
                  {item.numero_serie && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono">{item.numero_serie}</span>
                    </div>
                  )}
                </div>
                <Badge variant={isIT ? "default" : "secondary"} className="text-[10px]">
                  {isIT ? 'IT' : 'Outil'}
                </Badge>
              </div>
              {item.notes && <p className="text-xs text-muted-foreground mt-2 italic">{item.notes}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// === DEMANDES TAB ===
const REQUEST_TYPES: { value: RequestType; label: string; emoji: string }[] = [
  { value: "EPI_RENEWAL", label: "EPI", emoji: "🦺" },
  { value: "LEAVE", label: "Congés", emoji: "🏖️" },
  { value: "DOCUMENT", label: "Document", emoji: "📄" },
  { value: "OTHER", label: "Autre", emoji: "📝" },
];

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Brouillon", color: "bg-muted text-muted-foreground", icon: <FileText className="w-3 h-3" /> },
  SUBMITTED: { label: "Attente", color: "bg-amber-500/20 text-amber-700", icon: <Clock className="w-3 h-3" /> },
  SEEN: { label: "Vu", color: "bg-blue-500/20 text-blue-700", icon: <Eye className="w-3 h-3" /> },
  PROCESSED: { label: "Traité", color: "bg-emerald-500/20 text-emerald-700", icon: <CheckSquare className="w-3 h-3" /> },
  APPROVED: { label: "OK", color: "bg-emerald-500/20 text-emerald-700", icon: <CheckCircle className="w-3 h-3" /> },
  REJECTED: { label: "Refusé", color: "bg-destructive/20 text-destructive", icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { label: "Annulé", color: "bg-muted text-muted-foreground", icon: <XCircle className="w-3 h-3" /> },
};

function CreateRequestDialog({ onClose }: { onClose: () => void }) {
  const [requestType, setRequestType] = useState<RequestType>("EPI_RENEWAL");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const createRequest = useCreateRequest();

  const handleSubmit = () => {
    const payload: Record<string, unknown> = { description };
    if (requestType === "EPI_RENEWAL") {
      payload.items = items.split(",").map((i) => i.trim()).filter(Boolean);
    } else if (requestType === "LEAVE") {
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
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {REQUEST_TYPES.map((rt) => (
              <SelectItem key={rt.value} value={rt.value}>{rt.emoji} {rt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {requestType === "EPI_RENEWAL" && (
        <div className="space-y-2">
          <Label>Équipements (virgule)</Label>
          <Input value={items} onChange={(e) => setItems(e.target.value)} placeholder="Casque, Gants..." />
        </div>
      )}
      {requestType === "LEAVE" && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Début</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><Label>Fin</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Motif</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails..." rows={3} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={createRequest.isPending}>
          {createRequest.isPending ? "..." : "Envoyer"}
        </Button>
      </div>
    </div>
  );
}

function DemandesTab() {
  const { data: requests = [], isLoading } = useMyRequests({ archived: false });
  const cancelRequest = useCancelRequest();
  const downloadLetter = useDownloadMyLetter();
  const archiveRequest = useArchiveMyRequest();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle demande
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] rounded-lg">
          <DialogHeader><DialogTitle>Créer une demande</DialogTitle></DialogHeader>
          <CreateRequestDialog onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Aucune demande en cours</p>
        </div>
      ) : (
        requests.map((req) => {
          const typeInfo = REQUEST_TYPES.find((rt) => rt.value === req.request_type);
          const statusInfo = STATUS_CONFIG[req.status];
          const payload = req.payload as Record<string, unknown>;

          return (
            <Card key={req.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeInfo?.emoji || "📝"}</span>
                    <div>
                      <div className="text-sm font-medium">{typeInfo?.label || req.request_type}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(req.created_at), "dd/MM HH:mm", { locale: fr })}
                      </div>
                    </div>
                  </div>
                  <Badge className={`${statusInfo.color} text-[10px] px-1.5`}>
                    {statusInfo.icon}
                    <span className="ml-1">{statusInfo.label}</span>
                  </Badge>
                </div>

                {payload.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{String(payload.description)}</p>
                )}

                {req.decision_comment && (
                  <div className="p-2 rounded bg-muted text-xs mb-2">
                    <span className="font-medium">Réponse:</span> {req.decision_comment}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {req.employee_can_download && req.generated_letter_path && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => downloadLetter.mutate(req.id)} disabled={downloadLetter.isPending}>
                      <Download className="h-3 w-3 mr-1" />Lettre
                    </Button>
                  )}
                  {req.status === "SUBMITTED" && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => cancelRequest.mutate(req.id)} disabled={cancelRequest.isPending}>
                      <Trash2 className="h-3 w-3 mr-1" />Annuler
                    </Button>
                  )}
                  {canArchiveRequest(req.status) && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => archiveRequest.mutate(req.id)} disabled={archiveRequest.isPending}>
                      <Archive className="h-3 w-3 mr-1" />Archiver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// === MAIN COMPONENT ===
export default function TechDocuments() {
  const { data: profile, isLoading: profileLoading } = useTechnicianProfile();
  const { data: collaborator, isLoading: collabLoading } = useMyCollaborator();

  const isLoading = profileLoading || collabLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile && !collaborator) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aucun profil salarié configuré
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        RH - Parc
      </h1>

      <Tabs defaultValue="coffre" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="coffre" className="text-[10px] px-1 py-2 flex flex-col items-center gap-0.5">
            <FileText className="h-4 w-4" />
            Docs
          </TabsTrigger>
          <TabsTrigger value="vehicule" className="text-[10px] px-1 py-2 flex flex-col items-center gap-0.5">
            <Car className="h-4 w-4" />
            Véhicule
          </TabsTrigger>
          <TabsTrigger value="materiel" className="text-[10px] px-1 py-2 flex flex-col items-center gap-0.5">
            <Wrench className="h-4 w-4" />
            Matériel
          </TabsTrigger>
          <TabsTrigger value="demandes" className="text-[10px] px-1 py-2 flex flex-col items-center gap-0.5">
            <Inbox className="h-4 w-4" />
            Demandes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coffre" className="mt-4">
          <Card>
            <CardHeader className="pb-0 px-3 pt-3">
              <CardTitle className="text-sm">Mon Coffre RH</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CoffreTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicule" className="mt-4">
          <VehiculeTab />
        </TabsContent>

        <TabsContent value="materiel" className="mt-4">
          <MaterielTab />
        </TabsContent>

        <TabsContent value="demandes" className="mt-4">
          <DemandesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
