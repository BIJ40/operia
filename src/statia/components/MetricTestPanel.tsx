/**
 * STATiA-BY-BIJ - Panel de test des métriques
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Clock, FlaskConical, Loader2, Play, Zap } from 'lucide-react';
import { MetricDefinition, MetricParams } from '../types';
import { useMetric } from '../hooks/useMetric';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    { enabled: isTestEnabled && !!selectedMetricId }
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

              {/* Debug Info */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Debug API</p>
                {(debug as any)._loadDebug && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs space-y-1">
                    <p><strong>Endpoint:</strong> {(debug as any)._loadDebug?.apiUrl || 'Non configuré'}</p>
                    <p><strong>Clé API:</strong> {(debug as any)._loadDebug?.apiKeyPresent ? '✅ Présente' : '❌ Absente'}</p>
                    <p><strong>Données brutes:</strong> {JSON.stringify((debug as any)._loadDebug?.rawCounts || {})}</p>
                    <p><strong>Après filtres:</strong> {JSON.stringify((debug as any)._loadDebug?.filteredCounts || {})}</p>
                    <p><strong>Filtres appliqués:</strong></p>
                    <pre className="p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify((debug as any)._loadDebug?.appliedFilters || {}, null, 2)}
                    </pre>
                  </div>
                )}
                <p className="text-sm font-medium mt-2">Debug complet</p>
                <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                  {JSON.stringify(debug, null, 2)}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
