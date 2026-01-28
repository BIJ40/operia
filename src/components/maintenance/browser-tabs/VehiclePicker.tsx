/**
 * Dropdown pour ouvrir un véhicule dans un onglet
 */

import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Check, Car, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FleetVehicle } from '@/types/maintenance';
import { differenceInDays, parseISO } from 'date-fns';

interface VehiclePickerProps {
  vehicles: FleetVehicle[];
  onSelect: (vehicle: FleetVehicle) => void;
  isTabOpen: (vehicleId: string) => boolean;
}

export function VehiclePicker({
  vehicles,
  onSelect,
  isTabOpen,
}: VehiclePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filtrer et trier les véhicules
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        const searchLower = search.toLowerCase();
        return (
          v.name.toLowerCase().includes(searchLower) ||
          v.registration?.toLowerCase().includes(searchLower) ||
          v.brand?.toLowerCase().includes(searchLower) ||
          v.model?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        // Véhicules actifs d'abord
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return (a.registration || a.name).localeCompare(b.registration || b.name);
      });
  }, [vehicles, search]);

  // Vérifier les alertes CT
  const hasCtAlert = (vehicle: FleetVehicle) => {
    if (!vehicle.ct_due_at) return false;
    const daysLeft = differenceInDays(parseISO(vehicle.ct_due_at), new Date());
    return daysLeft <= 30;
  };

  const isCtOverdue = (vehicle: FleetVehicle) => {
    if (!vehicle.ct_due_at) return false;
    const daysLeft = differenceInDays(parseISO(vehicle.ct_due_at), new Date());
    return daysLeft <= 0;
  };
  
  const handleSelect = (vehicle: FleetVehicle) => {
    onSelect(vehicle);
    setOpen(false);
    setSearch('');
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 mb-1 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ouvrir...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Barre de recherche */}
        {vehicles.length > 5 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (nom, immat, marque)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        )}
        
        <div className="max-h-[300px] overflow-y-auto">
          {filteredVehicles.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun véhicule trouvé
            </div>
          ) : (
            <div className="py-1">
              {filteredVehicles.map(vehicle => {
                const isOpen = isTabOpen(vehicle.id);
                const ctOverdue = isCtOverdue(vehicle);
                const ctWarning = hasCtAlert(vehicle) && !ctOverdue;
                
                return (
                  <button
                    key={vehicle.id}
                    onClick={() => handleSelect(vehicle)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isOpen && 'bg-accent/50'
                    )}
                  >
                    <Car className={cn(
                      'h-4 w-4 shrink-0',
                      ctOverdue && 'text-destructive',
                      ctWarning && 'text-warning'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-medium">
                          {vehicle.registration || vehicle.name}
                        </span>
                        {ctOverdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        {ctWarning && <Clock className="h-3.5 w-3.5 text-warning shrink-0" />}
                      </div>
                      {vehicle.brand && vehicle.model && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {vehicle.brand} {vehicle.model}
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
