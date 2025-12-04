/**
 * StatIA Builder - Liste des métriques sauvegardées
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Play, Globe, Building2 } from 'lucide-react';
import { useCustomMetrics, useDeleteCustomMetric } from '../../hooks/useCustomMetrics';
import { CustomMetric } from '../../services/customMetricsService';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsListProps {
  mode: 'admin' | 'agency';
  agencySlug?: string;
  onEdit?: (metric: CustomMetric) => void;
  onRun?: (metric: CustomMetric) => void;
}

export function MetricsList({ mode, agencySlug, onEdit, onRun }: MetricsListProps) {
  // Admin: voir toutes les métriques (global + agency)
  // Agency: voir global (readonly) + local à l'agence uniquement
  const { data: globalMetrics = [], isLoading: loadingGlobal } = useCustomMetrics('global');
  const { data: agencyMetrics = [], isLoading: loadingAgency } = useCustomMetrics('agency', agencySlug);
  
  const isLoading = loadingGlobal || loadingAgency;
  
  // Combiner les métriques selon le mode
  const metrics = mode === 'admin' 
    ? [...globalMetrics, ...agencyMetrics]
    : [...globalMetrics, ...agencyMetrics.filter(m => m.agency_slug === agencySlug)];
  const deleteMutation = useDeleteCustomMetric();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune métrique personnalisée
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {metrics.map((metric) => (
        <Card key={metric.id} className="hover:border-helpconfort-blue/30 transition-colors">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {metric.scope === 'global' ? (
                    <><Globe className="h-3 w-3 mr-1" /> Global</>
                  ) : (
                    <><Building2 className="h-3 w-3 mr-1" /> {metric.agency_slug}</>
                  )}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {metric.category}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {onRun && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRun(metric)}
                    className="h-7 w-7 p-0"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                {/* En mode agency, les métriques globales sont readonly */}
                {onEdit && !(mode === 'agency' && metric.scope === 'global') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(metric)}
                    className="h-7 w-7 p-0"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                )}
                {/* En mode agency, ne peut pas supprimer les métriques globales */}
                {!(mode === 'agency' && metric.scope === 'global') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(metric.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {metric.description && (
            <CardContent className="py-2 px-4 pt-0">
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
