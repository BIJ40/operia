/**
 * StatIA Builder - Version complète alimentée par STAT_DEFINITIONS
 * Source unique de vérité = registre StatIA
 */

import React, { useState, useMemo } from 'react';
import { usePersistedTab } from '@/hooks/usePersistedTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, List, PlusCircle, Target, Layers, Filter, X, Euro, TrendingUp, Percent, Hash, Clock, User, Building2, Calendar, Shield, FolderOpen, Wallet, AlertTriangle, FileCheck, Calculator, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { AgencySelector } from './AgencySelector';
import { clearProxyCache } from '@/services/apogeeProxy';
import { MetricsList } from './MetricsList';
import { MetricPreview } from './MetricPreview';
import { SaveMetricDialog } from './SaveMetricDialog';
import { useStatiaBuilderContext } from '../../hooks/useCustomMetrics';
import { CustomMetricDefinition } from '../../services/customMetricsService';
import { cn } from '@/lib/utils';
import { getMeasuresByCategory, getMeasureById, DIMENSIONS, MeasureConfig } from './config';
import { STAT_DEFINITIONS } from '../../definitions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface BuilderState {
  measure: string | null;
  dimensions: string[];
  filters: Record<string, boolean>;
}

interface StatiaBuilderEnhancedProps {
  mode: 'admin' | 'agency';
  fixedAgencySlug?: string;
}

// Map des icônes par catégorie
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Chiffre d\'Affaires': Euro,
  'Devis': FileCheck,
  'Univers': Layers,
  'Apporteurs': Building2,
  'Techniciens': User,
  'SAV': AlertTriangle,
  'Recouvrement': Wallet,
  'Dossiers': FolderOpen,
  'Qualité': Shield,
  'Productivité': TrendingUp,
  'Personnalisé': Sparkles,
};

// Map des icônes par unité
const UNIT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '€': Euro,
  '%': Percent,
  'h': Clock,
  'jours': Calendar,
  '': Hash,
};

// Filtres disponibles avec description
const AVAILABLE_FILTERS = [
  { id: 'exclude_sav', label: 'Exclure SAV', description: 'Retire les interventions SAV du calcul' },
  { id: 'exclude_rt', label: 'Exclure RT', description: 'Retire les relevés techniques' },
  { id: 'only_productive', label: 'Productif uniquement', description: 'Uniquement dépannages et travaux' },
  { id: 'exclude_avoirs', label: 'Exclure avoirs', description: 'Ne pas soustraire les avoirs' },
];

// Catégories ordonnées pour l'affichage
const CATEGORY_ORDER = [
  'Chiffre d\'Affaires',
  'Techniciens',
  'Univers',
  'Apporteurs',
  'Devis',
  'Recouvrement',
  'SAV',
  'Dossiers',
  'Qualité',
  'Productivité',
  'Personnalisé',
];

