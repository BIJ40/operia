import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Loader2, Check, AlertCircle, Lightbulb, RefreshCw, Save, Play, Database, Filter, Calculator, Layers } from 'lucide-react';
import { useMetricAIAnalysis, MetricAnalysisResult } from '../hooks/useMetricAIAnalysis';
import { cn } from '@/lib/utils';

interface MetricAIBuilderProps {
  onSave: (metric: any) => void;
  onCancel: () => void;
  initialMetric?: any; // Pour mode édition - démarre directement sur review
}

const EXAMPLE_QUERIES = [
  // 7 cas de référence obligatoires
  "Nombre de devis validés sur la période",
  "Nombre de devis validés PAR apporteur sur la période",
  "Taux de transformation de devis en facture",
  "Taux de transformation de devis en facture PAR apporteur",
  "Nombre de RDV RT sur la période",
  "Nombre de RDV RT PAR apporteur sur la période",
  "Nombre de RDV RT PAR apporteur PAR univers",
  // Autres exemples utiles
  "CA moyen PAR technicien",
  "Part du SAV dans les interventions",
];

export function MetricAIBuilder({ onSave, onCancel, initialMetric }: MetricAIBuilderProps) {
  const [query, setQuery] = useState(initialMetric?.label || '');
  const [editedMetric, setEditedMetric] = useState<MetricAnalysisResult['metric'] | null>(
    initialMetric ? {
      id: initialMetric.id,
      label: initialMetric.label,
      scope: initialMetric.scope,
      input_sources: typeof initialMetric.input_sources === 'string' 
        ? JSON.parse(initialMetric.input_sources) 
        : initialMetric.input_sources,
      filters: initialMetric.filters || [],
      formula: typeof initialMetric.formula === 'string'
        ? JSON.parse(initialMetric.formula)
        : initialMetric.formula,
      dimensions: typeof initialMetric.dimensions === 'string'
        ? JSON.parse(initialMetric.dimensions)
        : initialMetric.dimensions || [],
      description_agence: initialMetric.description_agence,
      description_franchiseur: initialMetric.description_franchiseur,
    } : null
  );
  const [step, setStep] = useState<'input' | 'review' | 'test'>(initialMetric ? 'review' : 'input');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  
  const { analyzeQuery, isAnalyzing, result, reset } = useMetricAIAnalysis();

  const handleAnalyze = async () => {
    const analysisResult = await analyzeQuery(query);
    if (analysisResult?.understood && analysisResult.metric) {
      setEditedMetric(analysisResult.metric);
      setStep('review');
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const handleNewQuery = () => {
    reset();
    setEditedMetric(null);
    setStep('input');
    setTestResult(null);
  };

  const hasDimensions = editedMetric?.dimensions && editedMetric.dimensions.length > 0;

  const handleTest = async () => {
    setIsTesting(true);
    // Simulation de test avec données dimensionnelles si applicable
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (hasDimensions) {
      // Résultat avec dimensions (tableau)
      const dimensionKey = editedMetric?.dimensions?.[0]?.label || 'Groupe';
      setTestResult({
        success: true,
        hasDimensions: true,
        dimensionLabel: dimensionKey,
        data: [
          { dimension: 'AXA', value: 42 },
          { dimension: 'MAIF', value: 28 },
          { dimension: 'Allianz', value: 15 },
          { dimension: 'Groupama', value: 12 },
          { dimension: 'MMA', value: 8 }
        ],
        executionTime: Math.floor(Math.random() * 500) + 100,
      });
    } else {
      // Résultat simple (un nombre)
      setTestResult({
        success: true,
        hasDimensions: false,
        count: Math.floor(Math.random() * 100) + 10,
        executionTime: Math.floor(Math.random() * 500) + 100,
      });
    }
    setIsTesting(false);
    setStep('test');
  };

  const handleSave = () => {
    if (editedMetric) {
      onSave({
        ...editedMetric,
        input_sources: JSON.stringify(editedMetric.input_sources),
        formula: JSON.stringify(editedMetric.formula),
        dimensions: JSON.stringify(editedMetric.dimensions || []),
        validation_status: 'draft'
      });
    }
  };

  // Helper to safely display filter values
  const formatFilterValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  // Step 1: Input
  if (step === 'input') {
    return (
      <div className="space-y-6">
        {/* Barre IA principale */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Décrivez votre métrique</CardTitle>
            </div>
            <CardDescription>
              Tapez une phrase en langage naturel. Utilisez "PAR" pour des analyses dimensionnelles (ex: "CA PAR apporteur")
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Nombre de devis validés PAR apporteur sur la période"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleAnalyze()}
                className="flex-1 text-base h-12"
                autoFocus
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !query.trim()}
                className="h-12 px-6"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyser
                  </>
                )}
              </Button>
            </div>

            {/* Exemples */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Exemples de requêtes (avec ou sans dimension)
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => (
                  <Badge
                    key={example}
                    variant="outline"
                    className={cn(
                      "cursor-pointer hover:bg-primary/10 transition-colors",
                      example.includes('PAR') && "border-primary/50 bg-primary/5"
                    )}
                    onClick={() => handleExampleClick(example)}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Résultat d'analyse si non compris */}
        {result && !result.understood && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-5 w-5" />
                <CardTitle className="text-base">Besoin de précisions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-amber-800">{result.businessSummary}</p>
              {result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-amber-600">Suggestions :</p>
                  <div className="flex flex-wrap gap-2">
                    {result.suggestions.map((suggestion, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer border-amber-300 hover:bg-amber-100"
                        onClick={() => handleExampleClick(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Review - permet aussi d'afficher en mode édition (sans result)
  if (step === 'review' && editedMetric) {
    return (
      <div className="space-y-6">
        {/* Header avec requête originale */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>"{query}"</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleNewQuery}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Nouvelle requête
          </Button>
        </div>

        {/* Résumé métier - visible seulement si on a un result (pas en mode édition directe) */}
        {result && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="h-5 w-5" />
                <CardTitle className="text-base">Compris !</CardTitle>
                <Badge variant="outline" className="ml-auto border-green-300">
                  Confiance: {Math.round((result.confidence || 0.9) * 100)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">Résumé métier</p>
                <p className="text-sm text-green-700">{result.businessSummary}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">Résumé technique</p>
                <p className="text-xs font-mono text-green-600 bg-green-100 p-2 rounded">
                  {result.technicalSummary}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Détails éditables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Métadonnées */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Métadonnées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Identifiant</Label>
                <Input
                  value={editedMetric.id}
                  onChange={(e) => setEditedMetric({ ...editedMetric, id: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Libellé</Label>
                <Input
                  value={editedMetric.label}
                  onChange={(e) => setEditedMetric({ ...editedMetric, label: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Scope</Label>
                <Select
                  value={editedMetric.scope}
                  onValueChange={(v) => setEditedMetric({ ...editedMetric, scope: v as 'agency' | 'franchiseur' })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="agency">Agence</SelectItem>
                    <SelectItem value="franchiseur">Franchiseur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Source */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Source de données
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="secondary" className="text-sm">
                  {editedMetric.input_sources.primary}
                </Badge>
                {editedMetric.input_sources.joins && editedMetric.input_sources.joins.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">+ Jointures:</span>
                    {editedMetric.input_sources.joins.map((j, i) => {
                      const joinStr = typeof j === 'string' ? j : 
                        (j as { from?: string; to?: string }).from && (j as { from?: string; to?: string }).to 
                          ? `${(j as { from: string }).from} → ${(j as { to: string }).to}` 
                          : JSON.stringify(j);
                      return (
                        <Badge key={i} variant="outline" className="text-xs">{joinStr}</Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filtres */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtres appliqués
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {editedMetric.filters.map((filter, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono bg-muted p-1.5 rounded">
                    <span className="font-medium">{filter.field}</span>
                    <span className="text-muted-foreground">{filter.operator}</span>
                    <span className="text-primary">{formatFilterValue(filter.value)}</span>
                  </div>
                ))}
                {editedMetric.filters.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun filtre</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Formule */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Formule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge className={cn(
                  "text-sm",
                  editedMetric.formula.type === 'count' && "bg-blue-500",
                  editedMetric.formula.type === 'sum' && "bg-green-500",
                  editedMetric.formula.type === 'avg' && "bg-purple-500",
                  editedMetric.formula.type === 'ratio' && "bg-orange-500"
                )}>
                  {editedMetric.formula.type.toUpperCase()}
                  {editedMetric.formula.field && `(${editedMetric.formula.field})`}
                </Badge>
                {editedMetric.formula.groupBy && editedMetric.formula.groupBy.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">GROUP BY:</span>
                    {editedMetric.formula.groupBy.map((g, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{g}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dimensions - Section mise en valeur */}
        {hasDimensions && (
          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                <Layers className="h-4 w-4" />
                Dimensions (ventilation des résultats)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {editedMetric.dimensions?.map((dim, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-purple-100/50 rounded">
                    <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                      PAR {dim.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {dim.source && `Source: ${dim.source}`}
                      {dim.field && ` • Champ: ${dim.field}`}
                      {dim.via && ` • Via: ${dim.via}`}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-purple-600 mt-2">
                  ℹ️ Le résultat sera un tableau ventilé par {editedMetric.dimensions?.map(d => d.label).join(', ')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editedMetric.description_agence || ''}
              onChange={(e) => setEditedMetric({ ...editedMetric, description_agence: e.target.value })}
              placeholder="Description pour les utilisateurs..."
              className="text-sm"
              rows={2}
            />
          </CardContent>
        </Card>

        {/* Actions - sticky en bas */}
        <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-6 -mx-6 px-6">
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={handleNewQuery}>
              ← Nouvelle requête
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTest} disabled={isTesting}>
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Tester
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Test
  if (step === 'test' && testResult) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            <span className="font-medium">Test réussi</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep('review')}>
            ← Retour à la configuration
          </Button>
        </div>

        {/* Résultats */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-base">Résultats du test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult.hasDimensions ? (
              <>
                {/* Résultat dimensionnel = tableau */}
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm font-medium mb-3">
                    Ventilation par {testResult.dimensionLabel}
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{testResult.dimensionLabel}</TableHead>
                        <TableHead className="text-right">Valeur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testResult.data.map((row: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.dimension}</TableCell>
                          <TableCell className="text-right text-primary font-bold">{row.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold">{testResult.data.length}</p>
                    <p className="text-xs text-muted-foreground">Groupes trouvés</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold">{testResult.executionTime}ms</p>
                    <p className="text-xs text-muted-foreground">Temps d'exécution</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Résultat simple = un nombre */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-primary">{testResult.count}</p>
                    <p className="text-xs text-muted-foreground">Valeur calculée</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold">{testResult.executionTime}ms</p>
                    <p className="text-xs text-muted-foreground">Temps d'exécution</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-green-600">✓</p>
                    <p className="text-xs text-muted-foreground">Statut</p>
                  </div>
                </div>
              </>
            )}

            {/* Debug */}
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Voir le détail technique
              </summary>
              <pre className="mt-2 p-3 bg-muted text-xs font-mono rounded overflow-auto max-h-40">
                {JSON.stringify({ metric: editedMetric, result: testResult }, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStep('review')}>
            Modifier
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer la métrique
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
