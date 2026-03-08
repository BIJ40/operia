/**
 * StatIA Builder - Composant principal
 * Interface drag & drop pour construire des requêtes statistiques
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Download, 
  Save, 
  Trash2, 
  Info,
  Layers,
  BarChart3,
  Filter,
  Calendar
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';

import { CapsulePanel } from './CapsulePanel';
import { DropZone } from './DropZone';
import { ResultPreview } from './ResultPreview';
import { 
  DIMENSIONS, 
  MEASURES, 
  FILTERS,
  BuilderQuery,
  DimensionType,
  getMeasuresByCategory 
} from './config';

interface StatiaBuilderProps {
  agencySlug?: string;
  onSaveQuery?: (query: BuilderQuery) => void;
}

export function StatiaBuilder({ agencySlug = 'dax', onSaveQuery }: StatiaBuilderProps) {
  // État de la requête
  const [query, setQuery] = useState<BuilderQuery>({
    measures: [],
    filters: {},
    dateRange: {
      start: startOfYear(new Date()),
      end: endOfYear(new Date()),
    },
    agencySlug,
  });
  
  // État du résultat
  const [isComputing, setIsComputing] = useState(false);
  interface BuilderResult {
    query: BuilderQuery;
    computedAt: Date;
    values: Record<string, { label: string; value: number; unit?: string }>;
  }
  const [result, setResult] = useState<BuilderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Handlers drag & drop
  const handleDimensionDrop = useCallback((dimensionId: DimensionType) => {
    setQuery(prev => ({
      ...prev,
      dimension: dimensionId,
    }));
    setResult(null);
  }, []);
  
  const handleMeasureDrop = useCallback((measureId: string) => {
    setQuery(prev => {
      if (prev.measures.includes(measureId)) return prev;
      return {
        ...prev,
        measures: [...prev.measures, measureId],
      };
    });
    setResult(null);
  }, []);
  
  const handleRemoveMeasure = useCallback((measureId: string) => {
    setQuery(prev => ({
      ...prev,
      measures: prev.measures.filter(m => m !== measureId),
    }));
    setResult(null);
  }, []);
  
  const handleRemoveDimension = useCallback(() => {
    setQuery(prev => ({
      ...prev,
      dimension: undefined,
    }));
    setResult(null);
  }, []);
  
  const handleClearAll = useCallback(() => {
    setQuery({
      measures: [],
      filters: {},
      dateRange: {
        start: startOfYear(new Date()),
        end: endOfYear(new Date()),
      },
      agencySlug,
    });
    setResult(null);
    setError(null);
  }, [agencySlug]);
  
  // Période rapide
  const handleQuickPeriod = useCallback((period: 'month' | 'year') => {
    const now = new Date();
    setQuery(prev => ({
      ...prev,
      dateRange: period === 'month' 
        ? { start: startOfMonth(now), end: endOfMonth(now) }
        : { start: startOfYear(now), end: endOfYear(now) },
    }));
    setResult(null);
  }, []);
  
  // Calcul
  const handleCompute = useCallback(async () => {
    if (query.measures.length === 0) {
      setError('Veuillez sélectionner au moins une mesure');
      return;
    }
    
    setIsComputing(true);
    setError(null);
    
    try {
      // Simulation pour le moment - à remplacer par l'appel réel à StatIA
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Résultat simulé
      const mockResult: BuilderResult = {
        query,
        computedAt: new Date(),
        values: {},
      };
      
      for (const measureId of query.measures) {
        const measure = MEASURES.find(m => m.id === measureId);
        if (measure) {
          // Valeur simulée
          mockResult.values[measureId] = {
            label: measure.label,
            value: Math.round(Math.random() * 100000),
            unit: measure.unit,
          };
        }
      }
      
      setResult(mockResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de calcul');
    } finally {
      setIsComputing(false);
    }
  }, [query]);
  
  // Export JSON
  const handleExportJSON = useCallback(() => {
    const exportData = {
      query,
      result,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statia-query-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [query, result]);
  
  // Save
  const handleSave = useCallback(() => {
    if (onSaveQuery) {
      onSaveQuery(query);
    }
  }, [query, onSaveQuery]);
  
  const measuresByCategory = getMeasuresByCategory();
  const selectedDimension = query.dimension ? DIMENSIONS.find(d => d.id === query.dimension) : null;
  const selectedMeasures = query.measures.map(id => MEASURES.find(m => m.id === id)).filter(Boolean);
  
  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">StatIA Builder</h2>
          <p className="text-sm text-muted-foreground">
            Glissez-déposez pour construire vos statistiques
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            {format(query.dateRange.start, 'dd MMM', { locale: fr })} - {format(query.dateRange.end, 'dd MMM yyyy', { locale: fr })}
          </Badge>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleQuickPeriod('month')}>
              Mois
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleQuickPeriod('year')}>
              Année
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Panneau gauche - Capsules */}
        <div className="w-72 border-r bg-muted/30">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Dimensions */}
              <CapsulePanel
                title="Dimensions"
                icon={<Layers className="h-4 w-4" />}
                items={DIMENSIONS}
                type="dimension"
                onDragStart={() => {}}
              />
              
              <Separator />
              
              {/* Mesures par catégorie */}
              {Object.entries(measuresByCategory).map(([category, measures]) => (
                <CapsulePanel
                  key={category}
                  title={category}
                  icon={<BarChart3 className="h-4 w-4" />}
                  items={measures}
                  type="measure"
                  onDragStart={() => {}}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Zone centrale - Drop Zone */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            <DropZone
              selectedDimension={selectedDimension}
              selectedMeasures={selectedMeasures as any}
              onDimensionDrop={handleDimensionDrop}
              onMeasureDrop={handleMeasureDrop}
              onRemoveDimension={handleRemoveDimension}
              onRemoveMeasure={handleRemoveMeasure}
            />
          </div>
          
          {/* Actions */}
          <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleClearAll}
                disabled={query.measures.length === 0 && !query.dimension}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Effacer
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportJSON}
                disabled={!result}
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              {onSaveQuery && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSave}
                  disabled={query.measures.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              )}
              <Button 
                onClick={handleCompute}
                disabled={query.measures.length === 0 || isComputing}
              >
                <Play className="h-4 w-4 mr-2" />
                {isComputing ? 'Calcul...' : 'Calculer'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Panneau droit - Résultats */}
        <div className="w-80 border-l bg-muted/30">
          <ResultPreview 
            result={result} 
            error={error}
            isLoading={isComputing}
          />
        </div>
      </div>
    </div>
  );
}
