/**
 * StatIA Builder - Dialog de sauvegarde d'une métrique
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateCustomMetric, useStatiaBuilderContext } from '../../hooks/useCustomMetrics';
import { CustomMetricDefinition } from '../../services/customMetricsService';
import { Globe, Building2 } from 'lucide-react';

interface SaveMetricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definitionJson: CustomMetricDefinition;
  onSuccess?: () => void;
  mode: 'admin' | 'agency';
  agencySlug?: string;
}

const CATEGORIES = [
  { value: 'ca', label: 'Chiffre d\'affaires' },
  { value: 'devis', label: 'Devis' },
  { value: 'qualite', label: 'Qualité' },
  { value: 'productivite', label: 'Productivité' },
  { value: 'dossier', label: 'Dossiers' },
  { value: 'custom', label: 'Autre' },
];

export function SaveMetricDialog({
  open,
  onOpenChange,
  definitionJson,
  onSuccess,
  mode,
  agencySlug,
}: SaveMetricDialogProps) {
  const { canCreateGlobal, userAgencySlug } = useStatiaBuilderContext();
  const createMutation = useCreateCustomMetric();
  
  // En mode agency, forcer scope='agency' - ne peut pas créer de métriques globales
  const canSelectGlobalScope = mode === 'admin' && canCreateGlobal;
  const effectiveAgencySlug = agencySlug || userAgencySlug;

  const [formData, setFormData] = useState({
    id: '',
    label: '',
    description: '',
    category: 'custom',
    scope: canSelectGlobalScope ? 'global' : 'agency' as 'global' | 'agency',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // En mode agency, forcer scope='agency'
    const finalScope = mode === 'agency' ? 'agency' : formData.scope;
    
    const payload = {
      id: formData.id.toLowerCase().replace(/\s+/g, '_'),
      label: formData.label,
      description: formData.description || undefined,
      category: formData.category,
      scope: finalScope,
      agency_slug: finalScope === 'agency' ? effectiveAgencySlug : undefined,
      definition_json: definitionJson,
    };

    try {
      await createMutation.mutateAsync(payload);
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setFormData({
        id: '',
        label: '',
        description: '',
        category: 'custom',
        scope: canSelectGlobalScope ? 'global' : 'agency',
      });
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sauvegarder la métrique</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id">Identifiant technique</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="ex: ca_technicien_mensuel"
              required
            />
            <p className="text-xs text-muted-foreground">
              Sera converti en snake_case. Doit être unique.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Nom affiché</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="ex: CA Technicien Mensuel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la métrique..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection de portée: uniquement en mode admin avec permissions */}
          {canSelectGlobalScope ? (
            <div className="space-y-2">
              <Label>Portée</Label>
              <RadioGroup
                value={formData.scope}
                onValueChange={(value: 'global' | 'agency') =>
                  setFormData({ ...formData, scope: value })
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="global" id="scope-global" />
                  <Label htmlFor="scope-global" className="flex items-center gap-1 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    Globale (réseau)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="agency" id="scope-agency" />
                  <Label htmlFor="scope-agency" className="flex items-center gap-1 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    Locale ({effectiveAgencySlug})
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Métrique locale pour <strong>{effectiveAgencySlug}</strong></span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
