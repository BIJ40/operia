/**
 * STATiA-BY-BIJ - Console centrale de test des métriques
 * 
 * Utilise exclusivement useMetricExecutor (frontend) ou compute-metric (edge).
 * Intègre visualisation + debug enrichi + snippet de réutilisation.
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertCircle, FlaskConical, Loader2, Play, Zap, 
  ChevronDown, Copy, Check, Server, Monitor, GitCompare
} from 'lucide-react';
import { MetricDefinition } from '../types';
import { useMetricExecutor, runMetric } from '../hooks/useMetricEngine';
import { MetricVisualization } from './MetricVisualization';
import { MetricDebugPanel } from './MetricDebugPanel';
import type { MetricDefinitionJSON, MetricExecutionParams, MetricExecutionResult } from '../engine/metricEngine';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

// ============================================
// TYPES
// ============================================

interface MetricTestPanelProps {
  metrics: MetricDefinition[];
  selectedMetricId: string | null;
  onSelectMetric: (id: string | null) => void;
}

type ExecutionTarget = 'frontend' | 'edge';

// ============================================
// HELPERS - PARSING ROBUSTE
// ============================================

interface ParsedInputSources {
  primary?: string;
  secondary?: Array<{ source: string; joinOn?: { local: string; foreign: string } }>;
  joins?: Array<{ from: string; to: string; on: { local: string; foreign: string } }>;
}

interface ParsedFormula {
  type?: string;
  field?: string;
  numerator?: any;
  denominator?: any;
  groupBy?: string[];
  filters?: any[];
}

function safeParseJSON<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Construit une MetricDefinitionJSON robuste depuis une MetricDefinition DB
 */
/**
 * Mapping des champs anglais vers les champs réels de l'API Apogée
 */
const FIELD_MAPPING: Record<string, string> = {
  'duration': 'duree',
  'amount': 'totalHT',
  'amountHT': 'totalHT', 
  'amountTTC': 'totalTTC',
};

function mapFieldName(field: string | undefined): string | undefined {
  if (!field) return undefined;
  return FIELD_MAPPING[field] || field;
}

