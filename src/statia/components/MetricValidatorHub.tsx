/**
 * StatIA - Hub de validation de toutes les métriques
 * Affiche TOUTES les métriques avec diagnostic complet et liens vers le code
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, 
  Code, Wrench, Database, FileCode, ChevronDown, ChevronRight,
  Hash, Percent, Euro, Clock, Layers, Building2, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { AgencySelector } from './StatiaBuilder/AgencySelector';
import { MetricWidgetColumn } from './MetricWidgetColumn';
import { STAT_DEFINITIONS, listStatDefinitions } from '../definitions';
import { getMetricForAgency } from '../api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '../adapters/dataServiceAdapter';
import { StatDefinition, StatCategory } from '../definitions/types';
import { startOfMonth, endOfMonth, startOfYear, subMonths, format } from 'date-fns';
import { useMetricValidations, useValidateMetric, useUnvalidateMetric } from '../hooks/useMetricValidations';

// Catégories ordonnées
const CATEGORY_ORDER: StatCategory[] = [
  'ca', 'technicien', 'univers', 'apporteur', 'devis', 
  'recouvrement', 'sav', 'dossiers', 'qualite', 'productivite', 'complexite', 'reseau'
];

const CATEGORY_LABELS: Record<string, string> = {
  ca: 'Chiffre d\'Affaires',
  devis: 'Devis',
  univers: 'Univers',
  apporteur: 'Apporteurs',
  technicien: 'Techniciens',
  sav: 'SAV',
  recouvrement: 'Recouvrement',
  dossiers: 'Dossiers',
  qualite: 'Qualité',
  productivite: 'Productivité',
  complexite: 'Complexité',
  reseau: 'Réseau',
};

// Mapping fichier source par catégorie
const CATEGORY_SOURCE_FILE: Record<string, string> = {
  ca: 'src/statia/definitions/ca.ts',
  devis: 'src/statia/definitions/devis.ts',
  univers: 'src/statia/definitions/univers.ts',
  apporteur: 'src/statia/definitions/apporteurs.ts',
  technicien: 'src/statia/definitions/techniciens.ts',
  sav: 'src/statia/definitions/sav.ts',
  recouvrement: 'src/statia/definitions/recouvrement.ts',
  dossiers: 'src/statia/definitions/dossiers.ts',
  qualite: 'src/statia/definitions/qualite.ts',
  productivite: 'src/statia/definitions/productivite.ts',
  complexite: 'src/statia/definitions/complexite.ts',
  reseau: 'src/statia/definitions/reseau.ts',
};

type PeriodType = 'current_month' | 'last_month' | 'ytd' | 'last_12_months';
type MetricStatus = 'ok' | 'zero' | 'error' | 'complex';

interface MetricResult {
  value: any;
  error?: string;
  breakdown?: Record<string, any>;
  metadata?: {
    recordCount?: number;
    source?: string;
    computedAt?: Date;
  };
}

interface DiagnosticInfo {
  sources: { name: string; count: number }[];
  joinStatus: 'ok' | 'warning' | 'error';
  joinDetails: string;
  filterStatus: 'ok' | 'warning' | 'error';
  filterDetails: string;
  suggestions: string[];
}

function getValueStatus(value: any): MetricStatus {
  if (value === null || value === undefined) return 'error';
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return 'zero';
    const allZero = entries.every(([, v]) => Number(v) === 0 || (typeof v === 'object' && Object.values(v as object).every(x => Number(x) === 0)));
    if (allZero) return 'zero';
    return 'complex';
  }
  const num = Number(value);
  if (isNaN(num)) return 'error';
  if (num === 0) return 'zero';
  return 'ok';
}

function formatValue(value: any, unit?: string): string {
  if (value === null || value === undefined) return '–';
  
  if (typeof value === 'object') {
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
  
  if (unit === '%') return `${num.toFixed(1)}%`;
  if (unit === 'jours' || unit === 'h') return `${num.toFixed(1)} ${unit}`;
  
  return new Intl.NumberFormat('fr-FR').format(num);
}

// Diagnostic automatique d'une métrique
function generateDiagnostic(def: StatDefinition, result: MetricResult | undefined): DiagnosticInfo {
  const sources: { name: string; count: number }[] = [];
  const defSources = Array.isArray(def.source) ? def.source : [def.source];
  
  // Simuler les sources (dans un vrai cas on utiliserait les metadata)
  defSources.forEach(src => {
    sources.push({ name: src, count: result?.metadata?.recordCount || -1 });
  });
  
  const status = getValueStatus(result?.value);
  const suggestions: string[] = [];
  
  // Jointure status
  let joinStatus: 'ok' | 'warning' | 'error' = 'ok';
  let joinDetails = 'Jointures correctes';
  
  if (defSources.length > 1) {
    if (status === 'zero' || status === 'error') {
      joinStatus = 'warning';
      joinDetails = 'Vérifier les jointures entre sources';
      suggestions.push(`Vérifier projectById.get(invoice.projectId) retourne des résultats`);
    }
  }
  
  // Filter status
  let filterStatus: 'ok' | 'warning' | 'error' = 'ok';
  let filterDetails = 'Filtres appliqués correctement';
  
  if (status === 'zero') {
    filterStatus = 'warning';
    filterDetails = 'Aucun résultat après filtrage';
    
    if (defSources.includes('factures')) {
      suggestions.push('Vérifier dateReelle/date dans la période');
      suggestions.push('Vérifier paymentStatus inclut les états attendus');
    }
    if (defSources.includes('interventions')) {
      suggestions.push('Vérifier les types productifs (depannage, travaux)');
      suggestions.push('Vérifier isValidated === true');
    }
    if (def.dimensions?.includes('univers')) {
      suggestions.push('Vérifier normalizeUnivers appliqué avant agrégation');
      suggestions.push('Comparer clés caByUniverse vs UNIVERS_KEYS');
    }
  }
  
  if (status === 'error') {
    filterStatus = 'error';
    filterDetails = result?.error || 'Erreur inconnue';
    suggestions.push('Consulter les logs console pour plus de détails');
  }
  
  return { sources, joinStatus, joinDetails, filterStatus, filterDetails, suggestions };
}

// Composant de ligne de métrique
interface MetricRowProps {
  definition: StatDefinition;
  result: MetricResult | undefined;
  isLoading: boolean;
  isValidated: boolean;
  onValidate: () => void;
  onUnvalidate: () => void;
  onOpenDiagnostic: () => void;
}

function MetricRow({ definition, result, isLoading, isValidated, onValidate, onUnvalidate, onOpenDiagnostic }: MetricRowProps) {
  const status = result?.error ? 'error' : getValueStatus(result?.value);
  const sourceFile = CATEGORY_SOURCE_FILE[definition.category] || 'src/statia/definitions/';
  
  return (
    <div className={cn(
      "grid grid-cols-12 gap-2 p-3 rounded-lg border transition-colors items-center",
      isValidated && "ring-1 ring-green-500/50 bg-green-50/30 dark:bg-green-950/10",
      status === 'ok' && !isValidated && "bg-background hover:bg-muted/50",
      status === 'zero' && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
      status === 'error' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
      status === 'complex' && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
    )}>
      {/* Status icon */}
      <div className="col-span-1 flex justify-center">
        {status === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {status === 'zero' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        {status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
        {status === 'complex' && <Layers className="h-4 w-4 text-blue-500" />}
      </div>
      
      {/* ID + Label */}
      <div className="col-span-3">
        <div className="font-mono text-xs text-muted-foreground truncate">{definition.id}</div>
        <div className="text-sm font-medium truncate">{definition.label}</div>
      </div>
      
      {/* Value */}
      <div className="col-span-2">
        {isLoading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <div className={cn(
            "font-semibold",
            status === 'zero' && "text-amber-600 dark:text-amber-400",
            status === 'error' && "text-red-600 dark:text-red-400",
            status === 'complex' && "text-blue-600 dark:text-blue-400"
          )}>
            {result?.error ? 'Erreur' : formatValue(result?.value, definition.unit)}
          </div>
        )}
      </div>
      
      {/* Sources */}
      <div className="col-span-1 text-xs text-muted-foreground truncate">
        {Array.isArray(definition.source) 
          ? definition.source.join(', ') 
          : definition.source}
      </div>
      
      {/* Actions */}
      <div className="col-span-2 flex items-center gap-1">
        {isValidated ? (
          <Button variant="ghost" size="sm" onClick={onUnvalidate} className="h-7 px-2">
            <XCircle className="h-3 w-3 mr-1 text-red-500" />
            Dévalider
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onValidate} className="h-7 px-2">
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
            Valider
          </Button>
        )}
        
        {(status === 'zero' || status === 'error') && (
          <Button variant="ghost" size="sm" onClick={onOpenDiagnostic} className="h-7 px-2 text-amber-600">
            <Wrench className="h-3 w-3 mr-1" />
            Fix
          </Button>
        )}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
              <a 
                href={`vscode://file/${sourceFile}`} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(sourceFile);
                  toast.success(`Chemin copié: ${sourceFile}`);
                }}
              >
                <Code className="h-3 w-3" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copier le chemin du fichier source</TooltipContent>
        </Tooltip>
      </div>
      
      {/* Widget - dernière colonne */}
      <div className="col-span-3">
        <MetricWidgetColumn 
          definition={definition} 
          value={result?.value} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}

