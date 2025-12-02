/**
 * STATiA-BY-BIJ - Dialog principal du builder de métriques IA
 * Interface fullscreen pour une meilleure ergonomie
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';
import { MetricDefinition } from '../types';
import { MetricAIBuilder } from './MetricAIBuilder';
import { toast } from 'sonner';

interface MetricBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (metric: MetricDefinition) => void;
  editMetric?: MetricDefinition;
}

export function MetricBuilderDialog({ open, onOpenChange, onSave, editMetric }: MetricBuilderDialogProps) {
  
  const handleSave = (metricData: any) => {
    // Convertir le format IA vers MetricDefinition
    const metric: MetricDefinition = {
      id: metricData.id,
      label: metricData.label,
      description_agence: metricData.description_agence || '',
      description_franchiseur: metricData.description_franchiseur || '',
      scope: metricData.scope || 'agency',
      input_sources: typeof metricData.input_sources === 'string' 
        ? JSON.parse(metricData.input_sources)
        : [{ 
            source: metricData.input_sources?.primary || 'factures', 
            filters: metricData.filters || [] 
          }],
      formula: typeof metricData.formula === 'string'
        ? JSON.parse(metricData.formula)
        : metricData.formula,
      compute_hint: 'auto',
      validation_status: metricData.validation_status || 'draft',
      visibility: ['agency', 'franchiseur'],
      cache_ttl_seconds: 300,
    };

    onSave(metric);
    toast.success('Métrique créée avec succès !');
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            STATiA - Créer une métrique
          </DialogTitle>
          <DialogDescription>
            Décrivez votre métrique en langage naturel. L'IA générera automatiquement la configuration complète.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <MetricAIBuilder 
            onSave={handleSave}
            onCancel={handleCancel}
            initialMetric={editMetric}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
