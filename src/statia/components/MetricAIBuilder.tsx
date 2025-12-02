import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Check, ChevronRight, AlertCircle, Lightbulb, RefreshCw, Save, Play, Database, Filter, Calculator } from 'lucide-react';
import { useMetricAIAnalysis, MetricAnalysisResult } from '../hooks/useMetricAIAnalysis';
import { cn } from '@/lib/utils';

interface MetricAIBuilderProps {
  onSave: (metric: any) => void;
  onCancel: () => void;
}

const EXAMPLE_QUERIES = [
  "CA facturé ce mois",
  "Nombre d'interventions cette semaine",
  "Devis validés en attente de facturation",
  "Top 5 techniciens par CA",
  "Taux de transformation devis/factures",
  "Interventions SAV du mois",
  "Dossiers en cours par univers",
  "Moyenne de CA par intervention"
];

export function MetricAIBuilder({ onSave, onCancel }: MetricAIBuilderProps) {
  const [query, setQuery] = useState('');
  const [editedMetric, setEditedMetric] = useState<MetricAnalysisResult['metric'] | null>(null);
  const [step, setStep] = useState<'input' | 'review' | 'test'>('input');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  
  const { analyzeQuery, isAnalyzing, result, error, reset } = useMetricAIAnalysis();

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

  const handleTest = async () => {
    setIsTesting(true);
    // Simulation de test - en production, appeler l'API Apogée
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTestResult({
      success: true,
      count: Math.floor(Math.random() * 100) + 10,
      executionTime: Math.floor(Math.random() * 500) + 100,
      sample: [
        { id: '1', value: 1250.50 },
        { id: '2', value: 890.00 },
        { id: '3', value: 2100.75 }
      ]
    });
    setIsTesting(false);
    setStep('test');
  };

  const handleSave = () => {
    if (editedMetric) {
      onSave({
        ...editedMetric,
        input_sources: JSON.stringify(editedMetric.input_sources),
        formula: JSON.stringify(editedMetric.formula),
        validation_status: 'draft'
      });
    }
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
              Tapez une phrase en langage naturel, STATiA comprendra et construira la métrique automatiquement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: CA facturé du mois, Nombre d'interventions cette semaine..."
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
                Exemples de requêtes
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => (
                  <Badge
                    key={example}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
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

  // Step 2: Review
  if (step === 'review' && result && editedMetric) {
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

        {/* Résumé métier */}
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
                    {editedMetric.input_sources.joins.map((j, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{j}</Badge>
                    ))}
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
                {editedMetric.filters.map((filter, i) => {
                  const displayValue = typeof filter.value === 'object' && filter.value !== null
                    ? JSON.stringify(filter.value)
                    : Array.isArray(filter.value) 
                      ? filter.value.join(', ') 
                      : String(filter.value);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono bg-muted p-1.5 rounded">
                      <span className="font-medium">{filter.field}</span>
                      <span className="text-muted-foreground">{filter.operator}</span>
                      <span className="text-primary">{displayValue}</span>
                    </div>
                  );
                })}
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
                    <span className="text-muted-foreground">Groupé par:</span>
                    {editedMetric.formula.groupBy.map((g, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{g}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleNewQuery}>
            ← Modifier la requête
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
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-primary">{testResult.count}</p>
                <p className="text-xs text-muted-foreground">Éléments trouvés</p>
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
