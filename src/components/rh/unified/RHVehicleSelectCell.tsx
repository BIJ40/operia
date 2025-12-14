/**
 * Cellule Select pour attribuer un véhicule à un collaborateur
 * Affiche un Select avec les véhicules disponibles + indicateurs d'alerte CT/Entretien
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFleetVehicles, useUpdateFleetVehicle } from '@/hooks/maintenance/useFleetVehicles';
import { useQueryClient } from '@tanstack/react-query';
import { Info, AlertTriangle, Car, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO, isBefore, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/routes';

interface RHVehicleSelectCellProps {
  collaboratorId: string;
  currentVehicleId: string | null;
  onVehicleChange?: (vehicleId: string | null) => void;
}

export function RHVehicleSelectCell({ collaboratorId, currentVehicleId, onVehicleChange }: RHVehicleSelectCellProps) {
  const { data: vehicles = [], isLoading } = useFleetVehicles();
  const updateVehicle = useUpdateFleetVehicle();
  const queryClient = useQueryClient();

  // Trouver le véhicule actuellement attribué à ce collaborateur
  const currentVehicle = vehicles.find(v => v.assigned_collaborator_id === collaboratorId);

  // Alertes pour le véhicule actuel
  const getAlertStatus = (vehicle: typeof vehicles[0]) => {
    if (!vehicle) return null;
    
    const today = new Date();
    const alerts: { type: 'ct' | 'revision'; label: string; daysLeft: number; critical: boolean }[] = [];
    
    if (vehicle.ct_due_at) {
      const ctDate = parseISO(vehicle.ct_due_at);
      const daysLeft = differenceInDays(ctDate, today);
      const alertDays = vehicle.ct_alert_days || 14;
      
      if (daysLeft <= alertDays) {
        alerts.push({
          type: 'ct',
          label: 'CT',
          daysLeft,
          critical: daysLeft <= 0
        });
      }
    }
    
    if (vehicle.next_revision_at) {
      const revDate = parseISO(vehicle.next_revision_at);
      const daysLeft = differenceInDays(revDate, today);
      const alertDays = vehicle.revision_alert_days || 7;
      
      if (daysLeft <= alertDays) {
        alerts.push({
          type: 'revision',
          label: 'Entretien',
          daysLeft,
          critical: daysLeft <= 0
        });
      }
    }
    
    return alerts.length > 0 ? alerts : null;
  };

  const handleVehicleChange = async (vehicleId: string) => {
    // Si on désattribue
    if (vehicleId === 'none') {
      if (currentVehicle) {
        try {
          await updateVehicle.mutateAsync({
            vehicleId: currentVehicle.id,
            data: { assigned_collaborator_id: null }
          });
          queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
          queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
          toast.success('Véhicule désattribué');
          onVehicleChange?.(null);
        } catch (error) {
          toast.error('Erreur lors de la désattribution');
        }
      }
      return;
    }

    // Sinon on attribue le nouveau véhicule
    try {
      // D'abord désattribuer l'ancien si existant
      if (currentVehicle && currentVehicle.id !== vehicleId) {
        await updateVehicle.mutateAsync({
          vehicleId: currentVehicle.id,
          data: { assigned_collaborator_id: null }
        });
      }
      
      // Puis attribuer le nouveau
      await updateVehicle.mutateAsync({
        vehicleId,
        data: { assigned_collaborator_id: collaboratorId }
      });
      
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] });
      toast.success('Véhicule attribué');
      onVehicleChange?.(vehicleId);
    } catch (error) {
      toast.error('Erreur lors de l\'attribution');
    }
  };

  const alerts = currentVehicle ? getAlertStatus(currentVehicle) : null;
  const hasAlert = alerts && alerts.length > 0;
  const hasCriticalAlert = alerts?.some(a => a.critical);

  // Véhicules disponibles (non attribués ou attribués à ce collaborateur)
  const availableVehicles = vehicles.filter(
    v => v.status === 'active' && (!v.assigned_collaborator_id || v.assigned_collaborator_id === collaboratorId)
  );

  return (
    <div className="flex items-center gap-1">
      <Select
        value={currentVehicle?.id || 'none'}
        onValueChange={handleVehicleChange}
        disabled={isLoading || updateVehicle.isPending}
      >
        <SelectTrigger className={cn(
          "h-7 text-xs w-[140px]",
          hasCriticalAlert && "border-destructive animate-pulse",
          hasAlert && !hasCriticalAlert && "border-orange-500"
        )}>
          <SelectValue placeholder="Aucun véhicule">
            {currentVehicle ? (
              <span className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                {currentVehicle.registration || currentVehicle.name}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Aucun véhicule</span>
          </SelectItem>
          {availableVehicles.map(v => (
            <SelectItem key={v.id} value={v.id}>
              <span className="flex items-center gap-2">
                {v.brand} {v.model} - {v.registration || v.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Info tooltip si véhicule attribué */}
      {currentVehicle && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6",
                  hasCriticalAlert && "text-destructive animate-pulse",
                  hasAlert && !hasCriticalAlert && "text-orange-500"
                )}
              >
                {hasAlert ? <AlertTriangle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1 text-xs">
                <p className="font-medium">{currentVehicle.brand} {currentVehicle.model}</p>
                <p>Immat: {currentVehicle.registration || '—'}</p>
                <p>Km: {currentVehicle.mileage_km?.toLocaleString() || '—'}</p>
                <div className="border-t pt-1 mt-1">
                  <p>CT: {currentVehicle.ct_due_at ? format(parseISO(currentVehicle.ct_due_at), 'dd/MM/yyyy', { locale: fr }) : '—'}</p>
                  <p>Entretien: {currentVehicle.next_revision_at ? format(parseISO(currentVehicle.next_revision_at), 'dd/MM/yyyy', { locale: fr }) : '—'}</p>
                </div>
                {alerts && alerts.length > 0 && (
                  <div className="border-t pt-1 mt-1 text-destructive">
                    {alerts.map((a, i) => (
                      <p key={i}>
                        ⚠️ {a.label}: {a.daysLeft <= 0 ? 'DÉPASSÉ' : `${a.daysLeft}j restants`}
                      </p>
                    ))}
                  </div>
                )}
                <Link 
                  to={ROUTES.rh.parc} 
                  className="flex items-center gap-1 text-primary hover:underline mt-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Gérer le véhicule
                </Link>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
