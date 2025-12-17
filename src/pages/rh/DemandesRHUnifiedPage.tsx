/**
 * Page N2 unifiée pour traiter TOUTES les demandes RH (EPI, congés, documents, véhicules, matériel)
 * Source de vérité: table rh_requests
 * 
 * WORKFLOW:
 * - Demandes RH classiques (congés, EPI, documents): SUBMITTED → APPROVED/REJECTED
 * - Demandes véhicules/matériel: SUBMITTED → SEEN → PROCESSED (avec popup infos optionnelles)
 */
import { useState, useMemo } from 'react';
import { 
  useAgencyRequests, 
  useApproveRequest, 
  useRejectRequest,
  useMarkRequestAsSeen,
  useMarkRequestAsProcessed,
  useArchiveRequest,
  isVehicleOrEquipmentRequest,
  type RHRequestWithEmployee,
  type RequestStatus,
  type RequestType,
} from '@/hooks/rh-backoffice';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Inbox, Check, X, User, Calendar, FileText, HardHat, Eye, CheckCircle, Car, Wrench, Archive } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const REQUEST_TYPE_LABELS: Record<RequestType, { label: string; icon: typeof Calendar }> = {
  LEAVE: { label: 'Congés', icon: Calendar },
  EPI_RENEWAL: { label: 'Renouvellement EPI', icon: HardHat },
  DOCUMENT: { label: 'Document', icon: FileText },
  OTHER: { label: 'Autre', icon: FileText },
};

const STATUS_BADGE_VARIANTS: Record<RequestStatus, 'outline' | 'default' | 'secondary' | 'destructive'> = {
  DRAFT: 'outline',
  SUBMITTED: 'default',
  APPROVED: 'secondary',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
  SEEN: 'secondary',
  PROCESSED: 'secondary',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulée',
  SEEN: 'Vu',
  PROCESSED: 'Traitée',
};

// Helper to check if request can be archived
function canArchiveRequest(status: RequestStatus): boolean {
  return ['PROCESSED', 'APPROVED', 'REJECTED'].includes(status);
}

