/**
 * STATiA-BY-BIJ - Console centrale de test des métriques
 * 
 * Utilise exclusivement useMetricEngine comme source de vérité.
 * Intègre visualisation + debug enrichi + snippet de réutilisation.
 */

import { useState, useMemo } from 'react';
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
  ChevronDown, Code, Copy, Check, Server, Monitor
} from 'lucide-react';
import { MetricDefinition } from '../types';
import { useMetricExecutor } from '../hooks/useMetricEngine';
import { MetricVisualization } from './MetricVisualization';
import { MetricDebugPanel } from './MetricDebugPanel';
import type { MetricDefinitionJSON, MetricExecutionParams } from '../engine/metricEngine';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

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
// COMPOSANT PRINCIPAL
// ============================================

export function MetricTestPanel({ metrics, selectedMetricId, onSelectMetric }: MetricTestPanelProps) {
  // État du formulaire
  const [testParams, setTestParams] = useState<MetricExecutionParams>({
    agency_slug: '',
    date_from: startOfMonth(subMonths(new Date(), 1)),
    date_to: endOfMonth(subMonths(new Date(), 1)),
  });
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget>('frontend');
  const [snippetCopied, setSnippetCopied] = useState(false);

  // Hook du moteur d'exécution
  const { result, loading, error, execute, reset } = useMetricExecutor();

  // Métrique sélectionnée
  const selectedMetric = metrics.find(m => m.id === selectedMetricId);

  // Convertir MetricDefinition en MetricDefinitionJSON pour le moteur
  const metricDefinitionJSON = useMemo((): MetricDefinitionJSON | null => {
    if (!selectedMetric) return null;

    // Parser les champs JSON si nécessaire
    const inputSources = typeof selectedMetric.input_sources === 'string' 
      ? JSON.parse(selectedMetric.input_sources) 
      : selectedMetric.input_sources;
    
    const formula = typeof selectedMetric.formula === 'string'
      ? JSON.parse(selectedMetric.formula)
      : selectedMetric.formula;

    // Construire la définition pour le moteur
    return {
      id: selectedMetric.id,
      label: selectedMetric.label,
      input_sources: {
        primary: inputSources?.primary || inputSources?.[0]?.source || 'projects',
        secondary: inputSources?.secondary,
        joins: inputSources?.joins,
      },
      formula: {
        type: formula?.type || 'count',
        field: formula?.field,
        numerator: formula?.numerator,
        denominator: formula?.denominator,
        groupBy: formula?.groupBy,
      },
      filters: formula?.filters || [],
      dimensions: formula?.groupBy || [],
      output_format: { 
        type: formula?.groupBy?.length ? 'series' : 'single', 
        recommendedChart: formula?.groupBy?.length ? 'bar' : 'number' 
      },
    };
  }, [selectedMetric]);

  // Exécuter le test
  const handleRunTest = async () => {
    if (!metricDefinitionJSON || !testParams.agency_slug) {
      toast.error('Veuillez remplir tous les paramètres requis');
      return;
    }

    try {
      await execute(metricDefinitionJSON, testParams);
    } catch (err) {
      console.error('Erreur d\'exécution:', err);
    }
  };

  // Générer le snippet de code
  const codeSnippet = useMemo(() => {
    if (!selectedMetric) return '';
    
    const dateFromStr = testParams.date_from instanceof Date 
      ? `new Date('${testParams.date_from.toISOString()}')` 
      : `'${testParams.date_from}'`;
    const dateToStr = testParams.date_to instanceof Date 
      ? `new Date('${testParams.date_to.toISOString()}')` 
      : `'${testParams.date_to}'`;

    return `// Import du hook et du composant de visualisation
import { useMetricEngine } from '@/statia/hooks/useMetricEngine';
import { MetricVisualization } from '@/statia/components/MetricVisualization';

// Définition de la métrique (à récupérer depuis la base)
const metricDefinition = {
  id: '${selectedMetric.id}',
  // ... autres champs depuis metrics_definitions
};

// Utilisation dans un composant React
function MyMetricComponent() {
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
    />
  );
}`;
  }, [selectedMetric, testParams]);

  // Copier le snippet
  const handleCopySnippet = () => {
    navigator.clipboard.writeText(codeSnippet);
    setSnippetCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  // Reset quand on change de métrique
  const handleMetricChange = (id: string | null) => {
    onSelectMetric(id);
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Configuration du test */}
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
          {/* Sélection de la métrique */}
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

          {selectedMetric && (
            <>
              <Separator />

              {/* Info métrique */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedMetric.scope}</Badge>
                  <Badge variant="secondary">
                    {typeof selectedMetric.formula === 'string' 
                      ? JSON.parse(selectedMetric.formula)?.type 
                      : selectedMetric.formula?.type}
                  </Badge>
                  {selectedMetric.validation_status !== 'validated' && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {selectedMetric.validation_status === 'draft' ? 'Brouillon' : 'En test'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedMetric.description_agence}
                </p>
              </div>

              <Separator />

              {/* Paramètres */}
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
                disabled={loading || !testParams.agency_slug}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Exécuter le test
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Résultats */}
      {(result || loading || error) && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Résultats
              {result?.success && (
                <Badge variant="default" className="ml-2">
                  {result.debug.durationMs}ms
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-helpconfort-blue" />
                <p className="text-muted-foreground">Calcul en cours...</p>
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

                {/* Onglet Visualisation */}
                <TabsContent value="visualization" className="space-y-4">
                  <MetricVisualization 
                    data={result.visualization}
                    title={selectedMetric?.label}
                    height={350}
                  />

                  {/* Breakdown si disponible */}
                  {result.breakdown && Object.keys(result.breakdown).length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground">
                        <ChevronDown className="h-4 w-4" />
                        Détail par dimension ({Object.keys(result.breakdown).length} valeurs)
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(result.breakdown).map(([key, value]) => (
                            <div key={key} className="p-2 bg-muted/50 rounded text-sm">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-mono ml-2">{value.toLocaleString('fr-FR')}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </TabsContent>

                {/* Onglet Debug */}
                <TabsContent value="debug">
                  <MetricDebugPanel debug={result.debug} />
                </TabsContent>

                {/* Onglet Code */}
                <TabsContent value="code" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Comment utiliser cette métrique</h4>
                      <p className="text-sm text-muted-foreground">
                        Copiez ce code pour intégrer la métrique dans votre page
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

      {/* État initial */}
      {!result && !loading && !error && selectedMetric && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Cliquez sur "Exécuter le test" pour voir les résultats</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MetricTestPanel;
