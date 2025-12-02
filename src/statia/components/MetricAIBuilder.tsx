/**
 * STATiA-BY-BIJ - Builder de métriques IA-first V2
 * Interface simplifiée: une seule entrée en langage naturel
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Check, AlertCircle, Lightbulb, RefreshCw, Save, Play, Database, Filter, Calculator, Layers, BarChart3, PieChart, LineChart, Table2, ArrowRight, Zap } from 'lucide-react';
import { useMetricAIAnalysis, MetricAnalysisResult } from '../hooks/useMetricAIAnalysis';
import { cn } from '@/lib/utils';

interface MetricAIBuilderProps {
  onSave: (metric: any) => void;
  onCancel: () => void;
  initialMetric?: any;
}

// Exemples couvrant tous les cas métier de référence
const EXAMPLE_QUERIES = [
  // Comptages simples
  { query: "Nombre de devis validés sur la période", category: "Comptages" },
  { query: "Nombre de RDV RT sur la période", category: "Comptages" },
  { query: "Nombre de dossiers ouverts ce mois", category: "Comptages" },
  // Comptages avec 1 dimension
  { query: "Nombre de devis validés PAR apporteur", category: "Par dimension" },
  { query: "Nombre de RDV RT PAR technicien", category: "Par dimension" },
  { query: "Nombre de dossiers PAR univers", category: "Par dimension" },
  // Comptages multi-dimensions
  { query: "Nombre de RDV RT PAR apporteur PAR univers", category: "Multi-dimensions" },
  { query: "Nombre de devis PAR apporteur PAR mois", category: "Multi-dimensions" },
  // Ratios / Taux
  { query: "Taux de transformation devis en facture", category: "Ratios" },
  { query: "Taux de transformation PAR apporteur", category: "Ratios" },
  { query: "Part du SAV dans les interventions", category: "Ratios" },
  // CA
  { query: "CA total sur la période", category: "Chiffre d'affaires" },
  { query: "CA PAR technicien", category: "Chiffre d'affaires" },
  { query: "CA PAR apporteur PAR univers", category: "Chiffre d'affaires" },
  { query: "CA moyen par dossier", category: "Chiffre d'affaires" },
  // Durées
  { query: "Durée moyenne d'intervention PAR univers", category: "Durées" },
];

// Icône selon le type de graphique recommandé
const ChartIcon = ({ type }: { type?: string }) => {
  switch (type) {
    case 'bar': return <BarChart3 className="h-4 w-4" />;
    case 'pie': return <PieChart className="h-4 w-4" />;
    case 'line': return <LineChart className="h-4 w-4" />;
    default: return <Table2 className="h-4 w-4" />;
  }
};

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
      output_format: initialMetric.output_format || { type: 'number' },
      description_agence: initialMetric.description_agence,
      description_franchiseur: initialMetric.description_franchiseur,
    } : null
  );
  const [step, setStep] = useState<'input' | 'review'>(initialMetric ? 'review' : 'input');
  
  const { analyzeQuery, isAnalyzing, result, reset } = useMetricAIAnalysis();

  const handleAnalyze = async () => {
    if (!query.trim()) return;
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

  const formatFilterValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const hasDimensions = editedMetric?.dimensions && editedMetric.dimensions.length > 0;
  const isRatio = editedMetric?.formula?.type === 'ratio';

  // ============ ÉTAPE 1: SAISIE EN LANGAGE NATUREL ============
  if (step === 'input') {
    const groupedExamples = EXAMPLE_QUERIES.reduce((acc, ex) => {
      if (!acc[ex.category]) acc[ex.category] = [];
      acc[ex.category].push(ex.query);
      return acc;
    }, {} as Record<string, string[]>);

    return (
      <div className="flex flex-col h-full max-h-[70vh]">
        {/* Barre de saisie IA principale */}
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/2 to-transparent flex-shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Décrivez votre métrique</CardTitle>
                <CardDescription className="text-sm">
                  Tapez en français. Utilisez <span className="font-semibold text-primary">"PAR"</span> pour analyser par dimension
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Taux de transformation devis en facture PAR apporteur PAR mois"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && query.trim() && handleAnalyze()}
                className="flex-1 text-base h-12 bg-background"
                autoFocus
              />
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !query.trim()}
                className="h-12 px-6 min-w-[140px]"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Générer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Résultat si non compris */}
        {result && !result.understood && (
          <Card className="border-amber-200 bg-amber-50/50 mt-4 flex-shrink-0">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-5 w-5" />
                <CardTitle className="text-base">Besoin de précisions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-800 mb-3">{result.businessSummary}</p>
              {result.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.suggestions.slice(0, 5).map((suggestion, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer border-amber-300 hover:bg-amber-100 text-xs"
                      onClick={() => handleExampleClick(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Exemples par catégorie */}
        <div className="flex-1 overflow-hidden mt-4">
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            <span>Exemples de requêtes par catégorie</span>
          </div>
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
              {Object.entries(groupedExamples).map(([category, queries]) => (
                <Card key={category} className="bg-muted/30">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3 space-y-1">
                    {queries.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleExampleClick(q)}
                        className={cn(
                          "w-full text-left text-xs py-1.5 px-2 rounded hover:bg-primary/10 transition-colors",
                          q.includes('PAR') && "font-medium"
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t mt-4 flex-shrink-0">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  // ============ ÉTAPE 2: REVUE ET AJUSTEMENTS ============
  if (step === 'review' && editedMetric) {
    return (
      <div className="flex flex-col h-full max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <span className="font-medium">Métrique générée</span>
            {result?.confidence && (
              <Badge variant="outline" className="text-xs">
                {Math.round(result.confidence * 100)}% confiance
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleNewQuery}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Nouvelle requête
          </Button>
        </div>

        {/* Résumé visuel */}
        {result && (
          <Card className="mt-4 border-green-200 bg-green-50/30 flex-shrink-0">
            <CardContent className="py-3">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">{result.businessSummary}</p>
                  <p className="text-xs text-green-600 mt-1 font-mono bg-green-100/50 p-1.5 rounded">
                    {result.technicalSummary}
                  </p>
                </div>
                {editedMetric.output_format?.chart_type && (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ChartIcon type={editedMetric.output_format.chart_type} />
                    <span className="text-xs capitalize">{editedMetric.output_format.chart_type}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contenu scrollable */}
        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-4 pr-4">
            {/* Métadonnées + Source côte à côte */}
            <div className="grid grid-cols-2 gap-4">
              {/* Métadonnées */}
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Database className="h-3 w-3" />
                    MÉTADONNÉES
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3 space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">ID</Label>
                    <Input
                      value={editedMetric.id}
                      onChange={(e) => setEditedMetric({ ...editedMetric, id: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Libellé</Label>
                    <Input
                      value={editedMetric.label}
                      onChange={(e) => setEditedMetric({ ...editedMetric, label: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Scope</Label>
                    <Select
                      value={editedMetric.scope}
                      onValueChange={(v) => setEditedMetric({ ...editedMetric, scope: v as any })}
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

              {/* Sources et Jointures */}
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Database className="h-3 w-3" />
                    SOURCES DE DONNÉES
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary">{editedMetric.input_sources.primary}</Badge>
                      {editedMetric.input_sources.secondary?.length > 0 && (
                        <>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          {editedMetric.input_sources.secondary.map((s: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </>
                      )}
                    </div>
                    {editedMetric.input_sources.joins?.length > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <span className="font-medium">Jointures: </span>
                        {editedMetric.input_sources.joins.map((j: any, i: number) => (
                          <span key={i}>
                            {j.from}→{j.to}
                            {i < editedMetric.input_sources.joins.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Formule */}
            <Card className={cn(isRatio && "border-orange-200 bg-orange-50/30")}>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Calculator className="h-3 w-3" />
                  FORMULE
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn(
                    "text-sm uppercase",
                    editedMetric.formula.type === 'count' && "bg-blue-500",
                    editedMetric.formula.type === 'sum' && "bg-green-500",
                    editedMetric.formula.type === 'avg' && "bg-purple-500",
                    editedMetric.formula.type === 'ratio' && "bg-orange-500",
                    editedMetric.formula.type === 'distinct_count' && "bg-indigo-500"
                  )}>
                    {editedMetric.formula.type}
                    {editedMetric.formula.field && `(${editedMetric.formula.field})`}
                  </Badge>
                  
                  {editedMetric.formula.unit && (
                    <Badge variant="outline" className="text-xs">{editedMetric.formula.unit}</Badge>
                  )}
                  
                  {editedMetric.formula.groupBy?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">GROUP BY:</span>
                      {editedMetric.formula.groupBy.map((g: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs bg-purple-50">{g}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {isRatio && editedMetric.formula.numerator && editedMetric.formula.denominator && (
                  <div className="mt-2 text-xs font-mono bg-orange-100/50 p-2 rounded space-y-1">
                    <div><span className="text-orange-700">Numérateur:</span> {editedMetric.formula.numerator.type}({editedMetric.formula.numerator.field || '*'})</div>
                    <div><span className="text-orange-700">Dénominateur:</span> {editedMetric.formula.denominator.type}({editedMetric.formula.denominator.field || '*'})</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Filtres */}
            {editedMetric.filters?.length > 0 && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Filter className="h-3 w-3" />
                    FILTRES ({editedMetric.filters.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="flex flex-wrap gap-1">
                    {editedMetric.filters.map((filter: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs font-mono">
                        {filter.field} {filter.operator} {formatFilterValue(filter.value)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dimensions */}
            {hasDimensions && (
              <Card className="border-2 border-purple-200 bg-purple-50/30">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1 text-purple-700">
                    <Layers className="h-3 w-3" />
                    DIMENSIONS ({editedMetric.dimensions?.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="flex flex-wrap gap-2">
                    {editedMetric.dimensions?.map((dim: any, i: number) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded text-sm">
                        <span className="font-medium text-purple-800">{dim.label}</span>
                        <span className="text-purple-600 text-xs">({dim.source})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sortie recommandée */}
            {editedMetric.output_format && (
              <Card className="bg-muted/30">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
                    <ChartIcon type={editedMetric.output_format.chart_type} />
                    FORMAT DE SORTIE RECOMMANDÉ
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{editedMetric.output_format.type}</Badge>
                    {editedMetric.output_format.chart_type && (
                      <Badge variant="secondary" className="capitalize">{editedMetric.output_format.chart_type} chart</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer sticky avec actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-4 flex-shrink-0 bg-background">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleNewQuery}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Recommencer
            </Button>
            <Button onClick={handleSave} className="min-w-[120px]">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
