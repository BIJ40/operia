/**
 * Panel détaillé d'un véhicule (affiché dans un onglet)
 */

import React, { useState } from 'react';
import { useFleetVehicles } from '@/hooks/maintenance/useFleetVehicles';
import { useVehicleInlineEdit } from '@/hooks/maintenance/useVehicleInlineEdit';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Car, Calendar, Gauge, User, FileText, Save, QrCode, Edit, 
  AlertTriangle, CheckCircle2, Clock 
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { VEHICLE_STATUSES } from '@/types/maintenance';
import { VehicleEditableCell } from '../VehicleEditableCell';
import { QrCodeModal } from '../QrCodeModal';
import { VehicleFormDialog } from '../VehicleFormDialog';

interface VehiclePanelProps {
  vehicleId: string;
}

export function VehiclePanel({ vehicleId }: VehiclePanelProps) {
  const { data: vehicles = [], isLoading } = useFleetVehicles();
  const { handleValueChange, getLocalValue, saveChanges, hasPendingChanges } = useVehicleInlineEdit();
  const [showQr, setShowQr] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const vehicle = vehicles.find(v => v.id === vehicleId);
  
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }
  
  if (!vehicle) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Véhicule non trouvé</p>
      </div>
    );
  }

  // Alertes CT
  const ctDaysLeft = vehicle.ct_due_at 
    ? differenceInDays(parseISO(vehicle.ct_due_at), new Date())
    : null;
  const ctOverdue = ctDaysLeft !== null && ctDaysLeft <= 0;
  const ctWarning = ctDaysLeft !== null && ctDaysLeft > 0 && ctDaysLeft <= 30;

  // Status badge
  const statusInfo = VEHICLE_STATUSES.find(s => s.value === vehicle.status);

  return (
    <div className="p-4 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {vehicle.registration || vehicle.name}
              <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'}>
                {statusInfo?.label || vehicle.status}
              </Badge>
            </h2>
            <p className="text-muted-foreground">
              {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasPendingChanges && (
            <Button size="sm" onClick={() => saveChanges()}>
              <Save className="h-4 w-4 mr-1" />
              Sauvegarder
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowQr(true)}>
            <QrCode className="h-4 w-4 mr-1" />
            QR
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-1" />
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informations principales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Nom</span>
                <VehicleEditableCell
                  value={getLocalValue(vehicle.id, 'name', vehicle.name)}
                  field="name"
                  vehicleId={vehicle.id}
                  onValueChange={handleValueChange}
                />
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Immatriculation</span>
                <VehicleEditableCell
                  value={getLocalValue(vehicle.id, 'registration', vehicle.registration)}
                  field="registration"
                  vehicleId={vehicle.id}
                  onValueChange={handleValueChange}
                  className="font-mono"
                />
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Marque</span>
                <VehicleEditableCell
                  value={getLocalValue(vehicle.id, 'brand', vehicle.brand)}
                  field="brand"
                  vehicleId={vehicle.id}
                  onValueChange={handleValueChange}
                />
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Modèle</span>
                <VehicleEditableCell
                  value={getLocalValue(vehicle.id, 'model', vehicle.model)}
                  field="model"
                  vehicleId={vehicle.id}
                  onValueChange={handleValueChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kilométrage & Affectation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Kilométrage</span>
                <VehicleEditableCell
                  value={getLocalValue(vehicle.id, 'mileage_km', vehicle.mileage_km)}
                  field="mileage_km"
                  vehicleId={vehicle.id}
                  onValueChange={handleValueChange}
                  type="number"
                />
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Statut</span>
                <VehicleEditableCell
                  value={getLocalValue(vehicle.id, 'status', vehicle.status)}
                  field="status"
                  vehicleId={vehicle.id}
                  onValueChange={handleValueChange}
                  type="status"
                />
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs mb-1">Affecté à</span>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {vehicle.collaborator 
                      ? `${vehicle.collaborator.first_name} ${vehicle.collaborator.last_name}`
                      : <span className="text-muted-foreground italic">Non affecté</span>
                    }
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Échéances */}
        <Card className={ctOverdue ? 'border-destructive' : ctWarning ? 'border-warning' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Échéances
              {ctOverdue && <AlertTriangle className="h-4 w-4 text-destructive" />}
              {ctWarning && <Clock className="h-4 w-4 text-warning" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Contrôle Technique</span>
                <div className="flex items-center gap-2">
                  <VehicleEditableCell
                    value={getLocalValue(vehicle.id, 'ct_due_at', vehicle.ct_due_at)}
                    field="ct_due_at"
                    vehicleId={vehicle.id}
                    onValueChange={handleValueChange}
                    type="date"
                  />
                  {ctOverdue && (
                    <Badge variant="destructive" className="text-xs">Dépassé</Badge>
                  )}
                  {ctWarning && ctDaysLeft && (
                    <Badge variant="secondary" className="text-xs">
                      {ctDaysLeft}j
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs mb-1">Prochaine révision</span>
                <VehicleEditableCell
                  value={getLocalValue(vehicle.id, 'next_revision_at', vehicle.next_revision_at)}
                  field="next_revision_at"
                  vehicleId={vehicle.id}
                  onValueChange={handleValueChange}
                  type="date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {vehicle.notes || 'Aucune note'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Modal */}
      {vehicle.qr_token && (
        <QrCodeModal
          open={showQr}
          onOpenChange={setShowQr}
          assetType="vehicle"
          assetName={vehicle.registration || vehicle.name}
          qrToken={vehicle.qr_token}
        />
      )}

      {/* Edit Dialog */}
      <VehicleFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        vehicle={vehicle}
      />
    </div>
  );
}
