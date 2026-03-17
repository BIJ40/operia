/**
 * CostProfileEditorDialog — Edit employee cost profile (salary, charges, hourly rate).
 * Only works when technicianId is resolved to a collaborator via apogee_user_id.
 */
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Calculator } from 'lucide-react';
import { useCostProfileMutations } from '../hooks/useCostProfileMutations';
import { formatCurrency } from '../constants';
import type { EmployeeCostProfile } from '@/types/projectProfitability';

const schema = z.object({
  salary_gross_monthly: z.coerce.number().min(0).nullable(),
  employer_charges_rate: z.coerce.number().min(0).max(100).nullable(),
  employer_monthly_cost: z.coerce.number().min(0).nullable(),
  monthly_paid_hours: z.coerce.number().min(0).nullable(),
  monthly_productive_hours: z.coerce.number().min(1, 'Heures productives requises'),
  vehicle_monthly_cost: z.coerce.number().min(0).nullable(),
  fuel_monthly_cost: z.coerce.number().min(0).nullable(),
  equipment_monthly_cost: z.coerce.number().min(0).nullable(),
  other_monthly_costs: z.coerce.number().min(0).nullable(),
  effective_from: z.string().min(1, 'Date d\'effet requise'),
  effective_to: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string;
  collaboratorName: string;
  agencyId: string;
  existingProfile?: EmployeeCostProfile;
}

export function CostProfileEditorDialog({
  open, onOpenChange, collaboratorId, collaboratorName, agencyId, existingProfile,
}: Props) {
  const { upsertProfile } = useCostProfileMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      salary_gross_monthly: existingProfile?.salary_gross_monthly ?? null,
      employer_charges_rate: existingProfile?.employer_charges_rate ?? 45,
      employer_monthly_cost: existingProfile?.employer_monthly_cost ?? null,
      monthly_paid_hours: existingProfile?.monthly_paid_hours ?? 151.67,
      monthly_productive_hours: existingProfile?.monthly_productive_hours ?? 130,
      vehicle_monthly_cost: existingProfile?.vehicle_monthly_cost ?? null,
      fuel_monthly_cost: existingProfile?.fuel_monthly_cost ?? null,
      equipment_monthly_cost: existingProfile?.equipment_monthly_cost ?? null,
      other_monthly_costs: existingProfile?.other_monthly_costs ?? null,
      effective_from: existingProfile?.effective_from ?? new Date().toISOString().slice(0, 10),
      effective_to: existingProfile?.effective_to ?? null,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        salary_gross_monthly: existingProfile?.salary_gross_monthly ?? null,
        employer_charges_rate: existingProfile?.employer_charges_rate ?? 45,
        employer_monthly_cost: existingProfile?.employer_monthly_cost ?? null,
        monthly_paid_hours: existingProfile?.monthly_paid_hours ?? 151.67,
        monthly_productive_hours: existingProfile?.monthly_productive_hours ?? 130,
        vehicle_monthly_cost: existingProfile?.vehicle_monthly_cost ?? null,
        fuel_monthly_cost: existingProfile?.fuel_monthly_cost ?? null,
        equipment_monthly_cost: existingProfile?.equipment_monthly_cost ?? null,
        other_monthly_costs: existingProfile?.other_monthly_costs ?? null,
        effective_from: existingProfile?.effective_from ?? new Date().toISOString().slice(0, 10),
        effective_to: existingProfile?.effective_to ?? null,
      });
    }
  }, [open, existingProfile]);

  const values = form.watch();

  const computedHourlyCost = useMemo(() => {
    const employer = values.employer_monthly_cost ?? 0;
    const vehicle = values.vehicle_monthly_cost ?? 0;
    const fuel = values.fuel_monthly_cost ?? 0;
    const equipment = values.equipment_monthly_cost ?? 0;
    const other = values.other_monthly_costs ?? 0;
    const hours = values.monthly_productive_hours ?? 1;
    if (hours <= 0) return 0;
    return (employer + vehicle + fuel + equipment + other) / hours;
  }, [values]);

  const handleRecalculate = () => {
    const gross = values.salary_gross_monthly ?? 0;
    const rate = values.employer_charges_rate ?? 0;
    const employerCost = gross * (1 + rate / 100);
    form.setValue('employer_monthly_cost', Math.round(employerCost * 100) / 100);
  };

  const onSubmit = async (data: FormValues) => {
    await upsertProfile.mutateAsync({
      ...(existingProfile?.id ? { id: existingProfile.id } : {}),
      agency_id: agencyId,
      collaborator_id: collaboratorId,
      salary_gross_monthly: data.salary_gross_monthly,
      employer_charges_rate: data.employer_charges_rate,
      employer_monthly_cost: data.employer_monthly_cost,
      monthly_paid_hours: data.monthly_paid_hours,
      monthly_productive_hours: data.monthly_productive_hours,
      vehicle_monthly_cost: data.vehicle_monthly_cost,
      fuel_monthly_cost: data.fuel_monthly_cost,
      equipment_monthly_cost: data.equipment_monthly_cost,
      other_monthly_costs: data.other_monthly_costs,
      loaded_hourly_cost: Math.round(computedHourlyCost * 100) / 100,
      cost_source: 'manual',
      effective_from: data.effective_from,
      effective_to: data.effective_to || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil coût — {collaboratorName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Salary */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="salary_gross_monthly" render={({ field }) => (
                <FormItem>
                  <FormLabel>Salaire brut mensuel (€)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="employer_charges_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Taux charges (%)</FormLabel>
                  <FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex items-end gap-2">
              <FormField control={form.control} name="employer_monthly_cost" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Coût employeur mensuel (€)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="button" variant="outline" size="sm" onClick={handleRecalculate} className="mb-0.5">
                <Calculator className="h-3.5 w-3.5 mr-1" />
                Calculer
              </Button>
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="monthly_paid_hours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Heures payées/mois</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="monthly_productive_hours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Heures productives/mois</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Additional costs */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="vehicle_monthly_cost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Véhicule (€/mois)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="fuel_monthly_cost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Carburant (€/mois)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="equipment_monthly_cost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Équipement (€/mois)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="other_monthly_costs" render={({ field }) => (
                <FormItem>
                  <FormLabel>Autres (€/mois)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
            </div>

            {/* Computed rate */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <span className="text-muted-foreground">Coût horaire chargé calculé : </span>
              <strong>{formatCurrency(computedHourlyCost)}/h</strong>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="effective_from" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'effet</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="effective_to" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de fin (optionnel)</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={upsertProfile.isPending}>
                {upsertProfile.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
