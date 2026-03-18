/**
 * ProjectCostFormDialog — Create/edit a project cost.
 * If a document file is attached, it is uploaded BEFORE creating the cost record.
 */
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';
import { PROJECT_COST_TYPE_LABELS } from '../constants';
import { useProjectCostsMutations } from '../hooks/useProjectCostsMutations';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectCost, ProjectCostType, CostInputSource } from '@/types/projectProfitability';
import { toast } from 'sonner';

const schema = z.object({
  cost_type: z.enum(['purchase', 'subcontract', 'travel', 'rental', 'misc']),
  description: z.string().optional(),
  cost_date: z.string().optional(),
  amount_ht: z.coerce.number().positive('Le montant HT doit être > 0'),
  vat_rate: z.coerce.number().min(0).max(100).default(20),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  agencyId: string;
  cost?: ProjectCost; // edit mode
}

export function ProjectCostFormDialog({ open, onOpenChange, projectId, agencyId, cost }: Props) {
  const isEdit = !!cost;
  const { createCost, updateCost } = useProjectCostsMutations(projectId);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cost_type: cost?.cost_type ?? 'purchase',
      description: cost?.description ?? '',
      cost_date: cost?.cost_date ?? new Date().toISOString().slice(0, 10),
      amount_ht: cost?.amount_ht ?? 0,
      vat_rate: cost?.vat_rate ?? 20,
    },
  });

  // Reset when opening
  useEffect(() => {
    if (open) {
      form.reset({
        cost_type: cost?.cost_type ?? 'purchase',
        description: cost?.description ?? '',
        cost_date: cost?.cost_date ?? new Date().toISOString().slice(0, 10),
        amount_ht: cost?.amount_ht ?? 0,
        vat_rate: cost?.vat_rate ?? 20,
      });
      setFile(null);
    }
  }, [open, cost]);

  const watchHT = form.watch('amount_ht');
  const watchVAT = form.watch('vat_rate');
  const computedTTC = watchHT * (1 + (watchVAT ?? 20) / 100);

  const onSubmit = async (values: FormValues) => {
    setUploading(true);
    try {
      let documentPath: string | null = cost?.document_path ?? null;
      let source: CostInputSource = cost?.source ?? 'manual';

      // 1. Upload file first if attached
      if (file) {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${agencyId}/${projectId}/${timestamp}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(path, file);
        if (uploadError) {
          toast.error('Erreur upload document');
          setUploading(false);
          return;
        }
        documentPath = path;
        source = 'invoice_upload';
      }

      // 2. Create or update cost record
      const payload = {
        agency_id: agencyId,
        project_id: projectId,
        cost_type: values.cost_type as ProjectCostType,
        description: values.description || null,
        cost_date: values.cost_date || null,
        amount_ht: values.amount_ht,
        vat_rate: values.vat_rate,
        amount_ttc: values.amount_ht * (1 + (values.vat_rate ?? 20) / 100),
        source,
        document_path: documentPath,
        validation_status: 'draft' as const,
      };

      if (isEdit && cost) {
        await updateCost.mutateAsync({ id: cost.id, updates: payload });
      } else {
        await createCost.mutateAsync({
          ...payload,
          extracted_data_json: null,
          validated_by: null,
          validated_at: null,
          created_by: null,
        });
      }

      onOpenChange(false);
    } catch {
      // Error handled by mutation
    } finally {
      setUploading(false);
    }
  };

  const isPending = createCost.isPending || updateCost.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le coût' : 'Ajouter un coût'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cost_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PROJECT_COST_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input {...field} placeholder="Description optionnelle" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount_ht"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant HT (€)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TVA (%)</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              TTC calculé : <strong>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(computedTTC)}</strong>
            </div>

            {/* Document attachment */}
            <div>
              <FormLabel>Document (optionnel)</FormLabel>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {file ? file.name : 'Joindre un fichier'}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {isEdit ? 'Modifier' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