function buildMetricDefinitionJSON(metric: MetricDefinition): MetricDefinitionJSON {
  const rawInputSources = safeParseJSON<any>(metric.input_sources, {});
  const rawFormula = safeParseJSON<ParsedFormula>(metric.formula, { type: 'count' });
  
  let primary = 'projects';
  let secondary: Array<{ source: string; joinOn?: { local: string; foreign: string } }> = [];
  let joins: Array<{ from: string; to: string; on: { local: string; foreign: string } }> = [];
  let extractedFilters: any[] = [];
  
  if (Array.isArray(rawInputSources)) {
    // Format v1: array of sources with inline filters
    if (rawInputSources.length > 0) {
      primary = rawInputSources[0]?.source || 'projects';
      // Extract filters from the primary source (v1 format)
      if (Array.isArray(rawInputSources[0]?.filters)) {
        extractedFilters = rawInputSources[0].filters;
      }
      secondary = rawInputSources.slice(1).map((s: any) => ({
        source: s.source,
        joinOn: s.joinOn,
      }));
    }
  } else if (typeof rawInputSources === 'object' && rawInputSources !== null) {
    // Format v2: object with primary/secondary/joins
    primary = rawInputSources.primary || 'projects';
    secondary = Array.isArray(rawInputSources.secondary) 
      ? rawInputSources.secondary.map((s: any) => ({
          source: typeof s === 'string' ? s : s.source,
          joinOn: s.joinOn,
        }))
      : [];
    joins = Array.isArray(rawInputSources.joins) ? rawInputSources.joins : [];
  }
  
  // Filters from formula or from v1 input_sources (prioritize v1)
  const filters = extractedFilters.length > 0 
    ? extractedFilters 
    : (Array.isArray(rawFormula.filters) ? rawFormula.filters : []);
  
  const dimensions = Array.isArray(rawFormula.groupBy) ? rawFormula.groupBy : [];
  const hasGroupBy = dimensions.length > 0;
  
  // Map field name for API compatibility
  const mappedField = mapFieldName(rawFormula.field);
  
  return {
    id: metric.id,
    label: metric.label,
    input_sources: {
      primary,
      secondary: secondary.length > 0 ? secondary : undefined,
      joins: joins.length > 0 ? joins : undefined,
    },
    formula: {
      type: rawFormula.type || 'count',
      field: mappedField,
      numerator: rawFormula.numerator,
      denominator: rawFormula.denominator,
      groupBy: dimensions,
    },
    filters: filters,
    dimensions: dimensions,
    output_format: {
      type: hasGroupBy ? 'series' : 'single',
      recommendedChart: hasGroupBy 
        ? (dimensions.includes('période') ? 'line' : 'bar')
        : 'number',
    },
  };
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

// Comparison types
interface ComparisonResult {
  frontend: MetricExecutionResult | null;
  edge: MetricExecutionResult | null;
  frontendDuration: number;
  edgeDuration: number;
}

export function MetricTestPanel({ metrics, selectedMetricId, onSelectMetric }: MetricTestPanelProps) {
  const [testParams, setTestParams] = useState<MetricExecutionParams>({
    agency_slug: '',
    date_from: startOfMonth(subMonths(new Date(), 1)),
    date_to: endOfMonth(subMonths(new Date(), 1)),
  });
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget>('frontend');
  const [snippetCopied, setSnippetCopied] = useState(false);
  
  const [edgeResult, setEdgeResult] = useState<MetricExecutionResult | null>(null);
  const [edgeLoading, setEdgeLoading] = useState(false);
  const [edgeError, setEdgeError] = useState<Error | null>(null);

  // Comparison state
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const frontendExecutor = useMetricExecutor();
  const selectedMetric = metrics.find(m => m.id === selectedMetricId);

  const metricDefinitionJSON = useMemo((): MetricDefinitionJSON | null => {
    if (!selectedMetric) return null;
    return buildMetricDefinitionJSON(selectedMetric);
  }, [selectedMetric]);

  const result = executionTarget === 'frontend' ? frontendExecutor.result : edgeResult;
  const loading = executionTarget === 'frontend' ? frontendExecutor.loading : edgeLoading;
  const error = executionTarget === 'frontend' ? frontendExecutor.error : edgeError;

  const executeViaEdge = useCallback(async () => {
    if (!metricDefinitionJSON || !testParams.agency_slug) return;
    
    setEdgeLoading(true);
    setEdgeError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('compute-metric', {
        body: {
          metric_definition: metricDefinitionJSON,
          params: {
            agency_slug: testParams.agency_slug,
            date_from: testParams.date_from instanceof Date 
              ? testParams.date_from.toISOString() 
              : testParams.date_from,
            date_to: testParams.date_to instanceof Date 
              ? testParams.date_to.toISOString() 
              : testParams.date_to,
          },
        },
      });
      
      if (invokeError) throw new Error(invokeError.message);
      
      const edgeResponse: MetricExecutionResult = {
        success: data.success ?? true,
        value: data.value ?? null,
        breakdown: data.breakdown,
        multiBreakdown: data.multiBreakdown,
        visualization: data.visualization || {
          type: data.breakdown ? 'series' : 'single',
          recommendedChart: data.breakdown ? 'bar' : 'number',
          value: data.value,
          labels: data.breakdown ? Object.keys(data.breakdown) : undefined,
          series: data.breakdown ? [{
            name: metricDefinitionJSON.label,
            data: Object.values(data.breakdown) as number[],
          }] : undefined,
        },
        debug: data.debug || {
          executionId: `edge_${Date.now()}`,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: data.metadata?.compute_time_ms || 0,
          endpoints: data.debug?.endpoints || [],
          joins: [],
          filters: [],
          aggregation: data.debug?.aggregation || { type: 'unknown', stats: {} },
        },
        error: data.error,
      };
      
      setEdgeResult(edgeResponse);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur d\'exécution edge');
      setEdgeError(error);
      toast.error(`Erreur edge: ${error.message}`);
    } finally {
      setEdgeLoading(false);
    }
  }, [metricDefinitionJSON, testParams]);

  const handleRunTest = async () => {
    if (!metricDefinitionJSON) {
      toast.error('Veuillez sélectionner une métrique');
      return;
    }
    if (!testParams.agency_slug?.trim()) {
      toast.error('Veuillez renseigner le slug de l\'agence');
      return;
    }

    setShowComparison(false);
    try {
      if (executionTarget === 'frontend') {
        await frontendExecutor.execute(metricDefinitionJSON, testParams);
      } else {
        await executeViaEdge();
      }
    } catch (err) {
      logError('METRIC_TEST', 'Erreur d\'exécution', { error: err });
    }
  };

  const handleRunComparison = async () => {
    if (!metricDefinitionJSON) {
      toast.error('Veuillez sélectionner une métrique');
      return;
    }
    if (!testParams.agency_slug?.trim()) {
      toast.error('Veuillez renseigner le slug de l\'agence');
      return;
    }

    setComparisonLoading(true);
    setShowComparison(true);
    setComparisonResult(null);

    try {
      // Execute frontend
      const frontendStart = performance.now();
      const frontendRes = await runMetric(metricDefinitionJSON, testParams);
      const frontendDuration = Math.round(performance.now() - frontendStart);

      // Execute edge
      const edgeStart = performance.now();
      const { data, error: invokeError } = await supabase.functions.invoke('compute-metric', {
        body: {
          metric_definition: metricDefinitionJSON,
          params: {
            agency_slug: testParams.agency_slug,
            date_from: testParams.date_from instanceof Date 
              ? testParams.date_from.toISOString() 
              : testParams.date_from,
            date_to: testParams.date_to instanceof Date 
              ? testParams.date_to.toISOString() 
              : testParams.date_to,
          },
        },
      });
      const edgeDuration = Math.round(performance.now() - edgeStart);

      let edgeRes: MetricExecutionResult | null = null;
      if (!invokeError && data) {
        edgeRes = {
          success: data.success ?? true,
          value: data.value ?? null,
          breakdown: data.breakdown,
          visualization: data.visualization || {
            type: 'single',
            recommendedChart: 'number',
            value: data.value,
          },
          debug: data.debug || {
            executionId: `edge_${Date.now()}`,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: edgeDuration,
            endpoints: [],
            joins: [],
            filters: [],
            aggregation: { type: 'unknown', stats: {} },
          },
        };
      }

      setComparisonResult({
        frontend: frontendRes,
        edge: edgeRes,
        frontendDuration,
        edgeDuration,
      });

      toast.success('Comparaison terminée');
    } catch (err) {
      logError('METRIC_TEST', 'Erreur de comparaison', { error: err });
      toast.error('Erreur lors de la comparaison');
    } finally {
      setComparisonLoading(false);
    }
  };

  const codeSnippet = useMemo(() => {
    if (!selectedMetric || !metricDefinitionJSON) return '';
    
    const dateFromStr = testParams.date_from instanceof Date 
      ? `new Date('${testParams.date_from.toISOString().split('T')[0]}')` 
      : `'${testParams.date_from}'`;
    const dateToStr = testParams.date_to instanceof Date 
      ? `new Date('${testParams.date_to.toISOString().split('T')[0]}')` 
      : `'${testParams.date_to}'`;

    return `// Intégration métrique STATiA-BY-BIJ
import { useMetricEngine } from '@/statia/hooks/useMetricEngine';
import { MetricVisualization } from '@/statia/components/MetricVisualization';
import type { MetricDefinitionJSON } from '@/statia/engine/metricEngine';

const metricDefinition: MetricDefinitionJSON = {
  id: '${selectedMetric.id}',
  label: '${selectedMetric.label}',
  input_sources: ${JSON.stringify(metricDefinitionJSON.input_sources, null, 2)},
  formula: ${JSON.stringify(metricDefinitionJSON.formula, null, 2)},
  dimensions: ${JSON.stringify(metricDefinitionJSON.dimensions || [])},
  output_format: ${JSON.stringify(metricDefinitionJSON.output_format || { type: 'single' })},
};

export function MyMetricComponent() {
  const { result, loading, error } = useMetricEngine(
    metricDefinition,
    {
      agency_slug: '${testParams.agency_slug || 'mon-agence'}',
      date_from: ${dateFromStr},
      date_to: ${dateToStr},
    }
  );

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  if (!result?.success) return null;

  return (
    <MetricVisualization 
      data={result.visualization}
      title="${selectedMetric.label}"
      height={300}
    />
  );
}`;
  }, [selectedMetric, testParams, metricDefinitionJSON]);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(codeSnippet);
    setSnippetCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  const handleMetricChange = (id: string | null) => {
    onSelectMetric(id);
    frontendExecutor.reset();
    setEdgeResult(null);
    setEdgeError(null);
    setComparisonResult(null);
    setShowComparison(false);
  };

  const formulaInfo = useMemo(() => {
    if (!metricDefinitionJSON) return null;
    const f = metricDefinitionJSON.formula;
    return {
      type: f.type,
      hasGroupBy: (f.groupBy?.length || 0) > 0,
      groupByCount: f.groupBy?.length || 0,
    };
  }, [metricDefinitionJSON]);

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-helpconfort-blue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Configuration du test
          </CardTitle>
          <CardDescription>
            Sélectionnez une métrique et définissez les paramètres d'exécution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Métrique</Label>
            <Select 
              value={selectedMetricId ?? ''} 
              onValueChange={(v) => handleMetricChange(v || null)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner une métrique" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {metrics.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <span>{m.label}</span>
                      {m.validation_status !== 'validated' && (
                        <Badge variant="outline" className="text-xs">
                          {m.validation_status}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMetric && metricDefinitionJSON && (
            <>
              <Separator />

              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedMetric.scope}</Badge>
                  <Badge variant="secondary">{formulaInfo?.type}</Badge>
                  {formulaInfo?.hasGroupBy && (
                    <Badge variant="default">{formulaInfo.groupByCount} dimension(s)</Badge>
                  )}
                  {selectedMetric.validation_status !== 'validated' && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {selectedMetric.validation_status === 'draft' ? 'Brouillon' : 'En test'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedMetric.description_agence || 'Aucune description'}
                </p>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Agence (slug) *</Label>
                  <Input
                    placeholder="ex: lyon, paris, bordeaux..."
                    value={testParams.agency_slug ?? ''}
                    onChange={(e) => setTestParams(p => ({ ...p, agency_slug: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cible d'exécution</Label>
                  <Select value={executionTarget} onValueChange={(v) => setExecutionTarget(v as ExecutionTarget)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="frontend">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Frontend (léger)
                        </div>
                      </SelectItem>
                      <SelectItem value="edge">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Edge Function (lourd)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date début</Label>
                  <Input
                    type="date"
                    value={testParams.date_from instanceof Date 
                      ? format(testParams.date_from, 'yyyy-MM-dd') 
                      : testParams.date_from || ''}
                    onChange={(e) => setTestParams(p => ({ ...p, date_from: new Date(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date fin</Label>
                  <Input
                    type="date"
                    value={testParams.date_to instanceof Date 
                      ? format(testParams.date_to, 'yyyy-MM-dd') 
                      : testParams.date_to || ''}
                    onChange={(e) => setTestParams(p => ({ ...p, date_to: new Date(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 gap-2" 
                  onClick={handleRunTest}
                  disabled={loading || comparisonLoading || !testParams.agency_slug?.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Exécuter ({executionTarget === 'frontend' ? 'Frontend' : 'Edge'})
                </Button>
                <Button 
                  variant="outline"
                  className="gap-2" 
                  onClick={handleRunComparison}
                  disabled={loading || comparisonLoading || !testParams.agency_slug?.trim()}
                >
                  {comparisonLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitCompare className="h-4 w-4" />
                  )}
                  Comparer
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {showComparison && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparaison Frontend vs Edge
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparisonLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-purple-500" />
                <p className="text-muted-foreground">Exécution des deux moteurs...</p>
              </div>
            ) : comparisonResult ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Frontend</span>
                      <Badge variant="outline">{comparisonResult.frontendDuration}ms</Badge>
                    </div>
                    <div className="text-3xl font-bold">
                      {comparisonResult.frontend?.value != null 
                        ? typeof comparisonResult.frontend.value === 'number'
                          ? comparisonResult.frontend.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                          : comparisonResult.frontend.value
                        : 'N/A'}
                    </div>
                    {comparisonResult.frontend?.breakdown && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {Object.keys(comparisonResult.frontend.breakdown).length} groupes
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">Edge</span>
                      <Badge variant="outline">{comparisonResult.edgeDuration}ms</Badge>
                    </div>
                    <div className="text-3xl font-bold">
                      {comparisonResult.edge?.value != null 
                        ? typeof comparisonResult.edge.value === 'number'
                          ? comparisonResult.edge.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                          : comparisonResult.edge.value
                        : 'N/A'}
                    </div>
                    {comparisonResult.edge?.breakdown && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {Object.keys(comparisonResult.edge.breakdown).length} groupes
                      </div>
                    )}
                  </div>
                </div>

                {/* Difference Analysis */}
                {comparisonResult.frontend?.value != null && comparisonResult.edge?.value != null && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Analyse des écarts</h4>
                    {(() => {
                      const frontVal = Number(comparisonResult.frontend?.value) || 0;
                      const edgeVal = Number(comparisonResult.edge?.value) || 0;
                      const diff = Math.abs(frontVal - edgeVal);
                      const pctDiff = frontVal !== 0 ? (diff / frontVal) * 100 : 0;
                      const isIdentical = diff < 0.01;
                      
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Différence absolue</span>
                            <span className={isIdentical ? 'text-green-500' : 'text-yellow-500'}>
                              {diff.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Différence relative</span>
                            <span className={pctDiff < 1 ? 'text-green-500' : 'text-yellow-500'}>
                              {pctDiff.toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Temps Frontend</span>
                            <span>{comparisonResult.frontendDuration}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Temps Edge</span>
                            <span>{comparisonResult.edgeDuration}ms</span>
                          </div>
                          {isIdentical ? (
                            <Badge variant="default" className="mt-2">✓ Résultats identiques</Badge>
                          ) : pctDiff < 1 ? (
                            <Badge variant="secondary" className="mt-2">⚠ Écart négligeable (&lt;1%)</Badge>
                          ) : (
                            <Badge variant="destructive" className="mt-2">✗ Écart significatif ({pctDiff.toFixed(1)}%)</Badge>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Detailed breakdown comparison */}
                {comparisonResult.frontend?.breakdown && comparisonResult.edge?.breakdown && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground">
                      <ChevronDown className="h-4 w-4" />
                      Comparaison détaillée des breakdowns
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Dimension</th>
                              <th className="text-right p-2">Frontend</th>
                              <th className="text-right p-2">Edge</th>
                              <th className="text-right p-2">Écart</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.keys({
                              ...comparisonResult.frontend.breakdown,
                              ...comparisonResult.edge.breakdown,
                            }).map(key => {
                              const frontVal = comparisonResult.frontend?.breakdown?.[key] ?? 0;
                              const edgeVal = comparisonResult.edge?.breakdown?.[key] ?? 0;
                              const diff = frontVal - edgeVal;
                              return (
                                <tr key={key} className="border-b border-border/50">
                                  <td className="p-2">{key}</td>
                                  <td className="text-right p-2 font-mono">{frontVal.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</td>
                                  <td className="text-right p-2 font-mono">{edgeVal.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</td>
                                  <td className={`text-right p-2 font-mono ${Math.abs(diff) > 0.01 ? 'text-yellow-500' : 'text-green-500'}`}>
                                    {diff !== 0 ? (diff > 0 ? '+' : '') + diff.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '='}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {(result || loading || error) && !showComparison && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Résultats
              {result?.success && (
                <>
                  <Badge variant="default" className="ml-2">{result.debug.durationMs}ms</Badge>
                  <Badge variant="outline" className="ml-1">
                    {executionTarget === 'frontend' ? 'Frontend' : 'Edge'}
                  </Badge>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-helpconfort-blue" />
                <p className="text-muted-foreground">Calcul en cours ({executionTarget})...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Erreur d'exécution</p>
                    <p className="text-sm text-muted-foreground">{error.message}</p>
                  </div>
                </div>
              </div>
            ) : result?.success ? (
              <Tabs defaultValue="visualization" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="visualization">Visualisation</TabsTrigger>
                  <TabsTrigger value="debug">Debug</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent value="visualization" className="space-y-4">
                  {/* Affichage principal selon type de métrique */}
                  {result.breakdown && Object.keys(result.breakdown).length > 0 ? (
                    // Distribution (groupBy) - Afficher le tableau/graphique
                    <>
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">Distribution</Badge>
                          <span className="text-sm text-muted-foreground">
                            {Object.keys(result.breakdown).length} groupes
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Somme totale: <strong>{result.value?.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</strong>
                          {formulaInfo?.type === 'ratio' && '%'}
                        </p>
                      </div>
                      
                      {/* Tableau de distribution trié */}
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">Dimension</th>
                              <th className="text-right p-3 font-medium">Valeur</th>
                              <th className="text-right p-3 font-medium">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(result.breakdown)
                              .sort(([, a], [, b]) => b - a)
                              .map(([key, value]) => {
                                const pct = result.value && result.value > 0 
                                  ? (value / result.value) * 100 
                                  : 0;
                                return (
                                  <tr key={key} className="border-b border-border/50 hover:bg-muted/30">
                                    <td className="p-3">{key}</td>
                                    <td className="text-right p-3 font-mono font-medium">
                                      {value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="text-right p-3 font-mono text-muted-foreground">
                                      {pct.toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      {/* Graphique si disponible */}
                      {result.visualization?.labels && result.visualization.labels.length > 0 && (
                        <MetricVisualization 
                          data={result.visualization}
                          title={selectedMetric?.label}
                          height={350}
                        />
                      )}
                    </>
                  ) : (
                    // Valeur simple
                    <>
                      <MetricVisualization 
                        data={result.visualization}
                        title={selectedMetric?.label}
                        height={350}
                      />

                      {result.value !== null && result.value !== undefined && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">Valeur calculée</p>
                          <p className="text-3xl font-bold">
                            {typeof result.value === 'number' 
                              ? result.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                              : result.value}
                            {formulaInfo?.type === 'ratio' && '%'}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="debug">
                  <MetricDebugPanel debug={result.debug} />
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Comment utiliser cette métrique</h4>
                      <p className="text-sm text-muted-foreground">
                        Copiez ce code pour intégrer la métrique
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopySnippet}
                      className="gap-2"
                    >
                      {snippetCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {snippetCopied ? 'Copié !' : 'Copier'}
                    </Button>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96 font-mono">
                    <code>{codeSnippet}</code>
                  </pre>
                </TabsContent>
              </Tabs>
            ) : result?.error ? (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">{result.error.code}</p>
                    <p className="text-sm text-muted-foreground">{result.error.message}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {!result && !loading && !error && selectedMetric && !showComparison && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Cliquez sur "Exécuter" pour voir les résultats</p>
            <p className="text-xs mt-2">
              Mode: {executionTarget === 'frontend' ? 'Frontend (client)' : 'Edge (serveur)'}
            </p>
            <p className="text-xs mt-1">
              ou "Comparer" pour tester les deux moteurs
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MetricTestPanel;
