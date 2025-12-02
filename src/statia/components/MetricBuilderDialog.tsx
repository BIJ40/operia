/**
 * STATiA-BY-BIJ - Builder de métriques
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, X, Zap, Database } from 'lucide-react';
import { APOGEE_SCHEMA, validateMetricDefinition, getAllEndpoints } from '../schema/apogeeSchemaV2';
import { MetricDefinition, MetricScope, AggregationType, FilterCondition, InputSource } from '../types';
import { toast } from 'sonner';

interface MetricBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (metric: MetricDefinition) => void;
}

type BuilderStep = 'metadata' | 'sources' | 'filters' | 'formula' | 'review';

const STEPS: { key: BuilderStep; label: string }[] = [
  { key: 'metadata', label: 'Métadonnées' },
  { key: 'sources', label: 'Sources' },
  { key: 'filters', label: 'Filtres' },
  { key: 'formula', label: 'Formule' },
  { key: 'review', label: 'Validation' },
];

const SCOPES: { value: MetricScope; label: string }[] = [
  { value: 'agency', label: 'Agence' },
  { value: 'franchiseur', label: 'Franchiseur' },
  { value: 'apporteur', label: 'Apporteur' },
  { value: 'tech', label: 'Technicien' },
  { value: 'mix', label: 'Mixte' },
];

const AGGREGATION_TYPES: { value: AggregationType; label: string; description: string }[] = [
  { value: 'sum', label: 'Somme', description: 'Additionne toutes les valeurs' },
  { value: 'avg', label: 'Moyenne', description: 'Calcule la moyenne' },
  { value: 'count', label: 'Comptage', description: 'Compte le nombre d\'éléments' },
  { value: 'distinct_count', label: 'Comptage distinct', description: 'Compte les valeurs uniques' },
  { value: 'min', label: 'Minimum', description: 'Valeur minimale' },
  { value: 'max', label: 'Maximum', description: 'Valeur maximale' },
  { value: 'ratio', label: 'Ratio', description: 'Pourcentage (numérateur/dénominateur)' },
];

export function MetricBuilderDialog({ open, onOpenChange, onSave }: MetricBuilderDialogProps) {
  const [currentStep, setCurrentStep] = useState<BuilderStep>('metadata');
  const [draft, setDraft] = useState<Partial<MetricDefinition>>({
    id: '',
    label: '',
    description_agence: '',
    scope: 'agency',
    input_sources: [],
    formula: { type: 'sum', field: '' },
    compute_hint: 'auto',
    validation_status: 'draft',
    visibility: ['agency', 'franchiseur'],
    cache_ttl_seconds: 300,
  });

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const goNext = () => {
    if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1].key);
    }
  };

  const goPrev = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1].key);
    }
  };

  const handleSave = () => {
    const validation = validateMetricDefinition(draft);
    if (!validation.valid) {
      toast.error('Erreurs de validation', {
        description: validation.errors.join(', '),
      });
      return;
    }

    onSave(draft as MetricDefinition);
    onOpenChange(false);
    resetDraft();
  };

  const resetDraft = () => {
    setDraft({
      id: '',
      label: '',
      description_agence: '',
      scope: 'agency',
      input_sources: [],
      formula: { type: 'sum', field: '' },
      compute_hint: 'auto',
      validation_status: 'draft',
      visibility: ['agency', 'franchiseur'],
      cache_ttl_seconds: 300,
    });
    setCurrentStep('metadata');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDraft(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Nouvelle métrique</DialogTitle>
          <DialogDescription>
            Créez une nouvelle définition de métrique en suivant les étapes
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-4 border-b">
          {STEPS.map((step, idx) => (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => setCurrentStep(step.key)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${
                  step.key === currentStep
                    ? 'bg-helpconfort-blue text-white'
                    : idx < currentStepIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="font-medium">{idx + 1}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 py-4">
          {currentStep === 'metadata' && (
            <StepMetadata draft={draft} setDraft={setDraft} />
          )}
          {currentStep === 'sources' && (
            <StepSources draft={draft} setDraft={setDraft} />
          )}
          {currentStep === 'filters' && (
            <StepFilters draft={draft} setDraft={setDraft} />
          )}
          {currentStep === 'formula' && (
            <StepFormula draft={draft} setDraft={setDraft} />
          )}
          {currentStep === 'review' && (
            <StepReview draft={draft} />
          )}
        </ScrollArea>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={goPrev} disabled={isFirstStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          {isLastStep ? (
            <Button onClick={handleSave} className="bg-helpconfort-blue hover:bg-helpconfort-blue/90">
              <Zap className="h-4 w-4 mr-2" />
              Créer la métrique
            </Button>
          ) : (
            <Button onClick={goNext}>
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// ÉTAPES
// ============================================

function StepMetadata({ draft, setDraft }: { draft: Partial<MetricDefinition>; setDraft: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="id">Identifiant technique *</Label>
          <Input
            id="id"
            placeholder="ca_mensuel"
            value={draft.id || ''}
            onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
          />
          <p className="text-xs text-muted-foreground">Utiliser snake_case (ex: ca_mensuel)</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">Libellé *</Label>
          <Input
            id="label"
            placeholder="CA Mensuel"
            value={draft.label || ''}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (agence)</Label>
        <Textarea
          id="description"
          placeholder="Description de la métrique pour les agences..."
          value={draft.description_agence || ''}
          onChange={(e) => setDraft({ ...draft, description_agence: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Scope</Label>
          <Select value={draft.scope} onValueChange={(v) => setDraft({ ...draft, scope: v as MetricScope })}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {SCOPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cache (secondes)</Label>
          <Input
            type="number"
            value={draft.cache_ttl_seconds || 300}
            onChange={(e) => setDraft({ ...draft, cache_ttl_seconds: parseInt(e.target.value) || 300 })}
          />
        </div>
      </div>
    </div>
  );
}

function StepSources({ draft, setDraft }: { draft: Partial<MetricDefinition>; setDraft: (d: any) => void }) {
  const endpoints = getAllEndpoints();
  const sources = draft.input_sources || [];

  const addSource = (sourceName: string) => {
    if (!sources.find(s => s.source === sourceName)) {
      setDraft({
        ...draft,
        input_sources: [...sources, { source: sourceName as any, filters: [] }],
      });
    }
  };

  const removeSource = (sourceName: string) => {
    setDraft({
      ...draft,
      input_sources: sources.filter(s => s.source !== sourceName),
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sélectionnez les sources de données nécessaires au calcul de la métrique.
      </p>

      {/* Sources sélectionnées */}
      {sources.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sources sélectionnées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <Badge key={source.source} variant="secondary" className="gap-2 pr-1">
                  <Database className="h-3 w-3" />
                  {APOGEE_SCHEMA[source.source]?.label || source.source}
                  <button
                    onClick={() => removeSource(source.source)}
                    className="p-0.5 hover:bg-muted rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des endpoints */}
      <div className="grid sm:grid-cols-2 gap-2">
        {endpoints.map((endpoint) => {
          const isSelected = sources.some(s => s.source === endpoint.name);
          return (
            <button
              key={endpoint.name}
              onClick={() => isSelected ? removeSource(endpoint.name) : addSource(endpoint.name)}
              className={`p-3 text-left rounded-lg border transition-colors ${
                isSelected
                  ? 'border-helpconfort-blue bg-helpconfort-blue/10'
                  : 'border-muted hover:border-helpconfort-blue/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className={`h-4 w-4 ${isSelected ? 'text-helpconfort-blue' : 'text-muted-foreground'}`} />
                <span className="font-medium">{endpoint.label}</span>
                <Badge variant="outline" className="text-xs ml-auto">{endpoint.fields.length} champs</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{endpoint.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepFilters({ draft, setDraft }: { draft: Partial<MetricDefinition>; setDraft: (d: any) => void }) {
  const sources = draft.input_sources || [];

  const updateSourceFilters = (sourceIdx: number, filters: FilterCondition[]) => {
    const newSources = [...sources];
    newSources[sourceIdx] = { ...newSources[sourceIdx], filters };
    setDraft({ ...draft, input_sources: newSources });
  };

  const addFilter = (sourceIdx: number) => {
    const currentFilters = sources[sourceIdx]?.filters || [];
    updateSourceFilters(sourceIdx, [...currentFilters, { field: '', operator: 'eq', value: '' }]);
  };

  const removeFilter = (sourceIdx: number, filterIdx: number) => {
    const currentFilters = sources[sourceIdx]?.filters || [];
    updateSourceFilters(sourceIdx, currentFilters.filter((_, i) => i !== filterIdx));
  };

  const updateFilter = (sourceIdx: number, filterIdx: number, filter: Partial<FilterCondition>) => {
    const currentFilters = sources[sourceIdx]?.filters || [];
    const newFilters = [...currentFilters];
    newFilters[filterIdx] = { ...newFilters[filterIdx], ...filter };
    updateSourceFilters(sourceIdx, newFilters);
  };

  if (sources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Sélectionnez d'abord des sources de données
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Définissez les filtres à appliquer sur chaque source de données.
      </p>

      {sources.map((source, sourceIdx) => {
        const endpoint = APOGEE_SCHEMA[source.source];
        const filters = source.filters || [];

        return (
          <Card key={source.source}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                {endpoint?.label || source.source}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filters.map((filter, filterIdx) => (
                <div key={filterIdx} className="flex gap-2 items-center">
                  <Select
                    value={filter.field}
                    onValueChange={(v) => updateFilter(sourceIdx, filterIdx, { field: v })}
                  >
                    <SelectTrigger className="w-40 bg-background">
                      <SelectValue placeholder="Champ" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {endpoint?.fields.filter(f => f.filterable).map((f) => (
                        <SelectItem key={f.name} value={f.path || f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filter.operator}
                    onValueChange={(v) => updateFilter(sourceIdx, filterIdx, { operator: v as any })}
                  >
                    <SelectTrigger className="w-24 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="eq">=</SelectItem>
                      <SelectItem value="neq">≠</SelectItem>
                      <SelectItem value="gt">&gt;</SelectItem>
                      <SelectItem value="gte">≥</SelectItem>
                      <SelectItem value="lt">&lt;</SelectItem>
                      <SelectItem value="lte">≤</SelectItem>
                      <SelectItem value="in">dans</SelectItem>
                      <SelectItem value="not_in">pas dans</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    placeholder="Valeur"
                    value={String(filter.value || '')}
                    onChange={(e) => updateFilter(sourceIdx, filterIdx, { value: e.target.value })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeFilter(sourceIdx, filterIdx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addFilter(sourceIdx)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un filtre
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StepFormula({ draft, setDraft }: { draft: Partial<MetricDefinition>; setDraft: (d: any) => void }) {
  const sources = draft.input_sources || [];
  const primarySource = sources[0]?.source;
  const endpoint = primarySource ? APOGEE_SCHEMA[primarySource] : null;
  const aggregableFields = endpoint?.fields.filter(f => f.aggregable) || [];

  const formula = draft.formula || { type: 'sum', field: '' };

  const updateFormula = (updates: Partial<typeof formula>) => {
    setDraft({ ...draft, formula: { ...formula, ...updates } });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Définissez comment calculer la valeur de la métrique.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type d'agrégation</Label>
          <Select
            value={formula.type}
            onValueChange={(v) => updateFormula({ type: v as AggregationType })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {AGGREGATION_TYPES.map((agg) => (
                <SelectItem key={agg.value} value={agg.value}>
                  <div>
                    <span className="font-medium">{agg.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{agg.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formula.type !== 'count' && formula.type !== 'ratio' && (
          <div className="space-y-2">
            <Label>Champ à agréger</Label>
            <Select
              value={formula.field}
              onValueChange={(v) => updateFormula({ field: v })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner un champ" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {aggregableFields.map((f) => (
                  <SelectItem key={f.name} value={f.path || f.name}>
                    {f.name} - {f.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Unité</Label>
          <Select
            value={formula.unit || ''}
            onValueChange={(v) => updateFormula({ unit: v })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Aucune" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="euros">Euros (€)</SelectItem>
              <SelectItem value="percent">Pourcentage (%)</SelectItem>
              <SelectItem value="count">Nombre</SelectItem>
              <SelectItem value="hours">Heures</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Transformation</Label>
          <Select
            value={formula.transform || ''}
            onValueChange={(v) => updateFormula({ transform: v as any })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Aucune" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="round">Arrondi</SelectItem>
              <SelectItem value="floor">Arrondi inf.</SelectItem>
              <SelectItem value="ceil">Arrondi sup.</SelectItem>
              <SelectItem value="abs">Valeur absolue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StepReview({ draft }: { draft: Partial<MetricDefinition> }) {
  const validation = validateMetricDefinition(draft);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vérifiez la définition avant de créer la métrique.
      </p>

      {/* Validation */}
      {!validation.valid && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">Erreurs de validation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-red-600 list-disc pl-4 space-y-1">
              {validation.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Aperçu JSON */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Définition JSON</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
            {JSON.stringify(draft, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
