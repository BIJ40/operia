/**
 * StatIA Builder - Version complète avec capsules, filtres et prévisualisation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, List, PlusCircle, Target, Layers, Filter, X, Euro, TrendingUp, Percent, Hash, Clock } from 'lucide-react';
import { AgencySelector } from './AgencySelector';
import { MetricsList } from './MetricsList';
import { MetricPreview } from './MetricPreview';
import { SaveMetricDialog } from './SaveMetricDialog';
import { useStatiaBuilderContext } from '../../hooks/useCustomMetrics';
import { CustomMetricDefinition } from '../../services/customMetricsService';
import { cn } from '@/lib/utils';

export interface BuilderState {
  measure: string | null;
  dimensions: string[];
  filters: Record<string, boolean>;
}

interface StatiaBuilderEnhancedProps {
  mode: 'admin' | 'agency';
  fixedAgencySlug?: string;
}

const MEASURES = [
  { id: 'ca_global_ht', label: 'CA Global HT', unit: '€ HT', sources: ['factures'], icon: Euro, category: 'ca' },
  { id: 'ca_mensuel', label: 'CA Mensuel', unit: '€ HT/mois', sources: ['factures'], icon: TrendingUp, category: 'ca' },
  { id: 'ca_par_technicien', label: 'CA par Technicien', unit: '€ HT', sources: ['factures', 'interventions'], icon: Euro, category: 'ca' },
  { id: 'taux_sav_global', label: 'Taux SAV', unit: '%', sources: ['interventions'], icon: Percent, category: 'sav' },
  { id: 'taux_transformation', label: 'Taux Transformation', unit: '%', sources: ['devis', 'factures'], icon: Percent, category: 'devis' },
  { id: 'nb_interventions', label: 'Nb Interventions', unit: '', sources: ['interventions'], icon: Hash, category: 'activite' },
  { id: 'delai_moyen_facturation', label: 'Délai Facturation', unit: 'jours', sources: ['factures', 'interventions'], icon: Clock, category: 'recouvrement' },
];

const DIMENSIONS = [
  { id: 'technicien', label: 'Par Technicien', description: 'Ventilation par intervenant' },
  { id: 'univers', label: 'Par Univers', description: 'Par métier (plomberie, élec...)' },
  { id: 'apporteur', label: 'Par Apporteur', description: 'Par source de dossier' },
  { id: 'mois', label: 'Par Mois', description: 'Évolution mensuelle' },
  { id: 'semaine', label: 'Par Semaine', description: 'Évolution hebdomadaire' },
];

const FILTERS = [
  { id: 'exclude_sav', label: 'Exclure SAV', description: 'Retire les interventions SAV du calcul' },
  { id: 'exclude_rt', label: 'Exclure RT', description: 'Retire les relevés techniques' },
  { id: 'only_productive', label: 'Productif uniquement', description: 'Uniquement dépannages et travaux' },
  { id: 'exclude_avoirs', label: 'Exclure avoirs', description: 'Ne pas soustraire les avoirs' },
];

export function StatiaBuilderEnhanced({ mode, fixedAgencySlug }: StatiaBuilderEnhancedProps) {
  const { userAgencySlug } = useStatiaBuilderContext();
  const [state, setState] = useState<BuilderState>({ measure: null, dimensions: [], filters: {} });
  const [selectedAgency, setSelectedAgency] = useState(fixedAgencySlug || userAgencySlug || 'dax');
  const [activeTab, setActiveTab] = useState('builder');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const effectiveAgency = mode === 'agency' ? (fixedAgencySlug || userAgencySlug) : selectedAgency;
  const measureConfig = state.measure ? MEASURES.find(m => m.id === state.measure) : null;

  const buildDefinitionJson = (): CustomMetricDefinition => ({
    measure: state.measure || '',
    aggregation: measureConfig?.unit === '%' ? 'ratio' : 'sum',
    sources: measureConfig?.sources || ['factures'],
    dimensions: state.dimensions,
    filters: state.filters,
    time: { field: 'dateReelle', mode: 'periode', granularity: 'mois' },
  });

  const toggleDimension = (id: string) => {
    setState(s => ({
      ...s,
      dimensions: s.dimensions.includes(id)
        ? s.dimensions.filter(x => x !== id)
        : [...s.dimensions, id]
    }));
  };

  const toggleFilter = (id: string) => {
    setState(s => ({
      ...s,
      filters: { ...s.filters, [id]: !s.filters[id] }
    }));
  };

  const measuresByCategory = MEASURES.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {} as Record<string, typeof MEASURES>);

  const categoryLabels: Record<string, string> = {
    ca: 'Chiffre d\'affaires',
    sav: 'SAV & Qualité',
    devis: 'Devis',
    activite: 'Activité',
    recouvrement: 'Recouvrement',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {mode === 'admin' ? (
            <AgencySelector value={selectedAgency} onChange={setSelectedAgency} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Agence: <span className="font-medium text-foreground">{effectiveAgency}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setState({ measure: null, dimensions: [], filters: {} })}
          >
            Réinitialiser
          </Button>
          <Button 
            size="sm" 
            onClick={() => setShowSaveDialog(true)} 
            disabled={!state.measure}
          >
            <Save className="h-4 w-4 mr-1" />
            Sauvegarder
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="builder">
            <PlusCircle className="h-4 w-4 mr-1" />
            Construire
          </TabsTrigger>
          <TabsTrigger value="saved">
            <List className="h-4 w-4 mr-1" />
            Métriques sauvegardées
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Colonne 1: Mesures */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Mesures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                {Object.entries(measuresByCategory).map(([cat, measures]) => (
                  <div key={cat} className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">
                      {categoryLabels[cat] || cat}
                    </div>
                    {measures.map(m => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors",
                            state.measure === m.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                          onClick={() => setState(s => ({ ...s, measure: m.id }))}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{m.label}</span>
                          {m.unit && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {m.unit}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Colonne 2: Dimensions & Filtres */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Dimensions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {DIMENSIONS.map(d => (
                  <button
                    key={d.id}
                    className={cn(
                      "w-full flex flex-col items-start p-2 rounded-md text-left transition-colors",
                      state.dimensions.includes(d.id)
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleDimension(d.id)}
                  >
                    <span className="text-sm font-medium">{d.label}</span>
                    <span className="text-xs text-muted-foreground">{d.description}</span>
                  </button>
                ))}
              </CardContent>

              <CardHeader className="py-3 pt-0 border-t">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    className={cn(
                      "w-full flex flex-col items-start p-2 rounded-md text-left transition-colors",
                      state.filters[f.id]
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100"
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleFilter(f.id)}
                  >
                    <span className="text-sm font-medium">{f.label}</span>
                    <span className="text-xs text-muted-foreground">{f.description}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Colonne 3: Zone de construction */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Construction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mesure sélectionnée */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Mesure</div>
                  {measureConfig ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-background">
                      <measureConfig.icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium flex-1">{measureConfig.label}</span>
                      <Badge variant="secondary">{measureConfig.unit}</Badge>
                      <button 
                        onClick={() => setState(s => ({ ...s, measure: null }))} 
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">
                      Sélectionnez une mesure
                    </div>
                  )}
                </div>

                {/* Dimensions sélectionnées */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Dimensions</div>
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {state.dimensions.map(id => {
                      const d = DIMENSIONS.find(x => x.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {d?.label}
                          <button onClick={() => toggleDimension(id)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {!state.dimensions.length && (
                      <span className="text-xs text-muted-foreground italic">Aucune dimension</span>
                    )}
                  </div>
                </div>

                {/* Filtres actifs */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Filtres actifs</div>
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {Object.entries(state.filters).filter(([_, v]) => v).map(([id]) => {
                      const f = FILTERS.find(x => x.id === id);
                      return (
                        <Badge key={id} variant="outline" className="gap-1 bg-orange-50 dark:bg-orange-900/20">
                          {f?.label}
                          <button onClick={() => toggleFilter(id)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {!Object.values(state.filters).some(v => v) && (
                      <span className="text-xs text-muted-foreground italic">Aucun filtre</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Colonne 4: Prévisualisation */}
            <MetricPreview
              definition={state.measure ? buildDefinitionJson() : null}
              agencySlug={effectiveAgency || 'dax'}
              measureLabel={measureConfig?.label}
            />
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métriques personnalisées</CardTitle>
            </CardHeader>
            <CardContent>
              <MetricsList
                mode={mode}
                agencySlug={effectiveAgency || undefined}
                onEdit={(m) => {
                  if (mode === 'agency' && m.scope === 'global') return;
                  setState({
                    measure: m.definition_json.measure,
                    dimensions: m.definition_json.dimensions || [],
                    filters: (m.definition_json.filters || {}) as Record<string, boolean>
                  });
                  setActiveTab('builder');
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SaveMetricDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        definitionJson={buildDefinitionJson()}
        onSuccess={() => setActiveTab('saved')}
        mode={mode}
        agencySlug={effectiveAgency || undefined}
      />
    </div>
  );
}