export default function DemandesRHUnifiedPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'ALL'>('ALL');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  
  // Dialog for processing vehicle/equipment requests
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processingInfo, setProcessingInfo] = useState({
    garage_date: '',
    notes: '',
    action_taken: '',
  });

  // Fetch requests from rh_requests table - separate queries for active and archived
  const { data: activeRequests = [], isLoading: isLoadingActive } = useAgencyRequests({
    status: statusFilter !== 'ALL' ? [statusFilter] : undefined,
    request_type: typeFilter !== 'ALL' ? [typeFilter] : undefined,
    archived: false,
  });

  const { data: archivedRequests = [], isLoading: isLoadingArchived } = useAgencyRequests({
    archived: true,
  });

  const requests = activeTab === 'active' ? activeRequests : archivedRequests;
  const isLoading = activeTab === 'active' ? isLoadingActive : isLoadingArchived;

  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const markSeenMutation = useMarkRequestAsSeen();
  const markProcessedMutation = useMarkRequestAsProcessed();
  const archiveMutation = useArchiveRequest();
  // Fetch collaborator names
  const employeeIds = useMemo(() => [...new Set(requests.map(r => r.employee_user_id))], [requests]);
  
  const { data: collaborators = {} } = useQuery({
    queryKey: ['collaborators-for-rh-requests', employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, user_id, first_name, last_name')
        .in('user_id', employeeIds);
      
      if (error) throw error;
      
      return (data || []).reduce((acc, c) => {
        if (c.user_id) {
          acc[c.user_id] = `${c.first_name} ${c.last_name}`;
        }
        return acc;
      }, {} as Record<string, string>);
    },
    enabled: employeeIds.length > 0,
  });

  const currentRequest = requests.find(r => r.id === selectedRequestId);
  const isVehicleRequest = currentRequest ? isVehicleOrEquipmentRequest(currentRequest) : false;

  const formatDate = (date: string) => {
    return format(new Date(date), "dd MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const formatPayload = (request: RHRequestWithEmployee) => {
    const payload = request.payload || {};
    
    if (request.request_type === 'LEAVE') {
      const startDate = payload.start_date ? format(new Date(payload.start_date as string), 'dd/MM/yyyy') : '?';
      const endDate = payload.end_date ? format(new Date(payload.end_date as string), 'dd/MM/yyyy') : '?';
      return `Du ${startDate} au ${endDate}`;
    }
    
    if (request.request_type === 'EPI_RENEWAL') {
      const items = payload.items as string[] || [];
      return items.length > 0 ? items.join(', ') : 'EPI à renouveler';
    }
    
    return payload.description as string || '-';
  };

  const getRequestTypeDisplay = (request: RHRequestWithEmployee) => {
    const payload = request.payload || {};
    if (payload.is_vehicle_request) {
      return payload.is_anomaly ? 'Signalement véhicule' : 'Demande véhicule';
    }
    if (payload.is_equipment_request) {
      return 'Demande matériel';
    }
    return REQUEST_TYPE_LABELS[request.request_type].label;
  };

  const getRequestIcon = (request: RHRequestWithEmployee) => {
    const payload = request.payload || {};
    if (payload.is_vehicle_request) return Car;
    if (payload.is_equipment_request) return Wrench;
    return REQUEST_TYPE_LABELS[request.request_type].icon;
  };

  // REGULAR RH WORKFLOW (approve/reject)
  const handleApprove = async () => {
    if (!currentRequest) return;
    await approveMutation.mutateAsync({ requestId: currentRequest.id });
    setSelectedRequestId(null);
  };

  const handleReject = async () => {
    if (!currentRequest || !rejectComment.trim()) return;
    await rejectMutation.mutateAsync({ requestId: currentRequest.id, comment: rejectComment });
    setSelectedRequestId(null);
    setRejectComment('');
  };

  // VEHICLE/EQUIPMENT WORKFLOW (seen → processed)
  const handleMarkAsSeen = async () => {
    if (!currentRequest) return;
    await markSeenMutation.mutateAsync(currentRequest.id);
  };

  const handleOpenProcessDialog = () => {
    setProcessingInfo({ garage_date: '', notes: '', action_taken: '' });
    setProcessDialogOpen(true);
  };

  const handleMarkAsProcessed = async () => {
    if (!currentRequest) return;
    await markProcessedMutation.mutateAsync({
      requestId: currentRequest.id,
      processingInfo: processingInfo.garage_date || processingInfo.notes || processingInfo.action_taken 
        ? processingInfo 
        : undefined,
    });
    setProcessDialogOpen(false);
    setSelectedRequestId(null);
    setProcessingInfo({ garage_date: '', notes: '', action_taken: '' });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Demandes RH"
        subtitle="Gérez toutes les demandes de vos collaborateurs (congés, EPI, véhicules, matériel)"
        backTo={ROUTES.rh.index}
        backLabel="Espace RH"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            En cours ({activeRequests.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archivées ({archivedRequests.length})
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              {activeTab === 'active' ? (
                <>
                  <Inbox className="h-5 w-5" />
                  Demandes en cours
                </>
              ) : (
                <>
                  <Archive className="h-5 w-5" />
                  Demandes archivées
                </>
              )}
            </CardTitle>
            {activeTab === 'active' && (
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as RequestType | 'ALL')}>
                    <SelectTrigger className="h-8 w-[150px] text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="ALL">Tous</SelectItem>
                      <SelectItem value="LEAVE">Congés</SelectItem>
                      <SelectItem value="EPI_RENEWAL">EPI</SelectItem>
                      <SelectItem value="DOCUMENT">Documents</SelectItem>
                      <SelectItem value="OTHER">Véhicules/Matériel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Statut</span>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | 'ALL')}>
                    <SelectTrigger className="h-8 w-[150px] text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="ALL">Tous</SelectItem>
                      <SelectItem value="SUBMITTED">En attente</SelectItem>
                      <SelectItem value="SEEN">Vu</SelectItem>
                      <SelectItem value="APPROVED">Approuvés</SelectItem>
                      <SelectItem value="PROCESSED">Traités</SelectItem>
                      <SelectItem value="REJECTED">Refusés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Liste des demandes */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {requests.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Aucune demande pour ces filtres.
                </div>
              ) : (
                requests.map((req) => {
                  const TypeIcon = getRequestIcon(req);
                  const employeeName = collaborators[req.employee_user_id] || 'Collaborateur';
                  const reqIsVehicle = isVehicleOrEquipmentRequest(req);

                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setSelectedRequestId(req.id)}
                      className={`w-full rounded-md border px-3 py-3 text-left text-sm transition ${
                        selectedRequestId === req.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {employeeName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <TypeIcon className="h-3 w-3" />
                            {getRequestTypeDisplay(req)}
                            {reqIsVehicle && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                Véhicule/Matériel
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatPayload(req)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatDate(req.created_at)}
                          </div>
                        </div>
                        <Badge variant={STATUS_BADGE_VARIANTS[req.status]}>
                          {STATUS_LABELS[req.status]}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Panneau de traitement */}
            <div className="border-l pl-4 space-y-4 hidden lg:block">
              {!currentRequest ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Sélectionnez une demande pour la traiter.
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Demandeur</div>
                      <div className="text-sm font-medium flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-primary" />
                        {collaborators[currentRequest.employee_user_id] || 'Collaborateur'}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Type de demande</div>
                      <div className="text-sm font-medium mt-1 flex items-center gap-2">
                        {getRequestTypeDisplay(currentRequest)}
                        {isVehicleRequest && (
                          <Badge variant="outline" className="text-xs">
                            Workflow simplifié
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Détails</div>
                      <div className="text-sm mt-1">{formatPayload(currentRequest)}</div>
                    </div>

                    {currentRequest.payload?.description && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground">Commentaire</div>
                        <div className="text-sm mt-1 text-muted-foreground">
                          {currentRequest.payload.description as string}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Date de demande</div>
                      <div className="text-sm mt-1">{formatDate(currentRequest.created_at)}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Statut actuel</div>
                      <Badge variant={STATUS_BADGE_VARIANTS[currentRequest.status]} className="mt-1">
                        {STATUS_LABELS[currentRequest.status]}
                      </Badge>
                    </div>

                    {/* Processing info if exists */}
                    {currentRequest.processing_info && (
                      <div className="p-3 bg-muted rounded-md space-y-2">
                        <div className="text-xs font-semibold">Informations de traitement</div>
                        {(currentRequest.processing_info as any)?.garage_date && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">RDV Garage:</span>{' '}
                            {(currentRequest.processing_info as any).garage_date}
                          </div>
                        )}
                        {(currentRequest.processing_info as any)?.notes && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Notes:</span>{' '}
                            {(currentRequest.processing_info as any).notes}
                          </div>
                        )}
                        {(currentRequest.processing_info as any)?.action_taken && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Action:</span>{' '}
                            {(currentRequest.processing_info as any).action_taken}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions for VEHICLE/EQUIPMENT requests */}
                  {isVehicleRequest && currentRequest.status === 'SUBMITTED' && (
                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleMarkAsSeen}
                        disabled={markSeenMutation.isPending}
                        className="w-full"
                        variant="secondary"
                      >
                        {markSeenMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Eye className="h-4 w-4 mr-2" />
                        )}
                        Marquer comme VU
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Vous indiquez avoir pris connaissance de la demande
                      </p>
                    </div>
                  )}

                  {isVehicleRequest && currentRequest.status === 'SEEN' && (
                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleOpenProcessDialog}
                        className="w-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marquer comme TRAITÉ
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Le collaborateur sera informé que sa demande est traitée
                      </p>
                    </div>
                  )}

                  {/* Actions for REGULAR RH requests (approve/reject) */}
                  {!isVehicleRequest && currentRequest.status === 'SUBMITTED' && (
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={handleApprove}
                          disabled={approveMutation.isPending}
                          className="flex-1"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Approuver
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Motif de refus (si refus)</Label>
                        <Textarea
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          placeholder="Expliquez le motif du refus..."
                          rows={2}
                        />
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={rejectMutation.isPending || !rejectComment.trim()}
                          className="w-full"
                        >
                          {rejectMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <X className="h-4 w-4 mr-2" />
                          )}
                          Refuser
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentRequest.status !== 'SUBMITTED' && currentRequest.status !== 'SEEN' && currentRequest.decision_comment && (
                    <div className="pt-4 border-t">
                      <div className="text-xs font-semibold text-muted-foreground">Commentaire de décision</div>
                      <div className="text-sm mt-1">{currentRequest.decision_comment}</div>
                    </div>
                  )}

                  {/* Archive button for completed requests */}
                  {activeTab === 'active' && canArchiveRequest(currentRequest.status) && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => archiveMutation.mutate(currentRequest.id)}
                        disabled={archiveMutation.isPending}
                        className="w-full"
                      >
                        {archiveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Archive className="h-4 w-4 mr-2" />
                        )}
                        Archiver cette demande
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        La demande sera déplacée dans l'onglet "Archivées"
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Tabs>

      {/* Sheet mobile pour le détail de la demande */}
      <Sheet open={!!currentRequest && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={(open) => !open && setSelectedRequestId(null)}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {currentRequest && (collaborators[currentRequest.employee_user_id] || 'Collaborateur')}
            </SheetTitle>
          </SheetHeader>
          {currentRequest && (
            <div className="space-y-4 mt-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Type de demande</div>
                <div className="text-sm font-medium mt-1">{getRequestTypeDisplay(currentRequest)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Détails</div>
                <div className="text-sm mt-1">{formatPayload(currentRequest)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Date de demande</div>
                <div className="text-sm mt-1">{formatDate(currentRequest.created_at)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Statut</div>
                <Badge variant={STATUS_BADGE_VARIANTS[currentRequest.status]} className="mt-1">
                  {STATUS_LABELS[currentRequest.status]}
                </Badge>
              </div>

              {/* Actions */}
              {isVehicleRequest && currentRequest.status === 'SUBMITTED' && (
                <Button onClick={handleMarkAsSeen} disabled={markSeenMutation.isPending} className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Marquer comme VU
                </Button>
              )}
              {isVehicleRequest && currentRequest.status === 'SEEN' && (
                <Button onClick={handleOpenProcessDialog} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marquer comme TRAITÉ
                </Button>
              )}
              {!isVehicleRequest && currentRequest.status === 'SUBMITTED' && (
                <div className="space-y-3">
                  <Button onClick={handleApprove} disabled={approveMutation.isPending} className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    Approuver
                  </Button>
                  <Textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="Motif de refus..."
                    rows={2}
                  />
                  <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !rejectComment.trim()} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Refuser
                  </Button>
                </div>
              )}
              {activeTab === 'active' && canArchiveRequest(currentRequest.status) && (
                <Button variant="outline" onClick={() => archiveMutation.mutate(currentRequest.id)} disabled={archiveMutation.isPending} className="w-full">
                  <Archive className="h-4 w-4 mr-2" />
                  Archiver
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog for processing vehicle/equipment requests */}
      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marquer la demande comme traitée</DialogTitle>
            <DialogDescription>
              Vous pouvez ajouter des informations optionnelles qui seront transmises au collaborateur.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="garage_date">Date RDV garage (optionnel)</Label>
              <Input
                id="garage_date"
                type="date"
                value={processingInfo.garage_date}
                onChange={(e) => setProcessingInfo(prev => ({ ...prev, garage_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="action_taken">Action effectuée (optionnel)</Label>
              <Input
                id="action_taken"
                placeholder="Ex: Pièce commandée, RDV pris..."
                value={processingInfo.action_taken}
                onChange={(e) => setProcessingInfo(prev => ({ ...prev, action_taken: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes supplémentaires (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Informations complémentaires..."
                value={processingInfo.notes}
                onChange={(e) => setProcessingInfo(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleMarkAsProcessed} disabled={markProcessedMutation.isPending}>
              {markProcessedMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmer traitement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
