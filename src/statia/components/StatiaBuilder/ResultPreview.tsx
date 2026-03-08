/**
 * StatIA Builder - Prévisualisation des résultats
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ResultPreviewResult {
  computedAt: string;
  values: Record<string, { label: string; value: number | Record<string, number>; unit?: string }>;
  query?: { dimension?: string; measures: unknown[]; agencySlug?: string };
}

interface ResultPreviewProps {
  result: ResultPreviewResult | null;
  error: string | null;
  isLoading: boolean;
}

export function ResultPreview({ result, error, isLoading }: ResultPreviewProps) {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Calcul en cours...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Interrogation de StatIA
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-4" />
        <p className="text-sm font-medium text-destructive">Erreur</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Info className="h-8 w-8 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">Aucun résultat</p>
        <p className="text-xs text-muted-foreground mt-1">
          Sélectionnez des mesures et cliquez sur Calculer
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header résultat */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Résultats</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {format(new Date(result.computedAt), 'HH:mm:ss', { locale: fr })}
          </Badge>
        </div>

        {/* Valeurs */}
        <div className="space-y-3">
          {Object.entries(result.values).map(([key, data]) => (
            <Card key={key} className="overflow-hidden">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {typeof data.value === 'number' 
                      ? data.value.toLocaleString('fr-FR')
                      : JSON.stringify(data.value)
                    }
                  </span>
                  {data.unit && (
                    <span className="text-sm text-muted-foreground">{data.unit}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Métadonnées */}
        {result.query && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Requête</p>
            <div className="text-xs text-muted-foreground space-y-1">
              {result.query.dimension && (
                <p>Dimension: <span className="font-medium text-foreground">{result.query.dimension}</span></p>
              )}
              <p>Mesures: <span className="font-medium text-foreground">{result.query.measures.length}</span></p>
              <p>Agence: <span className="font-medium text-foreground">{result.query.agencySlug}</span></p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