// Dialog de diagnostic
interface DiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: StatDefinition | null;
  result: MetricResult | undefined;
}

function DiagnosticDialog({ open, onOpenChange, definition, result }: DiagnosticDialogProps) {
  if (!definition) return null;
  
  const diagnostic = generateDiagnostic(definition, result);
  const sourceFile = CATEGORY_SOURCE_FILE[definition.category] || 'src/statia/definitions/';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-500" />
            Diagnostic: {definition.label}
          </DialogTitle>
          <DialogDescription>
            <code className="font-mono text-xs">{definition.id}</code>
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Valeur actuelle */}
            <div className="p-4 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Valeur actuelle:</span>
              <div className={cn(
                "text-xl font-bold",
                getValueStatus(result?.value) === 'zero' && "text-amber-600",
                getValueStatus(result?.value) === 'error' && "text-red-600"
              )}>
                {result?.error ? `Erreur: ${result.error}` : formatValue(result?.value, definition.unit)}
              </div>
            </div>
            
            {/* Sources */}
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Database className="h-4 w-4" />
                Sources de données
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {diagnostic.sources.map(src => (
                  <div key={src.name} className="p-2 bg-muted/50 rounded flex justify-between items-center">
                    <Badge variant="outline">{src.name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {src.count >= 0 ? `${src.count} records` : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Jointures */}
            <div className={cn(
              "p-3 rounded-lg",
              diagnostic.joinStatus === 'ok' && "bg-green-50 dark:bg-green-950/20",
              diagnostic.joinStatus === 'warning' && "bg-amber-50 dark:bg-amber-950/20",
              diagnostic.joinStatus === 'error' && "bg-red-50 dark:bg-red-950/20",
            )}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {diagnostic.joinStatus === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {diagnostic.joinStatus === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {diagnostic.joinStatus === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                Jointures
              </div>
              <p className="text-sm text-muted-foreground">{diagnostic.joinDetails}</p>
            </div>
            
            {/* Filtres */}
            <div className={cn(
              "p-3 rounded-lg",
              diagnostic.filterStatus === 'ok' && "bg-green-50 dark:bg-green-950/20",
              diagnostic.filterStatus === 'warning' && "bg-amber-50 dark:bg-amber-950/20",
              diagnostic.filterStatus === 'error' && "bg-red-50 dark:bg-red-950/20",
            )}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {diagnostic.filterStatus === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {diagnostic.filterStatus === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {diagnostic.filterStatus === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                Filtres
              </div>
              <p className="text-sm text-muted-foreground">{diagnostic.filterDetails}</p>
            </div>
            
            {/* Suggestions */}
            {diagnostic.suggestions.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                  💡 Suggestions de correction
                </h4>
                <ul className="space-y-1 text-sm">
                  {diagnostic.suggestions.map((sug, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Fichier source */}
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <FileCode className="h-4 w-4" />
                Fichier source
              </h4>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background p-2 rounded flex-1 font-mono">
                  {sourceFile}
                </code>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(sourceFile);
                    toast.success('Chemin copié !');
                  }}
                >
                  Copier
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Chercher la fonction <code className="bg-background px-1 rounded">{definition.id}</code> pour modifier le calcul
              </p>
            </div>
            
            {/* Breakdown si complex */}
            {typeof result?.value === 'object' && result?.value !== null && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    Voir le breakdown complet
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
                    {JSON.stringify(result.value, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Composant principal
interface MetricValidatorHubProps {
  mode: 'admin' | 'agency';
  fixedAgencySlug?: string;
}

export function MetricValidatorHub({ mode, fixedAgencySlug }: MetricValidatorHubProps) {
  const [selectedAgency, setSelectedAgency] = useState(fixedAgencySlug || 'dax');
  const [period, setPeriod] = useState<PeriodType>('current_month');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [diagnosticDialog, setDiagnosticDialog] = useState<{ open: boolean; definition: StatDefinition | null }>({ open: false, definition: null });
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'zero' | 'error'>('all');
  
  const services = getGlobalApogeeDataServices();
  
  // Validations
  const { data: metricsValidations = {} } = useMetricValidations();
  const validateMutation = useValidateMetric();
  const unvalidateMutation = useUnvalidateMetric();
  
  // Date range
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'current_month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month': const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) };
      case 'ytd': return { start: startOfYear(now), end: now };
      case 'last_12_months': return { start: subMonths(now, 12), end: now };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period]);
  
  // Toutes les définitions
  const allDefinitions = useMemo(() => listStatDefinitions(), []);
  
  // Grouper par catégorie
  const metricsByCategory = useMemo(() => {
    const grouped: Record<string, StatDefinition[]> = {};
    for (const def of allDefinitions) {
      if (!grouped[def.category]) grouped[def.category] = [];
      grouped[def.category].push(def);
    }
    return grouped;
  }, [allDefinitions]);
  
  // Catégories ordonnées
  const orderedCategories = useMemo(() => {
    const cats = Object.keys(metricsByCategory) as StatCategory[];
    return CATEGORY_ORDER.filter(c => cats.includes(c)).concat(cats.filter(c => !CATEGORY_ORDER.includes(c)));
  }, [metricsByCategory]);
  
  // Charger toutes les métriques
  const { data: results, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['validator-all-metrics', selectedAgency, period],
    queryFn: async () => {
      if (!services) return {};
      
      const resultsMap: Record<string, MetricResult> = {};
      const batchSize = 10;
      
      for (let i = 0; i < allDefinitions.length; i += batchSize) {
        const batch = allDefinitions.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(def => getMetricForAgency(def.id, selectedAgency, { dateRange }, services))
        );
        
        batch.forEach((def, idx) => {
          const result = batchResults[idx];
          if (result.status === 'fulfilled') {
            resultsMap[def.id] = { 
              value: result.value.value,
              breakdown: result.value.breakdown,
              metadata: result.value.metadata as any
            };
          } else {
            resultsMap[def.id] = { value: null, error: result.reason?.message || 'Erreur' };
          }
        });
      }
      
      return resultsMap;
    },
    enabled: !!services,
    staleTime: 5 * 60 * 1000,
  });
  
  // Stats
  const stats = useMemo(() => {
    if (!results) return { total: allDefinitions.length, ok: 0, zero: 0, error: 0, validated: 0 };
    
    let ok = 0, zero = 0, error = 0;
    for (const def of allDefinitions) {
      const r = results[def.id];
      const status = r?.error ? 'error' : getValueStatus(r?.value);
      if (status === 'ok' || status === 'complex') ok++;
      else if (status === 'zero') zero++;
      else error++;
    }
    
    const validated = allDefinitions.filter(d => metricsValidations[d.id]?.validated).length;
    
    return { total: allDefinitions.length, ok, zero, error, validated };
  }, [results, allDefinitions, metricsValidations]);
  
  // Filtrer les métriques selon le status
  const getFilteredMetrics = (metrics: StatDefinition[]) => {
    if (filterStatus === 'all') return metrics;
    
    return metrics.filter(def => {
      const r = results?.[def.id];
      const status = r?.error ? 'error' : getValueStatus(r?.value);
      if (filterStatus === 'ok') return status === 'ok' || status === 'complex';
      if (filterStatus === 'zero') return status === 'zero';
      if (filterStatus === 'error') return status === 'error';
      return true;
    });
  };
  
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {mode === 'admin' && (
              <AgencySelector value={selectedAgency} onChange={setSelectedAgency} />
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
            
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes ({stats.total})</SelectItem>
                <SelectItem value="ok">✓ OK ({stats.ok})</SelectItem>
                <SelectItem value="zero">⚠ Zéro ({stats.zero})</SelectItem>
                <SelectItem value="error">✗ Erreur ({stats.error})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Badge variant="outline">{stats.total} métriques</Badge>
              <Badge variant="outline" className="text-green-600 border-green-300">{stats.validated} validées</Badge>
              <Badge variant="outline" className="text-green-600 border-green-300">{stats.ok} OK</Badge>
              <Badge variant="outline" className="text-amber-600 border-amber-300">{stats.zero} à zéro</Badge>
              {stats.error > 0 && (
                <Badge variant="destructive">{stats.error} erreurs</Badge>
              )}
            </div>
            
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} />
              Rafraîchir
            </Button>
          </div>
        </div>
        
        {/* Liste par catégorie */}
        <div className="space-y-3">
          {orderedCategories.map(category => {
            const metrics = getFilteredMetrics(metricsByCategory[category] || []);
            if (metrics.length === 0) return null;
            
            const isExpanded = expandedCategories.has(category);
            const catLabel = CATEGORY_LABELS[category] || category;
            const catMetrics = metricsByCategory[category] || [];
            const catValidated = catMetrics.filter(d => metricsValidations[d.id]?.validated).length;
            const catZero = catMetrics.filter(d => {
              const r = results?.[d.id];
              return getValueStatus(r?.value) === 'zero';
            }).length;
            
            return (
              <Card key={category}>
                <CardHeader 
                  className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {catLabel}
                      <Badge variant="outline" className="text-xs">{catMetrics.length}</Badge>
                    </div>
                    <div className="flex gap-2">
                      {catValidated > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                          {catValidated} validées
                        </Badge>
                      )}
                      {catZero > 0 && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                          {catZero} à zéro
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    {/* En-tête de colonne */}
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium mb-2 px-3">
                      <div className="col-span-1">Status</div>
                      <div className="col-span-3">ID / Label</div>
                      <div className="col-span-2">Valeur</div>
                      <div className="col-span-1">Sources</div>
                      <div className="col-span-2">Actions</div>
                      <div className="col-span-3 text-right">Widget</div>
                    </div>
                    
                    <div className="space-y-1">
                      {metrics.map(def => (
                        <MetricRow
                          key={def.id}
                          definition={def}
                          result={results?.[def.id]}
                          isLoading={isLoading}
                          isValidated={!!metricsValidations[def.id]?.validated}
                          onValidate={() => validateMutation.mutate(def.id)}
                          onUnvalidate={() => unvalidateMutation.mutate(def.id)}
                          onOpenDiagnostic={() => setDiagnosticDialog({ open: true, definition: def })}
                        />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
        
        {/* Dialog diagnostic */}
        <DiagnosticDialog
          open={diagnosticDialog.open}
          onOpenChange={(open) => setDiagnosticDialog({ ...diagnosticDialog, open })}
          definition={diagnosticDialog.definition}
          result={diagnosticDialog.definition ? results?.[diagnosticDialog.definition.id] : undefined}
        />
      </div>
    </TooltipProvider>
  );
}

export default MetricValidatorHub;
