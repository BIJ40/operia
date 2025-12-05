/**
 * StatIA - Visualisation de toutes les métriques disponibles
 * Affiche les résultats groupés par catégorie avec descriptions au survol
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Euro, Percent, Clock, Calendar, Hash, User, Building2, Layers, 
  AlertTriangle, Wallet, FolderOpen, Shield, TrendingUp, FileCheck, Calculator,
  RefreshCw, Info, CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgencySelector } from './StatiaBuilder/AgencySelector';
import { STAT_DEFINITIONS, listStatDefinitions } from '../definitions';
import { getMetricForAgency } from '../api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '../adapters/dataServiceAdapter';
import { StatDefinition, StatCategory } from '../definitions/types';
import { startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Icônes par catégorie
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'ca': Euro,
  'devis': FileCheck,
  'univers': Layers,
  'apporteur': Building2,
  'technicien': User,
  'sav': AlertTriangle,
  'recouvrement': Wallet,
  'dossiers': FolderOpen,
  'qualite': Shield,
  'productivite': TrendingUp,
  'complexite': Calculator,
  'reseau': Building2,
};

// Labels lisibles par catégorie
const CATEGORY_LABELS: Record<string, string> = {
  'ca': 'Chiffre d\'Affaires',
  'devis': 'Devis',
  'univers': 'Univers',
  'apporteur': 'Apporteurs',
  'technicien': 'Techniciens',
  'sav': 'SAV',
  'recouvrement': 'Recouvrement',
  'dossiers': 'Dossiers',
  'qualite': 'Qualité',
  'productivite': 'Productivité',
  'complexite': 'Complexité',
  'reseau': 'Réseau',
};

// Ordre d'affichage des catégories
const CATEGORY_ORDER: StatCategory[] = [
  'ca', 'technicien', 'univers', 'apporteur', 'devis', 
  'recouvrement', 'sav', 'dossiers', 'qualite', 'productivite', 'complexite', 'reseau'
];

// Icônes par unité
const UNIT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '€': Euro,
  '%': Percent,
  'h': Clock,
  'jours': Calendar,
  '': Hash,
};

interface AllMetricsViewerProps {
  mode: 'admin' | 'agency';
  fixedAgencySlug?: string;
}

type PeriodType = 'current_month' | 'last_month' | 'ytd' | 'last_12_months';

export function AllMetricsViewer({ mode, fixedAgencySlug }: AllMetricsViewerProps) {
  const [selectedAgency, setSelectedAgency] = useState(fixedAgencySlug || 'dax');
  const [period, setPeriod] = useState<PeriodType>('current_month');
  const services = getGlobalApogeeDataServices();

  // Calculer la date range selon la période sélectionnée
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'ytd':
        return { start: startOfYear(now), end: now };
      case 'last_12_months':
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period]);

  // Grouper les métriques par catégorie
  const metricsByCategory = useMemo(() => {
    const definitions = listStatDefinitions();
    const grouped: Record<string, StatDefinition[]> = {};
    
    for (const def of definitions) {
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category].push(def);
    }
    
    return grouped;
  }, []);

  // Ordonner les catégories
  const orderedCategories = useMemo(() => {
    const categories = Object.keys(metricsByCategory) as StatCategory[];
    const ordered = CATEGORY_ORDER.filter(c => categories.includes(c));
    const remaining = categories.filter(c => !CATEGORY_ORDER.includes(c));
    return [...ordered, ...remaining];
  }, [metricsByCategory]);

  // Charger toutes les métriques
  const { data: results, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['all-metrics', selectedAgency, period],
    queryFn: async () => {
      if (!services) return {};
      
      const allDefinitions = listStatDefinitions();
      const resultsMap: Record<string, { value: any; error?: string }> = {};
      
      // Exécuter toutes les métriques en parallèle par batches de 10
      const batchSize = 10;
      for (let i = 0; i < allDefinitions.length; i += batchSize) {
        const batch = allDefinitions.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(def => 
            getMetricForAgency(def.id, selectedAgency, { dateRange }, services)
          )
        );
        
        batch.forEach((def, idx) => {
          const result = batchResults[idx];
          if (result.status === 'fulfilled') {
            resultsMap[def.id] = { value: result.value.value };
          } else {
            resultsMap[def.id] = { value: null, error: result.reason?.message || 'Erreur' };
          }
        });
      }
      
      return resultsMap;
    },
    enabled: !!services,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatValue = (value: any, unit?: string): string => {
    if (value === null || value === undefined) return '–';
    
    if (typeof value === 'object') {
      // Si c'est un objet (breakdown par dimension), afficher le nombre d'entrées
      const entries = Object.entries(value);
      if (entries.length === 0) return '0 entrées';
      return `${entries.length} valeurs`;
    }
    
    const num = Number(value);
    if (isNaN(num)) return String(value);
    
    if (unit === '€') {
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        maximumFractionDigits: 0 
      }).format(num);
    }
    
    if (unit === '%') {
      return `${num.toFixed(1)}%`;
    }
    
    if (unit === 'jours' || unit === 'h') {
      return `${num.toFixed(1)} ${unit}`;
    }
    
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const getValueStatus = (value: any): 'ok' | 'zero' | 'error' | 'complex' => {
    if (value === null || value === undefined) return 'error';
    if (typeof value === 'object') return 'complex';
    const num = Number(value);
    if (isNaN(num)) return 'error';
    if (num === 0) return 'zero';
    return 'ok';
  };

  const totalMetrics = listStatDefinitions().length;
  const loadedCount = results ? Object.keys(results).length : 0;
  const errorCount = results ? Object.values(results).filter(r => r.error).length : 0;
  const zeroCount = results ? Object.values(results).filter(r => getValueStatus(r.value) === 'zero').length : 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {mode === 'admin' ? (
              <AgencySelector value={selectedAgency} onChange={setSelectedAgency} />
            ) : (
              <Badge variant="outline">Agence: {selectedAgency}</Badge>
            )}
            
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mois en cours</SelectItem>
                <SelectItem value="last_month">Mois précédent</SelectItem>
                <SelectItem value="ytd">Année en cours</SelectItem>
                <SelectItem value="last_12_months">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{totalMetrics} métriques</Badge>
              {results && (
                <>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    {zeroCount} à zéro
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive">{errorCount} erreurs</Badge>
                  )}
                </>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} />
              Rafraîchir
            </Button>
          </div>
        </div>

        {/* Grille par catégorie */}
        <div className="space-y-6">
          {orderedCategories.map(category => {
            const metrics = metricsByCategory[category] || [];
            if (!metrics.length) return null;
            
            const CategoryIcon = CATEGORY_ICONS[category] || Calculator;
            const categoryLabel = CATEGORY_LABELS[category] || category;
            
            return (
              <Card key={category}>
                <CardHeader className="py-4 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CategoryIcon className="h-5 w-5 text-primary" />
                    {categoryLabel}
                    <Badge variant="outline" className="ml-2">
                      {metrics.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {metrics.map(def => {
                      const result = results?.[def.id];
                      const value = result?.value;
                      const error = result?.error;
                      const status = error ? 'error' : getValueStatus(value);
                      const UnitIcon = UNIT_ICONS[def.unit || ''] || Hash;
                      
                      return (
                        <Tooltip key={def.id}>
                          <TooltipTrigger asChild>
                            <div 
                              className={cn(
                                "p-3 rounded-lg border transition-colors cursor-help",
                                status === 'ok' && "bg-background hover:bg-muted/50",
                                status === 'zero' && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
                                status === 'error' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                                status === 'complex' && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <UnitIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-xs font-medium truncate">
                                      {def.label}
                                    </span>
                                  </div>
                                  
                                  {isLoading ? (
                                    <Skeleton className="h-6 w-24" />
                                  ) : (
                                    <div className={cn(
                                      "text-lg font-semibold",
                                      status === 'zero' && "text-amber-600 dark:text-amber-400",
                                      status === 'error' && "text-red-600 dark:text-red-400",
                                      status === 'complex' && "text-blue-600 dark:text-blue-400"
                                    )}>
                                      {error ? 'Erreur' : formatValue(value, def.unit)}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="shrink-0">
                                  {status === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                  {status === 'zero' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                  {status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                                  {status === 'complex' && <Info className="h-4 w-4 text-blue-500" />}
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{def.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {def.description || 'Aucune description'}
                              </p>
                              <div className="flex flex-wrap gap-1 pt-1">
                                <Badge variant="outline" className="text-[10px]">
                                  ID: {def.id}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">
                                  Source: {Array.isArray(def.source) ? def.source.join(', ') : def.source}
                                </Badge>
                                {def.unit && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Unité: {def.unit}
                                  </Badge>
                                )}
                              </div>
                              {error && (
                                <p className="text-xs text-red-500 pt-1">Erreur: {error}</p>
                              )}
                              {status === 'complex' && typeof value === 'object' && (
                                <div className="text-xs pt-1 max-h-32 overflow-auto">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(value, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
