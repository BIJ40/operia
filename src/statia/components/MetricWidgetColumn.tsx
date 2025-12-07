/**
 * Colonne de prévisualisation widget dans le ValidatorHub
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LayoutGrid, Plus, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { WidgetPreview } from './WidgetPreview';
import { useCreateWidget, useStatiaWidgets, WidgetConfig, StatiaWidget } from '../hooks/useStatiaWidgets';
import { StatDefinition } from '../definitions/types';

interface MetricWidgetColumnProps {
  definition: StatDefinition;
  value: any;
  isLoading: boolean;
}

const WIDGET_TYPES = [
  { value: 'kpi', label: 'KPI simple' },
  { value: 'gauge', label: 'Jauge' },
  { value: 'chart', label: 'Graphique' },
  { value: 'table', label: 'Tableau' },
];

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Bleu' },
  { value: 'green', label: 'Vert' },
  { value: 'orange', label: 'Orange' },
  { value: 'purple', label: 'Violet' },
  { value: 'red', label: 'Rouge' },
  { value: 'helpconfort', label: 'HelpConfort' },
];

const ICON_OPTIONS = [
  { value: 'euro', label: '€ Euro' },
  { value: 'percent', label: '% Pourcentage' },
  { value: 'hash', label: '# Nombre' },
  { value: 'clock', label: '⏱ Temps' },
  { value: 'chart', label: '📊 Graphique' },
  { value: 'users', label: '👥 Utilisateurs' },
  { value: 'building', label: '🏢 Bâtiment' },
  { value: 'wrench', label: '🔧 Outil' },
];

export function MetricWidgetColumn({ definition, value, isLoading }: MetricWidgetColumnProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<{
    title: string;
    description: string;
    widgetType: 'kpi' | 'chart' | 'gauge' | 'table';
    config: WidgetConfig;
  }>({
    title: definition.label,
    description: definition.description || '',
    widgetType: 'kpi',
    config: {
      icon: definition.unit === '€' ? 'euro' : definition.unit === '%' ? 'percent' : 'chart',
      color: 'blue',
      format: definition.unit === '€' ? 'currency' : definition.unit === '%' ? 'percent' : 'number',
      showTrend: true,
    },
  });

  const { data: existingWidgets = [] } = useStatiaWidgets();
  const createWidget = useCreateWidget();

  const existingWidget = existingWidgets.find(w => w.metric_id === definition.id);
  const hasWidget = !!existingWidget;

  const handleCreateWidget = () => {
    createWidget.mutate({
      metric_id: definition.id,
      title: widgetConfig.title,
      description: widgetConfig.description || undefined,
      widget_type: widgetConfig.widgetType,
      config: widgetConfig.config,
      is_published: false,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
      },
    });
  };
  return (
    <>
      <div className="flex items-center gap-1">
        {/* Mini preview */}
        <div className="flex-1">
          <WidgetPreview
            title={definition.label}
            value={value}
            unit={definition.unit}
            config={existingWidget?.config || widgetConfig.config}
            isLoading={isLoading}
            compact
          />
        </div>

        {/* Bouton action */}
        {hasWidget ? (
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-green-500" />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-7 px-2"
            title="Créer un widget"
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Dialog de création */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-helpconfort-blue" />
              Créer un widget
            </DialogTitle>
            <DialogDescription>
              Transformez la métrique <code className="font-mono text-xs">{definition.id}</code> en widget
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Prévisualisation live */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Prévisualisation</p>
              <WidgetPreview
                title={widgetConfig.title}
                value={value}
                unit={definition.unit}
                config={widgetConfig.config}
                widgetType={widgetConfig.widgetType}
                isLoading={isLoading}
              />
            </div>

            {/* Formulaire */}
            <div className="grid gap-4">
              <div>
                <Label>Titre du widget</Label>
                <Input
                  value={widgetConfig.title}
                  onChange={(e) => setWidgetConfig(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Chiffre d'affaires mensuel"
                />
              </div>

              <div>
                <Label>Description (optionnel)</Label>
                <Textarea
                  value={widgetConfig.description}
                  onChange={(e) => setWidgetConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description courte..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type de widget</Label>
                  <Select
                    value={widgetConfig.widgetType}
                    onValueChange={(v) => setWidgetConfig(prev => ({ 
                      ...prev, 
                      widgetType: v as typeof prev.widgetType 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDGET_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Couleur</Label>
                  <Select
                    value={widgetConfig.config.color || 'blue'}
                    onValueChange={(v) => setWidgetConfig(prev => ({
                      ...prev,
                      config: { ...prev.config, color: v }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Icône</Label>
                <Select
                  value={widgetConfig.config.icon || 'chart'}
                  onValueChange={(v) => setWidgetConfig(prev => ({
                    ...prev,
                    config: { ...prev.config, icon: v }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(i => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateWidget}
              disabled={createWidget.isPending || !widgetConfig.title}
              className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
            >
              {createWidget.isPending ? 'Création...' : 'Créer le widget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default MetricWidgetColumn;
