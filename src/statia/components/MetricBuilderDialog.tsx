/**
 * STATiA-BY-BIJ - Builder de métriques SIMPLIFIÉ
 * Approche template-first : l'utilisateur choisit un modèle pré-configuré
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, TrendingUp, Users, FileText, Clock, Percent, Euro, Hash, CheckCircle2, Sparkles } from 'lucide-react';
import { MetricDefinition, MetricScope } from '../types';
import { toast } from 'sonner';

interface MetricBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (metric: MetricDefinition) => void;
  editMetric?: MetricDefinition;
}

// ============================================
// TEMPLATES PRÉ-CONFIGURÉS
// ============================================

interface MetricTemplate {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'ca' | 'activity' | 'performance' | 'clients';
  scope: MetricScope;
  input_sources: MetricDefinition['input_sources'];
  formula: MetricDefinition['formula'];
}

const METRIC_TEMPLATES: MetricTemplate[] = [
  // CA
  {
    id: 'ca_mensuel',
    label: 'CA Mensuel',
    description: 'Chiffre d\'affaires HT du mois en cours',
    icon: <Euro className="h-5 w-5 text-green-600" />,
    category: 'ca',
    scope: 'agency',
    input_sources: [{ source: 'factures', filters: [] }],
    formula: { type: 'sum', field: 'data.totalHT' },
  },
  {
    id: 'ca_annuel',
    label: 'CA Annuel',
    description: 'Chiffre d\'affaires HT depuis le début de l\'année',
    icon: <TrendingUp className="h-5 w-5 text-green-600" />,
    category: 'ca',
    scope: 'agency',
    input_sources: [{ source: 'factures', filters: [] }],
    formula: { type: 'sum', field: 'data.totalHT' },
  },
  {
    id: 'ca_par_univers',
    label: 'CA par Univers',
    description: 'Répartition du CA par univers métier',
    icon: <Euro className="h-5 w-5 text-blue-600" />,
    category: 'ca',
    scope: 'agency',
    input_sources: [{ source: 'factures', filters: [] }],
    formula: { type: 'sum', field: 'data.totalHT', groupBy: ['univers'] },
  },
  {
    id: 'ca_par_apporteur',
    label: 'CA par Apporteur',
    description: 'Répartition du CA par apporteur/commanditaire',
    icon: <Euro className="h-5 w-5 text-purple-600" />,
    category: 'ca',
    scope: 'agency',
    input_sources: [{ source: 'factures', filters: [] }],
    formula: { type: 'sum', field: 'data.totalHT', groupBy: ['apporteur'] },
  },
  // Activité
  {
    id: 'nb_interventions',
    label: 'Nombre d\'interventions',
    description: 'Total des interventions sur la période',
    icon: <Hash className="h-5 w-5 text-blue-600" />,
    category: 'activity',
    scope: 'agency',
    input_sources: [{ source: 'interventions', filters: [] }],
    formula: { type: 'count' },
  },
  {
    id: 'nb_dossiers',
    label: 'Nombre de dossiers',
    description: 'Total des dossiers/projets créés',
    icon: <FileText className="h-5 w-5 text-blue-600" />,
    category: 'activity',
    scope: 'agency',
    input_sources: [{ source: 'projects', filters: [] }],
    formula: { type: 'count' },
  },
  {
    id: 'nb_devis',
    label: 'Nombre de devis',
    description: 'Total des devis émis',
    icon: <FileText className="h-5 w-5 text-orange-600" />,
    category: 'activity',
    scope: 'agency',
    input_sources: [{ source: 'devis', filters: [] }],
    formula: { type: 'count' },
  },
  {
    id: 'nb_factures',
    label: 'Nombre de factures',
    description: 'Total des factures émises',
    icon: <FileText className="h-5 w-5 text-green-600" />,
    category: 'activity',
    scope: 'agency',
    input_sources: [{ source: 'factures', filters: [] }],
    formula: { type: 'count' },
  },
  // Performance
  {
    id: 'interventions_par_tech',
    label: 'Interventions par technicien',
    description: 'Nombre d\'interventions ventilé par technicien',
    icon: <Users className="h-5 w-5 text-indigo-600" />,
    category: 'performance',
    scope: 'tech',
    input_sources: [{ source: 'interventions', filters: [] }],
    formula: { type: 'count', groupBy: ['technicien'] },
  },
  {
    id: 'ca_par_tech',
    label: 'CA par technicien',
    description: 'Chiffre d\'affaires généré par technicien',
    icon: <Euro className="h-5 w-5 text-indigo-600" />,
    category: 'performance',
    scope: 'tech',
    input_sources: [{ source: 'factures', filters: [] }],
    formula: { type: 'sum', field: 'data.totalHT', groupBy: ['technicien'] },
  },
  {
    id: 'duree_moyenne_intervention',
    label: 'Durée moyenne intervention',
    description: 'Temps moyen passé par intervention',
    icon: <Clock className="h-5 w-5 text-amber-600" />,
    category: 'performance',
    scope: 'agency',
    input_sources: [{ source: 'interventions', filters: [] }],
    formula: { type: 'avg', field: 'duree' },
  },
  {
    id: 'taux_transformation_devis',
    label: 'Taux de transformation devis',
    description: 'Pourcentage de devis transformés en factures',
    icon: <Percent className="h-5 w-5 text-emerald-600" />,
    category: 'performance',
    scope: 'agency',
    input_sources: [{ source: 'devis', filters: [] }, { source: 'factures', filters: [] }],
    formula: { 
      type: 'ratio', 
      numerator: { type: 'count' },
      denominator: { type: 'count' }
    },
  },
  // Clients
  {
    id: 'nb_clients_actifs',
    label: 'Clients actifs',
    description: 'Nombre de clients avec activité sur la période',
    icon: <Users className="h-5 w-5 text-teal-600" />,
    category: 'clients',
    scope: 'agency',
    input_sources: [{ source: 'clients', filters: [] }],
    formula: { type: 'distinct_count', field: 'id' },
  },
  {
    id: 'top_apporteurs',
    label: 'Top Apporteurs',
    description: 'Classement des apporteurs par CA généré',
    icon: <TrendingUp className="h-5 w-5 text-purple-600" />,
    category: 'clients',
    scope: 'apporteur',
    input_sources: [{ source: 'factures', filters: [] }],
    formula: { type: 'sum', field: 'data.totalHT', groupBy: ['apporteur'] },
  },
];

const CATEGORIES = [
  { id: 'ca', label: 'Chiffre d\'affaires', icon: <Euro className="h-4 w-4" /> },
  { id: 'activity', label: 'Activité', icon: <FileText className="h-4 w-4" /> },
  { id: 'performance', label: 'Performance', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'clients', label: 'Clients & Apporteurs', icon: <Users className="h-4 w-4" /> },
];

export function MetricBuilderDialog({ open, onOpenChange, onSave, editMetric }: MetricBuilderDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MetricTemplate | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customId, setCustomId] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ca');

  const isEditMode = !!editMetric;

  useEffect(() => {
    if (open) {
      setSelectedTemplate(null);
      setCustomLabel('');
      setCustomId('');
      setActiveCategory('ca');
    }
  }, [open]);

  const handleSelectTemplate = (template: MetricTemplate) => {
    setSelectedTemplate(template);
    setCustomLabel(template.label);
    setCustomId(template.id);
  };

  const handleCreate = () => {
    if (!selectedTemplate) {
      toast.error('Sélectionnez un modèle');
      return;
    }

    if (!customId.trim()) {
      toast.error('L\'identifiant est requis');
      return;
    }

    const metric: MetricDefinition = {
      id: customId.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: customLabel || selectedTemplate.label,
      description_agence: selectedTemplate.description,
      scope: selectedTemplate.scope,
      input_sources: selectedTemplate.input_sources,
      formula: selectedTemplate.formula,
      compute_hint: 'auto',
      validation_status: 'validated',
      visibility: ['agency', 'franchiseur'],
      cache_ttl_seconds: 300,
    };

    onSave(metric);
    toast.success('Métrique créée avec succès !');
    onOpenChange(false);
  };

  const filteredTemplates = METRIC_TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-helpconfort-blue" />
            Créer une métrique
          </DialogTitle>
          <DialogDescription>
            Choisissez un modèle pré-configuré. La métrique sera immédiatement opérationnelle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Catégories */}
          <div className="w-48 shrink-0 space-y-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeCategory === cat.id
                    ? 'bg-helpconfort-blue text-white'
                    : 'hover:bg-muted'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Templates */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 gap-3 pr-4">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplate?.id === template.id;
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-helpconfort-blue bg-helpconfort-blue/5' : ''
                    }`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {template.icon}
                          <CardTitle className="text-sm">{template.label}</CardTitle>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-helpconfort-blue" />}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs">
                        {template.description}
                      </CardDescription>
                      <div className="flex gap-1 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {template.formula.type}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {template.scope}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Configuration rapide si template sélectionné */}
        {selectedTemplate && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Modèle sélectionné : <strong>{selectedTemplate.label}</strong>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="customId" className="text-xs">Identifiant technique</Label>
                <Input
                  id="customId"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="ca_mensuel_custom"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customLabel" className="text-xs">Libellé affiché</Label>
                <Input
                  id="customLabel"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Mon CA Mensuel"
                  className="h-9"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!selectedTemplate}
            className="bg-helpconfort-blue hover:bg-helpconfort-blue/90"
          >
            <Zap className="h-4 w-4 mr-2" />
            Créer la métrique
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
