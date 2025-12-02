/**
 * STATiA-BY-BIJ - Panel de test des métriques
 * 
 * Affiche les résultats et un debug enrichi avec:
 * - URLs des sources
 * - Compteurs bruts/filtrés
 * - Stats min/max/avg pour les agrégations
 * - Numerator/denominator pour les ratios
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertCircle, CheckCircle2, Clock, FlaskConical, Loader2, Play, Zap, 
  ChevronDown, Database, ArrowRight, TrendingUp, TrendingDown, Minus,
  Globe
} from 'lucide-react';
import { MetricDefinition, MetricParams } from '../types';
import { useMetric } from '../hooks/useMetric';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { buildAgencyBaseUrl } from '../schema/apogeeSchemaV2';

interface MetricTestPanelProps {
  metrics: MetricDefinition[];
  selectedMetricId: string | null;
  onSelectMetric: (id: string | null) => void;
}

export function MetricTestPanel({ metrics, selectedMetricId, onSelectMetric }: MetricTestPanelProps) {
  const [testParams, setTestParams] = useState<MetricParams>({
    agency_slug: '',
    date_from: startOfMonth(subMonths(new Date(), 1)),
    date_to: endOfMonth(subMonths(new Date(), 1)),
  });
  const [isTestEnabled, setIsTestEnabled] = useState(false);

  const selectedMetric = metrics.find(m => m.id === selectedMetricId);

  const { value, loading, error, metadata, debug } = useMetric(
    selectedMetricId ?? '',
    testParams,
    { enabled: isTestEnabled && !!selectedMetricId, allowDraft: true }
  );

  const handleRunTest = () => {
    setIsTestEnabled(true);
  };

  const formatValue = (val: any, unit?: string) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      if (unit === 'euros') return `${val.toLocaleString('fr-FR')} €`;
      if (unit === 'percent') return `${val.toFixed(1)} %`;
      if (unit === 'minutes') return `${val.toFixed(0)} min`;
      return val.toLocaleString('fr-FR');
    }
    return String(val);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Test Configuration */}
      <Card className="border-l-4 border-l-helpconfort-blue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Configuration du test
          </CardTitle>
          <CardDescription>
            Sélectionnez une métrique et définissez les paramètres
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metric Selection */}
          <div className="space-y-2">
            <Label>Métrique</Label>
            <Select 
              value={selectedMetricId ?? ''} 
              onValueChange={(v) => {
                onSelectMetric(v || null);
                setIsTestEnabled(false);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner une métrique" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {metrics.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMetric && (
            <>
              <Separator />

              {/* Metric Info */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedMetric.scope}</Badge>
                  <Badge variant="outline">{selectedMetric.formula.type}</Badge>
                  {selectedMetric.formula.field && (
                    <Badge variant="secondary">{selectedMetric.formula.field}</Badge>
                  )}
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

              {/* Parameters */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Agence (slug)</Label>
                  <Input
                    placeholder="ex: lyon, paris, bordeaux..."
                    value={testParams.agency_slug ?? ''}
                    onChange={(e) => {
                      setTestParams(p => ({ ...p, agency_slug: e.target.value }));
                      setIsTestEnabled(false);
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date début</Label>
                    <Input
                      type="date"
                      value={testParams.date_from ? format(testParams.date_from, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        setTestParams(p => ({ ...p, date_from: new Date(e.target.value) }));
                        setIsTestEnabled(false);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date fin</Label>
                    <Input
                      type="date"
                      value={testParams.date_to ? format(testParams.date_to, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        setTestParams(p => ({ ...p, date_to: new Date(e.target.value) }));
                        setIsTestEnabled(false);
                      }}
                    />
                  </div>
                </div>
              </div>

              <Button 
                className="w-full gap-2" 
                onClick={handleRunTest}
                disabled={loading}
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

      {/* Test Results */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Résultats
          </CardTitle>
          <CardDescription>
            Résultat du calcul et informations de debug
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isTestEnabled ? (
            <div className="text-center py-12 text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Configurez et lancez un test pour voir les résultats</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-helpconfort-blue" />
              <p className="text-muted-foreground">Calcul en cours...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">{error.code}</p>
                  <p className="text-sm text-muted-foreground">{error.message}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Main Result */}
              <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Résultat</p>
                <p className="text-4xl font-bold text-green-700 dark:text-green-400">
                  {formatValue(value, selectedMetric?.formula.unit)}
                </p>
              </div>

              {/* Metadata */}
              {metadata && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Temps de calcul</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {metadata.compute_time_ms} ms
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Points de données</p>
                    <p className="font-medium">{metadata.data_points}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Cache</p>
                    <p className="font-medium flex items-center gap-1">
                      {metadata.cache_hit ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Hit
                        </>
                      ) : (
                        'Miss'
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Exécution</p>
                    <p className="font-medium">{debug.executionTarget}</p>
                  </div>
                </div>
              )}

              {/* Debug Info - Enriched */}
              <DebugSection 
                debug={debug} 
                selectedMetric={selectedMetric} 
                testParams={testParams}
                value={value}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// DEBUG SECTION - Composant enrichi
// ============================================

interface DebugSectionProps {
  debug: any;
  selectedMetric: MetricDefinition | undefined;
  testParams: MetricParams;
  value: any;
}

function DebugSection({ debug, selectedMetric, testParams, value }: DebugSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const loadDebug = debug?._loadDebug || {};
  const sources = selectedMetric?.input_sources || [];
  
  // Extract stats from debug if available
  const stats = loadDebug.aggregationStats || {};
  const formulaType = selectedMetric?.formula?.type || 'unknown';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground">
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
        Debug enrichi
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3">
        {/* Sources utilisées */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Sources de données</p>
          {sources.map((source, idx) => (
            <div key={idx} className="p-3 bg-muted/50 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">{source.source}</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono text-muted-foreground">
                  {loadDebug.apiUrl || 'URL non configurée'}
                </span>
              </div>
              {testParams.agency_slug && (
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-muted-foreground">
                    {buildAgencyBaseUrl(testParams.agency_slug)}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="p-2 bg-background rounded">
                  <span className="text-muted-foreground">Lignes brutes:</span>
                  <span className="font-medium ml-1">
                    {loadDebug.rawCounts?.[source.source] ?? '?'}
                  </span>
                </div>
                <div className="p-2 bg-background rounded">
                  <span className="text-muted-foreground">Après filtres:</span>
                  <span className="font-medium ml-1">
                    {loadDebug.filteredCounts?.[source.source] ?? '?'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats d'agrégation */}
        {(formulaType === 'sum' || formulaType === 'avg') && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Statistiques sur les données</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-center">
                <Minus className="h-3 w-3 mx-auto mb-1 text-blue-500" />
                <p className="text-[10px] text-muted-foreground">Min</p>
                <p className="font-medium text-sm">{formatStatValue(stats.min)}</p>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-center">
                <TrendingUp className="h-3 w-3 mx-auto mb-1 text-green-500" />
                <p className="text-[10px] text-muted-foreground">Max</p>
                <p className="font-medium text-sm">{formatStatValue(stats.max)}</p>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-center">
                <TrendingDown className="h-3 w-3 mx-auto mb-1 text-amber-500" />
                <p className="text-[10px] text-muted-foreground">Moy</p>
                <p className="font-medium text-sm">{formatStatValue(stats.avg)}</p>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded text-center">
                <Database className="h-3 w-3 mx-auto mb-1 text-purple-500" />
                <p className="text-[10px] text-muted-foreground">Count</p>
                <p className="font-medium text-sm">{stats.count ?? '?'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats ratio */}
        {formulaType === 'ratio' && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Détail ratio</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-center">
                <p className="text-[10px] text-muted-foreground">Numérateur</p>
                <p className="font-medium text-sm">{stats.numeratorCount ?? '?'}</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-center">
                <p className="text-[10px] text-muted-foreground">Dénominateur</p>
                <p className="font-medium text-sm">{stats.denominatorCount ?? '?'}</p>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-center">
                <p className="text-[10px] text-muted-foreground">Résultat</p>
                <p className="font-medium text-sm">
                  {typeof value === 'number' ? `${value.toFixed(2)}%` : '?'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtres appliqués */}
        {loadDebug.appliedFilters && Object.keys(loadDebug.appliedFilters).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Filtres appliqués</p>
            <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-24">
              {JSON.stringify(loadDebug.appliedFilters, null, 2)}
            </pre>
          </div>
        )}

        {/* Debug JSON complet */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">JSON complet</p>
          <ScrollArea className="h-32">
            <pre className="p-2 bg-muted rounded text-xs">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatStatValue(val: any): string {
  if (val === null || val === undefined) return '?';
  if (typeof val === 'number') return val.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return String(val);
}