export function StatiaBuilderEnhanced({ mode, fixedAgencySlug }: StatiaBuilderEnhancedProps) {
  const { userAgencySlug } = useStatiaBuilderContext();
  const [state, setState] = useState<BuilderState>({ measure: null, dimensions: [], filters: {} });
  const [selectedAgency, setSelectedAgency] = useState(fixedAgencySlug || userAgencySlug || 'dax');
  const [activeTab, setActiveTab] = usePersistedTab('builder', 'statia-tab');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Chiffre d\'Affaires': true,
    'Techniciens': true,
  });

  // ADMIN MODE: Toujours utiliser l'agence sélectionnée, jamais le fallback utilisateur
  const effectiveAgency = mode === 'admin' ? selectedAgency : (fixedAgencySlug || userAgencySlug);

  // Récupérer les mesures dynamiquement depuis STAT_DEFINITIONS
  const measuresByCategory = useMemo(() => getMeasuresByCategory(), []);
  
  // Ordonner les catégories
  const orderedCategories = useMemo(() => {
    const categories = Object.keys(measuresByCategory);
    return CATEGORY_ORDER.filter(c => categories.includes(c))
      .concat(categories.filter(c => !CATEGORY_ORDER.includes(c)));
  }, [measuresByCategory]);

  // Récupérer la config de la mesure sélectionnée
  const measureConfig = useMemo(() => {
    return state.measure ? getMeasureById(state.measure) : null;
  }, [state.measure]);

  // Dimensions supportées par la mesure sélectionnée
  const supportedDimensions = useMemo(() => {
    if (!state.measure) return DIMENSIONS;
    const def = STAT_DEFINITIONS[state.measure];
    if (!def?.dimensions?.length) return DIMENSIONS;
    return DIMENSIONS.filter(d => (def.dimensions as string[])?.includes(d.id));
  }, [state.measure]);

  // Filtres applicables selon la source de données
  const applicableFilters = useMemo(() => {
    if (!measureConfig) return AVAILABLE_FILTERS;
    const source = measureConfig.source;
    const sources = Array.isArray(source) ? source : [source];
    
    // Filtres SAV/RT applicables si interventions impliquées
    const hasInterventions = sources.includes('interventions');
    // Filtre avoirs applicable si factures impliquées
    const hasFactures = sources.includes('factures');
    
    return AVAILABLE_FILTERS.filter(f => {
      if (f.id === 'exclude_sav' || f.id === 'exclude_rt' || f.id === 'only_productive') {
        return hasInterventions || hasFactures;
      }
      if (f.id === 'exclude_avoirs') {
        return hasFactures;
      }
      return true;
    });
  }, [measureConfig]);

  const buildDefinitionJson = (): CustomMetricDefinition => ({
    measure: state.measure || '',
    aggregation: measureConfig?.aggregation as any || 'sum',
    sources: measureConfig?.source 
      ? (Array.isArray(measureConfig.source) ? measureConfig.source : [measureConfig.source])
      : ['factures'],
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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getUnitIcon = (unit: string) => {
    return UNIT_ICONS[unit] || Hash;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {mode === 'admin' ? (
            <AgencySelector 
              value={selectedAgency} 
              onChange={(slug) => {
                // ADMIN: Vider le cache avant de changer d'agence pour éviter les données mixées
                clearProxyCache();
                setSelectedAgency(slug);
              }} 
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              Agence: <span className="font-medium text-foreground">{effectiveAgency}</span>
            </div>
          )}
          <Badge variant="outline" className="text-xs">
            {Object.values(measuresByCategory).flat().length} métriques disponibles
          </Badge>
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
            {/* Colonne 1: Mesures - ALIMENTÉES PAR STAT_DEFINITIONS */}
            <Card className="lg:row-span-2">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Mesures
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {Object.values(measuresByCategory).flat().length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {orderedCategories.map(category => {
                  const measures = measuresByCategory[category] || [];
                  if (!measures.length) return null;
                  
                  const CategoryIcon = CATEGORY_ICONS[category] || Calculator;
                  const isExpanded = expandedCategories[category] !== false;
                  
                  return (
                    <Collapsible 
                      key={category} 
                      open={isExpanded}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left w-full">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium flex-1">{category}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {measures.length}
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 space-y-1">
                        {measures.map((m: MeasureConfig) => {
                          const UnitIcon = getUnitIcon(m.unit);
                          return (
                            <button
                              key={m.id}
                              className={cn(
                                "w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors",
                                state.measure === m.id
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => {
                                setState(s => ({ 
                                  ...s, 
                                  measure: m.id,
                                  // Reset dimensions si la nouvelle mesure ne les supporte pas
                                  dimensions: s.dimensions.filter(dim => {
                                    const def = STAT_DEFINITIONS[m.id];
                                    return !def?.dimensions?.length || def.dimensions.includes(dim as any);
                                  })
                                }));
                              }}
                              title={m.description}
                            >
                              <UnitIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="flex-1 truncate text-xs">{m.label}</span>
                              {m.unit && (
                                <Badge 
                                  variant={state.measure === m.id ? "secondary" : "outline"} 
                                  className="text-[9px] shrink-0 px-1"
                                >
                                  {m.unit}
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </CardContent>
            </Card>

            {/* Colonne 2: Dimensions & Filtres */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Dimensions
                  {supportedDimensions.length < DIMENSIONS.length && (
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {supportedDimensions.length} disponibles
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {DIMENSIONS.map(d => {
                  const isSupported = supportedDimensions.some(sd => sd.id === d.id);
                  return (
                    <button
                      key={d.id}
                      disabled={!isSupported}
                      className={cn(
                        "w-full flex flex-col items-start p-2 rounded-md text-left transition-colors",
                        !isSupported && "opacity-40 cursor-not-allowed",
                        state.dimensions.includes(d.id)
                          ? "bg-secondary text-secondary-foreground"
                          : isSupported ? "hover:bg-muted" : ""
                      )}
                      onClick={() => isSupported && toggleDimension(d.id)}
                    >
                      <span className="text-sm font-medium">{d.label}</span>
                      <span className="text-xs text-muted-foreground">{d.description}</span>
                    </button>
                  );
                })}
              </CardContent>

              <CardHeader className="py-3 pt-0 border-t">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {AVAILABLE_FILTERS.map(f => {
                  const isApplicable = applicableFilters.some(af => af.id === f.id);
                  return (
                    <button
                      key={f.id}
                      disabled={!isApplicable}
                      className={cn(
                        "w-full flex flex-col items-start p-2 rounded-md text-left transition-colors",
                        !isApplicable && "opacity-40 cursor-not-allowed",
                        state.filters[f.id]
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100"
                          : isApplicable ? "hover:bg-muted" : ""
                      )}
                      onClick={() => isApplicable && toggleFilter(f.id)}
                    >
                      <span className="text-sm font-medium">{f.label}</span>
                      <span className="text-xs text-muted-foreground">{f.description}</span>
                    </button>
                  );
                })}
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
                      {(() => {
                        const UnitIcon = getUnitIcon(measureConfig.unit);
                        return <UnitIcon className="h-4 w-4 shrink-0" />;
                      })()}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{measureConfig.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{measureConfig.description}</div>
                      </div>
                      <Badge variant="secondary">{measureConfig.unit || '-'}</Badge>
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

                {/* Source de données */}
                {measureConfig && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Sources</div>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(measureConfig.source) ? measureConfig.source : [measureConfig.source]).map(src => (
                        <Badge key={src} variant="outline" className="text-xs">
                          {src}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

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
                      const f = AVAILABLE_FILTERS.find(x => x.id === id);
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

                {/* Agrégation */}
                {measureConfig && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Agrégation</div>
                    <Badge variant="outline">{measureConfig.aggregation}</Badge>
                  </div>
                )}
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
