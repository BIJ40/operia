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
  ChevronDown, Copy, Check, Server, Monitor
} from 'lucide-react';
import { MetricDefinition } from '../types';
import { useMetricExecutor } from '../hooks/useMetricEngine';
import { MetricVisualization } from './MetricVisualization';
import { MetricDebugPanel } from './MetricDebugPanel';
import type { MetricDefinitionJSON, MetricExecutionParams, MetricExecutionResult } from '../engine/metricEngine';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
function buildMetricDefinitionJSON(metric: MetricDefinition): MetricDefinitionJSON {
  const rawInputSources = safeParseJSON<any>(metric.input_sources, {});
  const rawFormula = safeParseJSON<ParsedFormula>(metric.formula, { type: 'count' });
  
  let primary = 'projects';
  let secondary: Array<{ source: string; joinOn?: { local: string; foreign: string } }> = [];
  let joins: Array<{ from: string; to: string; on: { local: string; foreign: string } }> = [];
  
  if (Array.isArray(rawInputSources)) {
    if (rawInputSources.length > 0) {
      primary = rawInputSources[0]?.source || 'projects';
      secondary = rawInputSources.slice(1).map((s: any) => ({
        source: s.source,
        joinOn: s.joinOn,
      }));
    }
  } else if (typeof rawInputSources === 'object' && rawInputSources !== null) {
    primary = rawInputSources.primary || 'projects';
    secondary = Array.isArray(rawInputSources.secondary) 
      ? rawInputSources.secondary.map((s: any) => ({
          source: typeof s === 'string' ? s : s.source,
          joinOn: s.joinOn,
        }))
      : [];
    joins = Array.isArray(rawInputSources.joins) ? rawInputSources.joins : [];
  }
  
  const filters = Array.isArray(rawFormula.filters) ? rawFormula.filters : [];
  const dimensions = Array.isArray(rawFormula.groupBy) ? rawFormula.groupBy : [];
  const hasGroupBy = dimensions.length > 0;
  
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
      field: rawFormula.field,
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

    try {
      if (executionTarget === 'frontend') {
        await frontendExecutor.execute(metricDefinitionJSON, testParams);
      } else {
        await executeViaEdge();
      }
    } catch (err) {
      console.error('Erreur d\'exécution:', err);
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

              <Button 
                className="w-full gap-2" 
                onClick={handleRunTest}
                disabled={loading || !testParams.agency_slug?.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Exécuter ({executionTarget === 'frontend' ? 'Frontend' : 'Edge'})
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {(result || loading || error) && (
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
                  <MetricVisualization 
                    data={result.visualization}
                    title={selectedMetric?.label}
                    height={350}
                  />

                  {result.value !== null && result.value !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Valeur globale</p>
                      <p className="text-2xl font-bold">
                        {typeof result.value === 'number' 
                          ? result.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
                          : result.value}
                        {formulaInfo?.type === 'ratio' && '%'}
                      </p>
                    </div>
                  )}

                  {result.breakdown && Object.keys(result.breakdown).length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground">
                        <ChevronDown className="h-4 w-4" />
                        Détail ({Object.keys(result.breakdown).length} valeurs)
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-auto">
                          {Object.entries(result.breakdown)
                            .sort(([, a], [, b]) => b - a)
                            .map(([key, value]) => (
                              <div key={key} className="p-2 bg-muted/50 rounded text-sm">
                                <span className="text-muted-foreground truncate block">{key}</span>
                                <span className="font-mono font-medium">
                                  {value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
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

      {!result && !loading && !error && selectedMetric && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Cliquez sur "Exécuter" pour voir les résultats</p>
            <p className="text-xs mt-2">
              Mode: {executionTarget === 'frontend' ? 'Frontend (client)' : 'Edge (serveur)'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MetricTestPanel;
