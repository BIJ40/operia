/**
 * Vue d'ensemble des véhicules - Liste simple et filtres
 * Édition inline (double-clic + auto-save 10s)
 */

import { useState } from 'react';
import { useVehicleInlineEdit } from '@/hooks/maintenance/useVehicleInlineEdit';
import type { FleetVehicle, FleetVehiclesFilters, VehicleStatus, FleetVehicleFormData } from '@/types/maintenance';
import { VEHICLE_STATUSES } from '@/types/maintenance';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertTriangle, Clock, QrCode, Save } from 'lucide-react';
import { VehicleFormDialog } from './VehicleFormDialog';
import { QrCodeModal } from './QrCodeModal';
import { VehicleEditableCell } from './VehicleEditableCell';

interface VehiclesOverviewProps {
  vehicles: FleetVehicle[];
  isLoading: boolean;
}

export function VehiclesOverview({ vehicles, isLoading }: VehiclesOverviewProps) {
  const [filters, setFilters] = useState<FleetVehiclesFilters>({
    status: undefined,
    ctOverdue: false,
    ctDueSoon: false,
    collaboratorId: undefined,
    search: '',
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | undefined>(undefined);
  const [qrVehicle, setQrVehicle] = useState<FleetVehicle | null>(null);

  const { handleValueChange, getLocalValue, saveChanges, hasPendingChanges } = useVehicleInlineEdit();

  // Filtrer les véhicules côté client
  const filteredVehicles = vehicles.filter(v => {
    if (filters.status && v.status !== filters.status) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const match = 
        v.name.toLowerCase().includes(search) ||
        v.registration?.toLowerCase().includes(search) ||
        v.brand?.toLowerCase().includes(search) ||
        v.model?.toLowerCase().includes(search);
      if (!match) return false;
    }
    // Les filtres CT sont gérés par le hook, mais on peut aussi filtrer ici si besoin
    return true;
  });

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const handleStatusChange = (status: VehicleStatus | 'all') => {
    setFilters((prev) => ({
      ...prev,
      status: status === 'all' ? undefined : status,
    }));
  };

  const handleCtFilterChange = (key: 'ctOverdue' | 'ctDueSoon') => {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddVehicle = () => {
    setEditingVehicle(undefined);
    setIsFormOpen(true);
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between shrink-0">
        <div>
          <CardTitle>Véhicules</CardTitle>
          <CardDescription>
            Double-clic pour modifier • Sauvegarde auto après 10s
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasPendingChanges && (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="gap-1"
              onClick={() => saveChanges()}
            >
              <Save className="h-3.5 w-3.5" />
              Sauvegarder
            </Button>
          )}
          <Input
            placeholder="Rechercher (nom, immat.)"
            className="w-48"
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <Select
            defaultValue="all"
            onValueChange={(v) => handleStatusChange(v as VehicleStatus | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {VEHICLE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={filters.ctOverdue ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCtFilterChange('ctOverdue')}
            className="gap-1"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            CT en retard
          </Button>
          <Button
            type="button"
            variant={filters.ctDueSoon ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCtFilterChange('ctDueSoon')}
            className="gap-1"
          >
            <Clock className="h-3.5 w-3.5" />
            CT &lt; 30j
          </Button>

          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            className="gap-1"
            onClick={handleAddVehicle}
          >
            <Plus className="h-3.5 w-3.5" />
            Véhicule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <VehiclesSkeleton />
        ) : filteredVehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun véhicule trouvé avec ces filtres.
          </p>
        ) : (
          <div className="overflow-x-auto" data-vehicle-table>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-medium">Nom</th>
                  <th className="px-4 py-2 text-left font-medium">Immat.</th>
                  <th className="px-4 py-2 text-left font-medium">Marque</th>
                  <th className="px-4 py-2 text-left font-medium">Modèle</th>
                  <th className="px-4 py-2 text-left font-medium">Km</th>
                  <th className="px-4 py-2 text-left font-medium">CT</th>
                  <th className="px-4 py-2 text-left font-medium">Révision</th>
                  <th className="px-4 py-2 text-left font-medium">Statut</th>
                  <th className="px-4 py-2 text-left font-medium">Affecté à</th>
                  <th className="px-4 py-2 text-left font-medium w-12">QR</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <VehicleRow 
                    key={vehicle.id}
                    vehicle={vehicle}
                    getLocalValue={getLocalValue}
                    onValueChange={handleValueChange}
                    onShowQr={(v) => setQrVehicle(v)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <VehicleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        vehicle={editingVehicle}
      />

      {qrVehicle && qrVehicle.qr_token && (
        <QrCodeModal
          open={!!qrVehicle}
          onOpenChange={(open) => !open && setQrVehicle(null)}
          assetType="vehicle"
          assetName={qrVehicle.name}
          qrToken={qrVehicle.qr_token}
        />
      )}
    </Card>
  );
}

function VehiclesSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

interface VehicleRowProps {
  vehicle: FleetVehicle;
  getLocalValue: (vehicleId: string, field: keyof FleetVehicleFormData, originalValue: unknown) => unknown;
  onValueChange: (vehicleId: string, field: keyof FleetVehicleFormData, value: unknown) => void;
  onShowQr: (vehicle: FleetVehicle) => void;
}

function VehicleRow({ vehicle, getLocalValue, onValueChange, onShowQr }: VehicleRowProps) {
  return (
    <tr className="border-b hover:bg-muted/20">
      <td className="py-1 pr-4 align-middle">
        <VehicleEditableCell
          value={getLocalValue(vehicle.id, 'name', vehicle.name)}
          field="name"
          vehicleId={vehicle.id}
          onValueChange={onValueChange}
        />
      </td>
      <td className="px-4 py-1 align-middle">
        <VehicleEditableCell
          value={getLocalValue(vehicle.id, 'registration', vehicle.registration)}
          field="registration"
          vehicleId={vehicle.id}
          onValueChange={onValueChange}
          className="font-mono"
        />
      </td>
      <td className="px-4 py-1 align-middle">
        <VehicleEditableCell
          value={getLocalValue(vehicle.id, 'brand', vehicle.brand)}
          field="brand"
          vehicleId={vehicle.id}
          onValueChange={onValueChange}
        />
      </td>
      <td className="px-4 py-1 align-middle">
        <VehicleEditableCell
          value={getLocalValue(vehicle.id, 'model', vehicle.model)}
          field="model"
          vehicleId={vehicle.id}
          onValueChange={onValueChange}
        />
      </td>
      <td className="px-4 py-1 align-middle">
        <VehicleEditableCell
          value={getLocalValue(vehicle.id, 'mileage_km', vehicle.mileage_km)}
          field="mileage_km"
          vehicleId={vehicle.id}
          onValueChange={onValueChange}
          type="number"
        />
      </td>
      <td className="px-4 py-1 align-middle">
        <VehicleEditableCell
          value={getLocalValue(vehicle.id, 'ct_due_at', vehicle.ct_due_at)}
          field="ct_due_at"
          vehicleId={vehicle.id}
          onValueChange={onValueChange}
          type="date"
        />
      </td>
      <td className="px-4 py-1 align-middle">
        <VehicleEditableCell
          value={getLocalValue(vehicle.id, 'next_revision_at', vehicle.next_revision_at)}
          field="next_revision_at"
          vehicleId={vehicle.id}
          onValueChange={onValueChange}
          type="date"
        />
      </td>
      <td className="px-4 py-1 align-middle">
        <VehicleEditableCell
          value={getLocalValue(vehicle.id, 'status', vehicle.status)}
          field="status"
          vehicleId={vehicle.id}
          onValueChange={onValueChange}
          type="status"
        />
      </td>
      <td className="px-4 py-1 align-middle text-sm">
        {vehicle.collaborator
          ? `${vehicle.collaborator.first_name} ${vehicle.collaborator.last_name}`
          : <span className="text-muted-foreground">Non affecté</span>}
      </td>
      <td className="px-4 py-1 align-middle">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onShowQr(vehicle);
          }}
          title="Afficher le QR Code"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
