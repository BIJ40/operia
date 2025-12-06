/**
 * Onglet Plans préventifs - Modèles de contrôles périodiques
 */

import { useState } from 'react';
import {
  useMaintenancePlans,
  useCreatePlanTemplate,
  useUpdatePlanTemplate,
  useDeletePlanTemplate,
  useCreatePlanItem,
  useDeletePlanItem,
} from '@/hooks/maintenance/useMaintenancePlans';
import type {
  MaintenancePlanTemplate,
  MaintenancePlanItem,
  MaintenanceTargetType,
  MaintenancePlanTemplateFormData,
  MaintenancePlanItemFormData,
  FrequencyUnit,
} from '@/types/maintenance';
import { FREQUENCY_UNITS } from '@/types/maintenance';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Settings, FileText } from 'lucide-react';

export function PlansTab() {
  const [targetType, setTargetType] = useState<MaintenanceTargetType | 'all'>('all');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: plans = [], isLoading } = useMaintenancePlans(
    undefined,
    targetType === 'all' ? undefined : targetType
  );

  // Dérivation du plan sélectionné depuis la liste (synchronisation auto avec React Query)
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  const createPlanTemplate = useCreatePlanTemplate();
  const deletePlanTemplate = useDeletePlanTemplate();

  const handleCreatePlan = async (payload: MaintenancePlanTemplateFormData) => {
    try {
      await createPlanTemplate.mutateAsync(payload);
      setIsCreateModalOpen(false);
      toast.success('Plan créé');
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await deletePlanTemplate.mutateAsync(planId);
      if (selectedPlanId === planId) {
        setSelectedPlanId(null);
      }
      toast.success('Plan supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Plans préventifs
          </CardTitle>
          <CardDescription>
            Modèles de contrôles périodiques par type de cible
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select
            defaultValue="all"
            onValueChange={(v) => setTargetType(v as MaintenanceTargetType | 'all')}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type de cible" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="vehicle">Véhicules</SelectItem>
              <SelectItem value="tool">Matériel & EPI</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Nouveau plan
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 md:flex-row">
        {/* Liste des plans */}
        <div className="w-full md:w-1/3">
          {isLoading ? (
            <PlansSkeleton />
          ) : plans.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                Aucun plan. Créez un premier modèle.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/60 ${
                    selectedPlanId === plan.id ? 'border-primary bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{plan.name}</span>
                    {plan.is_default_for_category && (
                      <Badge variant="outline" className="text-[10px]">
                        Défaut
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {plan.target_type === 'vehicle' ? 'Véhicules' : 'Matériel & EPI'}
                    {plan.target_category ? ` · ${plan.target_category}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Détail du plan sélectionné */}
        <div className="w-full md:w-2/3">
          {selectedPlan ? (
            <PlanDetail
              plan={selectedPlan}
              onPlanDeleted={handleDeletePlan}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8">
              <p className="text-sm text-muted-foreground">
                Sélectionnez un plan pour voir / éditer ses items
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {isCreateModalOpen && (
        <PlanTemplateModal
          onCancel={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreatePlan}
          isSubmitting={createPlanTemplate.isPending}
        />
      )}
    </Card>
  );
}

function PlansSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

interface PlanDetailProps {
  plan: MaintenancePlanTemplate;
  onPlanDeleted: (planId: string) => void;
}

function PlanDetail({ plan, onPlanDeleted }: PlanDetailProps) {
  const createItem = useCreatePlanItem();
  const deleteItem = useDeletePlanItem();

  const [newItem, setNewItem] = useState<MaintenancePlanItemFormData>({
    label: '',
    frequency_unit: 'months',
    frequency_value: 12,
    first_due_after_days: 0,
    is_mandatory: true,
  });

  const handleAddItem = async () => {
    if (!newItem.label.trim()) {
      toast.error('Le label est requis');
      return;
    }
    try {
      await createItem.mutateAsync({ planTemplateId: plan.id, data: newItem });
      setNewItem({
        label: '',
        frequency_unit: 'months',
        frequency_value: 12,
        first_due_after_days: 0,
        is_mandatory: true,
      });
      toast.success('Contrôle ajouté');
    } catch {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItem.mutateAsync(itemId);
      toast.success('Contrôle supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const frequencyLabel = (unit: FrequencyUnit) => {
    const found = FREQUENCY_UNITS.find((f) => f.value === unit);
    return found?.label || unit;
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {/* En-tête du plan */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{plan.name}</span>
            {plan.is_default_for_category && (
              <Badge variant="outline" className="text-xs">
                Défaut catégorie
              </Badge>
            )}
          </div>
          {plan.description && (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {plan.target_type === 'vehicle' ? 'Véhicules' : 'Matériel & EPI'}
            {plan.target_category ? ` · ${plan.target_category}` : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPlanDeleted(plan.id)}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </Button>
      </div>

      {/* Items du plan */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Contrôles planifiés</h3>
        <div className="rounded-md border">
          {plan.items && plan.items.length > 0 ? (
            <div className="divide-y">
              {plan.items.map((item: MaintenancePlanItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>
                        Tous les {item.frequency_value} {frequencyLabel(item.frequency_unit).toLowerCase()}
                      </span>
                      {item.first_due_after_days ? (
                        <span>· 1ère échéance J+{item.first_due_after_days}</span>
                      ) : null}
                      {item.is_mandatory && <span>· Obligatoire</span>}
                    </div>
                    {item.legal_reference && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Réf. : {item.legal_reference}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteItem(item.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun contrôle. Ajoutez-en ci-dessous.
            </div>
          )}
        </div>

        {/* Formulaire d'ajout */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Ajouter un contrôle
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <Input
                placeholder="Label (ex: CT, vérif annuelle...)"
                value={newItem.label}
                onChange={(e) => setNewItem((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <Input
              type="number"
              className="w-20"
              min={1}
              value={newItem.frequency_value}
              onChange={(e) =>
                setNewItem((prev) => ({
                  ...prev,
                  frequency_value: Number(e.target.value) || 1,
                }))
              }
            />
            <Select
              value={newItem.frequency_unit}
              onValueChange={(v) =>
                setNewItem((prev) => ({
                  ...prev,
                  frequency_unit: v as FrequencyUnit,
                }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_UNITS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={createItem.isPending}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PlanTemplateModalProps {
  onCancel: () => void;
  onSubmit: (payload: MaintenancePlanTemplateFormData) => void | Promise<void>;
  isSubmitting: boolean;
}

function PlanTemplateModal({ onCancel, onSubmit, isSubmitting }: PlanTemplateModalProps) {
  const [form, setForm] = useState<MaintenancePlanTemplateFormData>({
    name: '',
    target_type: 'vehicle',
    target_category: '',
    description: '',
    is_default_for_category: false,
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    await onSubmit(form);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un plan préventif</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nom du plan *</label>
            <Input
              placeholder="Ex: Véhicule utilitaire standard"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type de cible</label>
            <Select
              value={form.target_type}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, target_type: v as MaintenanceTargetType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle">Véhicules</SelectItem>
                <SelectItem value="tool">Matériel & EPI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Catégorie (optionnel)</label>
            <Input
              placeholder="Ex: epi, power_tool..."
              value={form.target_category || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, target_category: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optionnel)</label>
            <Input
              placeholder="Description du plan..."
              value={form.description || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
