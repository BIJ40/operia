/**
 * Onglet Véhicules - Liste et filtres des véhicules de l'agence
 */

import { useState } from 'react';
import { useFleetVehicles } from '@/hooks/maintenance/useFleetVehicles';
import type { FleetVehicle, FleetVehiclesFilters, VehicleStatus } from '@/types/maintenance';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertTriangle, Clock, QrCode } from 'lucide-react';
import { VehicleFormDialog } from './VehicleFormDialog';
import { QrCodeModal } from './QrCodeModal';

export function VehiclesTab() {
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

  const { data: vehicles = [], isLoading } = useFleetVehicles(undefined, filters);

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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Véhicules</CardTitle>
          <CardDescription>
            Suivi CT, révisions, kilométrage et statut des véhicules
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => {
              setEditingVehicle(undefined);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Véhicule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <VehiclesSkeleton />
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucun véhicule trouvé avec ces filtres.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-medium">Véhicule</th>
                  <th className="px-4 py-2 text-left font-medium">Immat.</th>
                  <th className="px-4 py-2 text-left font-medium">Km</th>
                  <th className="px-4 py-2 text-left font-medium">CT</th>
                  <th className="px-4 py-2 text-left font-medium">Prochaine révision</th>
                  <th className="px-4 py-2 text-left font-medium">Statut</th>
                  <th className="px-4 py-2 text-left font-medium">Affecté à</th>
                  <th className="px-4 py-2 text-left font-medium w-12">QR</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <VehicleRow 
                    key={vehicle.id}
                    vehicle={vehicle} 
                    onEdit={(v) => {
                      setEditingVehicle(v);
                      setIsFormOpen(true);
                    }}
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
  onEdit: (vehicle: FleetVehicle) => void;
  onShowQr: (vehicle: FleetVehicle) => void;
}

function VehicleRow({ vehicle, onEdit, onShowQr }: VehicleRowProps) {
  const ctLabel = vehicle.ct_due_at
    ? new Date(vehicle.ct_due_at).toLocaleDateString('fr-FR')
    : '—';

  const nextRevLabel = vehicle.next_revision_at
    ? new Date(vehicle.next_revision_at).toLocaleDateString('fr-FR')
    : '—';

  const statusConfig = VEHICLE_STATUSES.find((s) => s.value === vehicle.status);
  const statusVariant = vehicle.status === 'active' ? 'default' : 'secondary';

  return (
    <tr className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => onEdit(vehicle)}>
      <td className="py-2 pr-4 align-middle">
        <div className="flex flex-col">
          <span className="font-medium">{vehicle.name}</span>
          {(vehicle.brand || vehicle.model) && (
            <span className="text-xs text-muted-foreground">
              {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2 align-middle text-sm font-mono">
        {vehicle.registration || '—'}
      </td>
      <td className="px-4 py-2 align-middle text-sm">
        {vehicle.mileage_km != null
          ? `${vehicle.mileage_km.toLocaleString('fr-FR')} km`
          : '—'}
      </td>
      <td className="px-4 py-2 align-middle text-sm">{ctLabel}</td>
      <td className="px-4 py-2 align-middle text-sm">{nextRevLabel}</td>
      <td className="px-4 py-2 align-middle">
        <Badge variant={statusVariant} className="text-xs">
          {statusConfig?.label || vehicle.status}
        </Badge>
      </td>
      <td className="px-4 py-2 align-middle text-sm">
        {vehicle.collaborator
          ? `${vehicle.collaborator.first_name} ${vehicle.collaborator.last_name}`
          : <span className="text-muted-foreground">Non affecté</span>}
      </td>
      <td className="px-4 py-2 align-middle">
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
