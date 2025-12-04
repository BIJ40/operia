/**
 * StatIA Builder - Prévisualisation d'une métrique
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CustomMetricDefinition } from '../../services/customMetricsService';
import { useStatiaForAgency } from '../../hooks/useStatia';
import { cn } from '@/lib/utils';

interface MetricPreviewProps {
  definition: CustomMetricDefinition | null;
  agencySlug: string;
  measureLabel?: string;
}

export function MetricPreview({ definition, agencySlug, measureLabel }: MetricPreviewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [previewResult, setPreviewResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Date range: mois en cours
  const now = new Date();
  const dateRange = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };

  const handleRunPreview = async () => {
    if (!definition?.measure) {
      setError('Aucune mesure sélectionnée');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      // Simuler un appel API pour la prévisualisation
      // Dans une implémentation complète, on utiliserait getMetricForAgency
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Valeur simulée basée sur la mesure
      const simulatedValue = definition.measure.includes('taux') 
        ? Math.random() * 10 + 2 
        : Math.random() * 500000 + 100000;
      
      setPreviewResult(simulatedValue);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du calcul');
    } finally {
      setIsRunning(false);
    }
  };

  const formatValue = (value: number) => {
    if (definition?.measure?.includes('taux')) {
      return `${value.toFixed(2)} %`;
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Prévisualisation
          </span>
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            {format(dateRange.start, 'MMMM yyyy', { locale: fr })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info agence */}
        <div className="text-xs text-muted-foreground">
          Agence: <span className="font-medium text-foreground">{agencySlug}</span>
        </div>

        {/* Résultat ou placeholder */}
        <div className={cn(
          "p-6 rounded-lg border-2 text-center transition-colors",
          previewResult !== null 
            ? "bg-primary/5 border-primary/20" 
            : "bg-muted/30 border-dashed"
        )}>
          {isRunning ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Calcul en cours...</span>
            </div>
          ) : previewResult !== null ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold">{formatValue(previewResult)}</div>
              <div className="text-xs text-muted-foreground">{measureLabel || definition?.measure}</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {definition?.measure 
                ? 'Cliquez sur Exécuter pour voir le résultat'
                : 'Sélectionnez une mesure pour prévisualiser'
              }
            </div>
          )}
        </div>

        {/* Bouton exécuter */}
        <Button 
          className="w-full" 
          onClick={handleRunPreview}
          disabled={!definition?.measure || isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calcul...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Exécuter
            </>
          )}
        </Button>

        {/* Détails de la définition */}
        {definition?.measure && (
          <div className="pt-2 border-t space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">Configuration</div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sources:</span>
                <span>{definition.sources?.join(', ') || 'factures'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agrégation:</span>
                <span>{definition.aggregation || 'sum'}</span>
              </div>
              {definition.dimensions && definition.dimensions.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span>{definition.dimensions.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
