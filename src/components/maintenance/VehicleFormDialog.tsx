/**
 * Dialog de création / édition d'un véhicule
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VEHICLE_STATUSES } from '@/types/maintenance';
import type { FleetVehicle, FleetVehicleFormData, VehicleStatus } from '@/types/maintenance';
import { useCreateFleetVehicle, useUpdateFleetVehicle } from '@/hooks/maintenance/useFleetVehicles';
import { useCollaborators } from '@/hooks/useCollaborators';
import { toast } from 'sonner';

// Callback optionnel pour ouvrir le véhicule créé dans un onglet
export type OnVehicleCreated = (vehicleId: string, label: string) => void;

const vehicleSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  registration: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  mileage_km: z.coerce.number().optional(),
  status: z.string().default('active'),
  ct_due_at: z.string().optional(),
  next_revision_at: z.string().optional(),
  assigned_collaborator_id: z.string().optional(),
  notes: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: FleetVehicle;
  onVehicleCreated?: OnVehicleCreated;
}

export function VehicleFormDialog({ open, onOpenChange, vehicle, onVehicleCreated }: VehicleFormDialogProps) {
  const isEdit = !!vehicle;
  const createVehicle = useCreateFleetVehicle();
  const updateVehicle = useUpdateFleetVehicle();
  const { collaborators = [], isLoading: collaboratorsLoading } = useCollaborators();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: '',
      registration: '',
      brand: '',
      model: '',
      year: undefined,
      mileage_km: undefined,
      status: 'active',
      ct_due_at: '',
      next_revision_at: '',
      assigned_collaborator_id: '',
      notes: '',
    },
  });

  // Reset form when vehicle changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: vehicle?.name || '',
        registration: vehicle?.registration || '',
        brand: vehicle?.brand || '',
        model: vehicle?.model || '',
        year: vehicle?.year || undefined,
        mileage_km: vehicle?.mileage_km || undefined,
        status: vehicle?.status || 'active',
        ct_due_at: vehicle?.ct_due_at ? vehicle.ct_due_at.split('T')[0] : '',
        next_revision_at: vehicle?.next_revision_at ? vehicle.next_revision_at.split('T')[0] : '',
        assigned_collaborator_id: vehicle?.assigned_collaborator_id || '',
        notes: vehicle?.notes || '',
      });
    }
  }, [open, vehicle, form]);

  const onSubmit = async (data: VehicleFormValues) => {
    const payload: FleetVehicleFormData = {
      name: data.name,
      registration: data.registration || null,
      brand: data.brand || null,
      model: data.model || null,
      year: data.year || null,
      mileage_km: data.mileage_km || null,
      status: data.status as VehicleStatus,
      ct_due_at: data.ct_due_at || null,
      next_revision_at: data.next_revision_at || null,
      assigned_collaborator_id: data.assigned_collaborator_id || null,
      notes: data.notes || null,
    };

    try {
      if (isEdit && vehicle) {
        await updateVehicle.mutateAsync({ vehicleId: vehicle.id, data: payload });
        toast.success('Véhicule mis à jour');
      } else {
        const newVehicle = await createVehicle.mutateAsync(payload);
        toast.success('Véhicule créé');
        // Ouvrir le véhicule créé dans un onglet si callback fourni
        if (onVehicleCreated && newVehicle) {
          const label = payload.registration || payload.name;
          onVehicleCreated(newVehicle.id, label);
        }
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const activeCollaborators = collaborators.filter((c) => !c.leaving_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifiez les informations du véhicule.' : 'Renseignez les informations du nouveau véhicule.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                placeholder="Ex: Custom 1"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration">Immatriculation</Label>
              <Input
                id="registration"
                placeholder="AA-123-BB"
                {...form.register('registration')}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                placeholder="Renault"
                {...form.register('brand')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modèle</Label>
              <Input
                id="model"
                placeholder="Kangoo"
                {...form.register('model')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Année</Label>
              <Input
                id="year"
                type="number"
                placeholder="2022"
                {...form.register('year')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileage_km">Kilométrage</Label>
              <Input
                id="mileage_km"
                type="number"
                placeholder="50000"
                {...form.register('mileage_km')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) => form.setValue('status', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ct_due_at">Échéance CT</Label>
              <Input
                id="ct_due_at"
                type="date"
                {...form.register('ct_due_at')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_revision_at">Prochaine révision</Label>
              <Input
                id="next_revision_at"
                type="date"
                {...form.register('next_revision_at')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_collaborator_id">Affecté à</Label>
            <Select
              value={form.watch('assigned_collaborator_id') || ''}
              onValueChange={(v) => form.setValue('assigned_collaborator_id', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un collaborateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non affecté</SelectItem>
                {activeCollaborators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Observations, historique..."
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createVehicle.isPending || updateVehicle.isPending}>
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
