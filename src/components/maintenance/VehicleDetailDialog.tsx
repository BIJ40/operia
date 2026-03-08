/**
 * Dialog détail véhicule - Vue centralisée N2
 * Affiche: infos générales, demandes conducteur, maintenance, documents
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import type { FleetVehicle, MaintenanceEvent } from '@/types/maintenance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Car,
  User,
  Calendar,
  Gauge,
  FileText,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  CreditCard,
  Fuel,
} from 'lucide-react';
import { VEHICLE_STATUSES, MAINTENANCE_EVENT_STATUSES } from '@/types/maintenance';

interface VehicleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: FleetVehicle | null;
}

export function VehicleDetailDialog({ open, onOpenChange, vehicle }: VehicleDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('info');
  const { agencyId } = useAuth();

  // Fetch maintenance events for this vehicle
  const { data: maintenanceEvents = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['vehicle-maintenance-events', vehicle?.id],
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from('maintenance_events')
        .select(`
          *,
          plan_item:maintenance_plan_items!plan_item_id(id, label)
        `)
        .eq('vehicle_id', vehicle.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data as MaintenanceEvent[];
    },
    enabled: open && !!vehicle?.id,
  });

  // Fetch driver requests for this vehicle (via assigned collaborator)
  const { data: driverRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['vehicle-driver-requests', vehicle?.id, vehicle?.assigned_collaborator_id],
    queryFn: async () => {
      if (!vehicle?.assigned_collaborator_id || !agencyId) return [];
      
      // Get requests from the assigned driver that are vehicle-related
      const { data, error } = await supabase
        .from('rh_requests')
        .select(`
          *,
          employee:profiles!rh_requests_employee_user_id_fkey(id, first_name, last_name)
        `)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter for vehicle requests
      return (data || []).filter(req => {
        const payload = req.payload as Record<string, unknown> | null;
        return payload?.is_vehicle_request === true;
      });
    },
    enabled: open && !!vehicle?.assigned_collaborator_id && !!agencyId,
  });

  if (!vehicle) return null;

  const statusInfo = VEHICLE_STATUSES.find(s => s.value === vehicle.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Car className="h-6 w-6 text-helpconfort-blue" />
            <span>{vehicle.name}</span>
            {vehicle.registration && (
              <Badge variant="outline" className="font-mono ml-2">
                {vehicle.registration}
              </Badge>
            )}
            {statusInfo && (
              <Badge
                variant={statusInfo.value === 'active' ? 'default' : 'secondary'}
                className={statusInfo.value === 'repair' ? 'bg-orange-500' : ''}
              >
                {statusInfo.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info" className="gap-1.5">
              <Car className="h-4 w-4" />
              Infos
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1.5">
              <Wrench className="h-4 w-4" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Demandes
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="info" className="mt-0 space-y-4">
              <VehicleInfoTab vehicle={vehicle} />
            </TabsContent>

            <TabsContent value="maintenance" className="mt-0 space-y-4">
              <MaintenanceTab events={maintenanceEvents} isLoading={isLoadingEvents} />
            </TabsContent>

            <TabsContent value="requests" className="mt-0 space-y-4">
              <RequestsTab requests={driverRequests} isLoading={isLoadingRequests} />
            </TabsContent>

            <TabsContent value="documents" className="mt-0 space-y-4">
              <DocumentsTab vehicle={vehicle} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

function VehicleInfoTab({ vehicle }: { vehicle: FleetVehicle }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Identité */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            Identité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Nom" value={vehicle.name} />
          <InfoRow label="Immatriculation" value={vehicle.registration} mono />
          <InfoRow label="Marque" value={vehicle.brand} />
          <InfoRow label="Modèle" value={vehicle.model} />
          <InfoRow label="Année" value={vehicle.year?.toString()} />
          <InfoRow label="VIN" value={vehicle.vin} mono />
          <InfoRow label="Carburant" value={vehicle.fuel_type} />
        </CardContent>
      </Card>

      {/* Utilisation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            Utilisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow 
            label="Kilométrage" 
            value={vehicle.mileage_km ? `${vehicle.mileage_km.toLocaleString('fr-FR')} km` : null} 
          />
          <InfoRow 
            label="Affecté à" 
            value={vehicle.collaborator 
              ? `${vehicle.collaborator.first_name} ${vehicle.collaborator.last_name}` 
              : null
            }
            icon={<User className="h-3.5 w-3.5" />}
          />
        </CardContent>
      </Card>

      {/* Échéances */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Échéances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <DateRow label="CT" date={vehicle.ct_due_at} alertDays={vehicle.ct_alert_days} />
          <DateRow label="Prochaine révision" date={vehicle.next_revision_at} alertDays={vehicle.revision_alert_days} />
          <DateRow label="Changement pneus" date={vehicle.next_tires_change_at} />
          <InfoRow label="Dernier CT" value={vehicle.last_ct_at ? formatDate(vehicle.last_ct_at) : null} />
          <InfoRow label="Dernière révision" value={vehicle.last_revision_at ? formatDate(vehicle.last_revision_at) : null} />
        </CardContent>
      </Card>

      {/* Assurance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Assurance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Assureur" value={vehicle.insurance_company} />
          <InfoRow label="N° contrat" value={vehicle.insurance_contract_number} mono />
          <DateRow label="Échéance" date={vehicle.insurance_expiry_at} alertDays={vehicle.insurance_alert_days} />
        </CardContent>
      </Card>

      {/* Leasing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Leasing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Loueur" value={vehicle.leasing_company} />
          <InfoRow 
            label="Loyer mensuel" 
            value={vehicle.leasing_monthly_amount 
              ? `${vehicle.leasing_monthly_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` 
              : null
            } 
          />
          <DateRow label="Fin de contrat" date={vehicle.leasing_end_at} alertDays={vehicle.leasing_alert_days} />
        </CardContent>
      </Card>

      {/* Notes */}
      {vehicle.notes && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MaintenanceTab({ events, isLoading }: { events: MaintenanceEvent[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Aucun événement de maintenance enregistré</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map(event => {
        const statusInfo = MAINTENANCE_EVENT_STATUSES.find(s => s.value === event.status);
        return (
          <Card key={event.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {event.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : event.status === 'overdue' ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="font-medium text-sm">{event.label}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <p>Prévu: {formatDate(event.scheduled_at)}</p>
                  {event.completed_at && <p>Réalisé: {formatDate(event.completed_at)}</p>}
                  {event.mileage_km && <p>Km: {event.mileage_km.toLocaleString('fr-FR')}</p>}
                  {event.notes && <p className="italic">{event.notes}</p>}
                </div>
              </div>
              {statusInfo && (
                <Badge variant={event.status === 'completed' ? 'default' : event.status === 'overdue' ? 'destructive' : 'secondary'}>
                  {statusInfo.label}
                </Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function RequestsTab({ requests, isLoading }: { requests: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Aucune demande ou signalement conducteur</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <Badge variant="outline">En attente</Badge>;
      case 'SEEN': return <Badge variant="secondary">Vu</Badge>;
      case 'PROCESSED': return <Badge>Traité</Badge>;
      case 'APPROVED': return <Badge className="bg-green-500">Approuvé</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Refusé</Badge>;
      case 'CANCELLED': return <Badge variant="outline">Annulé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {requests.map(request => {
        const payload = request.payload as Record<string, unknown> | null;
        const isAnomaly = payload?.is_anomaly;
        const category = payload?.category as string;
        const description = payload?.description as string;

        return (
          <Card key={request.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isAnomaly ? (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Car className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="font-medium text-sm">
                    {isAnomaly ? 'Signalement' : 'Demande'} - {category || 'Véhicule'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <p>{formatDate(request.created_at)}</p>
                  {description && <p className="italic">{description}</p>}
                  {request.employee && (
                    <p>Par: {request.employee.first_name} {request.employee.last_name}</p>
                  )}
                </div>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DocumentsTab({ vehicle }: { vehicle: FleetVehicle }) {
  // Placeholder - documents système à implémenter
  return (
    <div className="text-center py-8 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>Gestion des documents à venir</p>
      <p className="text-xs mt-2">Carte grise, factures réparation, documents financiers...</p>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function InfoRow({ 
  label, 
  value, 
  mono = false,
  icon 
}: { 
  label: string; 
  value: string | null | undefined; 
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`font-medium ${mono ? 'font-mono' : ''} ${!value ? 'text-muted-foreground' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function DateRow({ 
  label, 
  date, 
  alertDays 
}: { 
  label: string; 
  date: string | null | undefined; 
  alertDays?: number | null;
}) {
  if (!date) {
    return <InfoRow label={label} value={null} />;
  }

  const dateObj = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const threshold = alertDays || 30;
  const isOverdue = diffDays < 0;
  const isWarning = diffDays >= 0 && diffDays <= threshold;

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${isOverdue ? 'text-red-500' : isWarning ? 'text-orange-500' : ''}`}>
        {formatDate(date)}
        {isOverdue && <span className="ml-1 text-xs">(dépassé)</span>}
        {isWarning && !isOverdue && <span className="ml-1 text-xs">({diffDays}j)</span>}
      </span>
    </div>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}
