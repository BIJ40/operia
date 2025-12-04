/**
 * StatIA Builder - Version simplifiée sans dépendances externes
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Play, List, PlusCircle, Target, Layers, Filter, X, Euro, TrendingUp, AlertTriangle } from 'lucide-react';
import { AgencySelector } from './AgencySelector';
import { MetricsList } from './MetricsList';
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
  { id: 'ca_global_ht', label: 'CA Global HT', unit: '€ HT', sources: ['factures'] },
  { id: 'ca_mensuel', label: 'CA Mensuel', unit: '€ HT/mois', sources: ['factures'] },
  { id: 'taux_sav_global', label: 'Taux SAV', unit: '%', sources: ['interventions'] },
];

const DIMENSIONS = [
  { id: 'technicien', label: 'Par Technicien' },
  { id: 'univers', label: 'Par Univers' },
  { id: 'apporteur', label: 'Par Apporteur' },
  { id: 'mois', label: 'Par Mois' },
];

const FILTERS = [
  { id: 'exclude_sav', label: 'Exclure SAV' },
  { id: 'exclude_rt', label: 'Exclure RT' },
  { id: 'only_productive', label: 'Productif uniquement' },
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
    aggregation: 'sum',
    sources: measureConfig?.sources || ['factures'],
    dimensions: state.dimensions,
    filters: state.filters,
    time: { field: 'date_facture', mode: 'periode', granularity: 'mois' },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {mode === 'admin' ? (
            <AgencySelector value={selectedAgency} onChange={setSelectedAgency} />
          ) : (
            <div className="text-sm text-muted-foreground">Agence: <span className="font-medium">{effectiveAgency}</span></div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setState({ measure: null, dimensions: [], filters: {} })}>Réinitialiser</Button>
          <Button size="sm" onClick={() => setShowSaveDialog(true)} disabled={!state.measure}><Save className="h-4 w-4 mr-1" />Sauvegarder</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="builder"><PlusCircle className="h-4 w-4 mr-1" />Construire</TabsTrigger>
          <TabsTrigger value="saved"><List className="h-4 w-4 mr-1" />Métriques sauvegardées</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sélection */}
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Mesures</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {MEASURES.map(m => (
                  <Button key={m.id} variant={state.measure === m.id ? 'default' : 'outline'} size="sm" className="w-full justify-start" onClick={() => setState(s => ({ ...s, measure: m.id }))}>
                    <Euro className="h-4 w-4 mr-2" />{m.label}
                  </Button>
                ))}
              </CardContent>
              <CardHeader className="py-3 pt-0"><CardTitle className="text-sm">Dimensions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {DIMENSIONS.map(d => (
                  <Button key={d.id} variant={state.dimensions.includes(d.id) ? 'default' : 'outline'} size="sm" className="w-full justify-start" onClick={() => setState(s => ({ ...s, dimensions: s.dimensions.includes(d.id) ? s.dimensions.filter(x => x !== d.id) : [...s.dimensions, d.id] }))}>
                    <Layers className="h-4 w-4 mr-2" />{d.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Zone centrale */}
            <Card className="lg:col-span-2">
              <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" />Construction</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Mesure</div>
                  {measureConfig ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-background">
                      <Euro className="h-4 w-4" />
                      <span className="font-medium">{measureConfig.label}</span>
                      <Badge variant="secondary">{measureConfig.unit}</Badge>
                      <button onClick={() => setState(s => ({ ...s, measure: null }))} className="ml-auto"><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                  ) : (
                    <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground text-sm">Sélectionnez une mesure</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Dimensions</div>
                  <div className="flex flex-wrap gap-2">
                    {state.dimensions.map(id => {
                      const d = DIMENSIONS.find(x => x.id === id);
                      return <Badge key={id} variant="secondary">{d?.label}<button onClick={() => setState(s => ({ ...s, dimensions: s.dimensions.filter(x => x !== id) }))} className="ml-1"><X className="h-3 w-3" /></button></Badge>;
                    })}
                    {!state.dimensions.length && <span className="text-xs text-muted-foreground italic">Aucune</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader><CardTitle className="text-base">Métriques personnalisées</CardTitle></CardHeader>
            <CardContent>
              <MetricsList 
                mode={mode}
                agencySlug={effectiveAgency || undefined} 
                onEdit={(m) => { 
                  // En mode agency, ne peut pas éditer les métriques globales
                  if (mode === 'agency' && m.scope === 'global') return;
                  setState({ measure: m.definition_json.measure, dimensions: m.definition_json.dimensions || [], filters: (m.definition_json.filters || {}) as Record<string, boolean> }); 
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
