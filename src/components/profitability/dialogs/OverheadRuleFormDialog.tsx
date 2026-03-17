/**
 * OverheadRuleFormDialog — Create/edit an agency overhead rule.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { OVERHEAD_COST_TYPE_LABELS } from '../constants';
import { useOverheadMutations } from '../hooks/useOverheadMutations';
import type { AgencyOverheadRule, OverheadCostType, OverheadAllocationMode } from '@/types/projectProfitability';

const ALLOCATION_MODE_LABELS: Record<string, string> = {
  per_project: 'Par dossier',
  percentage_ca: '% du CA',
  per_hour: 'Par heure',
  fixed: 'Fixe',
};

const schema = z.object({
  cost_type: z.enum(['rent', 'vehicle', 'fuel', 'admin', 'software', 'insurance', 'other']),
  period_month: z.string().optional(),
  amount_ht: z.coerce.number().min(0),
  allocation_mode: z.enum(['per_project', 'percentage_ca', 'per_hour', 'fixed']),
  allocation_value: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  rule?: AgencyOverheadRule;
}

export function OverheadRuleFormDialog({ open, onOpenChange, agencyId, rule }: Props) {
  const isEdit = !!rule;
  const { upsertRule } = useOverheadMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cost_type: rule?.cost_type ?? 'rent',
      period_month: rule?.period_month ?? '',
      amount_ht: rule?.amount_ht ?? 0,
      allocation_mode: rule?.allocation_mode ?? 'per_project',
      allocation_value: rule?.allocation_value ?? 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        cost_type: rule?.cost_type ?? 'rent',
        period_month: rule?.period_month ?? '',
        amount_ht: rule?.amount_ht ?? 0,
        allocation_mode: rule?.allocation_mode ?? 'per_project',
        allocation_value: rule?.allocation_value ?? 0,
      });
    }
  }, [open, rule]);

  const onSubmit = async (values: FormValues) => {
    await upsertRule.mutateAsync({
      ...(isEdit && rule?.id ? { id: rule.id } : {}),
      agency_id: agencyId,
      cost_type: values.cost_type as OverheadCostType,
      period_month: values.period_month || null,
      amount_ht: values.amount_ht,
      allocation_mode: values.allocation_mode as OverheadAllocationMode,
      allocation_value: values.allocation_value,
      validation_status: 'draft',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la règle' : 'Ajouter une règle de charge'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="cost_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type de charge</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(OVERHEAD_COST_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="period_month" render={({ field }) => (
              <FormItem>
                <FormLabel>Période (mois, optionnel)</FormLabel>
                <FormControl><Input type="month" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="amount_ht" render={({ field }) => (
              <FormItem>
                <FormLabel>Montant HT (€)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="allocation_mode" render={({ field }) => (
              <FormItem>
                <FormLabel>Mode d'imputation</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(ALLOCATION_MODE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="allocation_value" render={({ field }) => (
              <FormItem>
                <FormLabel>Valeur d'imputation</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={upsertRule.isPending}>
                {upsertRule.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {isEdit ? 'Modifier' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
