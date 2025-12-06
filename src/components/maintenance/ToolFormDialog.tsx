/**
 * Dialog de création / édition d'un outil / EPI
 */

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
import { TOOL_STATUSES, TOOL_CATEGORIES } from '@/types/maintenance';
import type { Tool, ToolFormData, ToolStatus, ToolCategory } from '@/types/maintenance';
import { useCreateTool, useUpdateTool } from '@/hooks/maintenance/useTools';
import { useCollaborators } from '@/hooks/useCollaborators';
import { toast } from 'sonner';

const toolSchema = z.object({
  label: z.string().min(1, 'Le libellé est requis'),
  category: z.string().min(1, 'La catégorie est requise'),
  serial_number: z.string().optional(),
  status: z.string().default('in_service'),
  assigned_collaborator_id: z.string().optional(),
});

type ToolFormValues = z.infer<typeof toolSchema>;

interface ToolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: Tool;
}

export function ToolFormDialog({ open, onOpenChange, tool }: ToolFormDialogProps) {
  const isEdit = !!tool;
  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const { collaborators = [] } = useCollaborators();

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolSchema),
    defaultValues: {
      label: tool?.label || '',
      category: tool?.category || 'other',
      serial_number: tool?.serial_number || '',
      status: tool?.status || 'in_service',
      assigned_collaborator_id: tool?.assigned_collaborator_id || '',
    },
  });

  const onSubmit = async (data: ToolFormValues) => {
    const payload: ToolFormData = {
      label: data.label,
      category: data.category as ToolCategory,
      serial_number: data.serial_number || undefined,
      status: data.status as ToolStatus,
      assigned_collaborator_id: data.assigned_collaborator_id || undefined,
    };

    try {
      if (isEdit && tool) {
        await updateTool.mutateAsync({ toolId: tool.id, data: payload });
        toast.success('Matériel mis à jour');
      } else {
        await createTool.mutateAsync(payload);
        toast.success('Matériel créé');
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const activeCollaborators = collaborators.filter((c) => !c.leaving_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le matériel' : 'Ajouter un matériel / EPI'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifiez les informations du matériel.'
              : 'Renseignez les informations du nouveau matériel ou EPI.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Libellé *</Label>
            <Input
              id="label"
              placeholder="Ex: Perceuse Makita, Casque de chantier..."
              {...form.register('label')}
            />
            {form.formState.errors.label && (
              <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) => form.setValue('category', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {TOOL_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {TOOL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">N° de série</Label>
            <Input
              id="serial_number"
              placeholder="SN-12345"
              {...form.register('serial_number')}
            />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createTool.isPending || updateTool.isPending}>
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
