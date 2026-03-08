/**
 * StatIA - Visualisation de toutes les métriques disponibles
 * Affiche les résultats groupés par catégorie avec descriptions au survol
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Euro, Percent, Clock, Calendar, Hash, User, Building2, Layers, 
  AlertTriangle, Wallet, FolderOpen, Shield, TrendingUp, FileCheck, Calculator,
  RefreshCw, Info, CheckCircle2, XCircle, MoreVertical, Trash2, Check, Lightbulb, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AgencySelector } from './StatiaBuilder/AgencySelector';
import { STAT_DEFINITIONS, listStatDefinitions } from '../definitions';
import { getMetricForAgency } from '../api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '../adapters/dataServiceAdapter';
import { StatDefinition, StatCategory } from '../definitions/types';
import { startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { MetricCalculationDetails } from './MetricCalculationDetails';
import { softDeleteCustomMetric } from '../services/customMetricsService';
import { 
  useMetricValidations, 
  useValidateMetric, 
  useUnvalidateMetric, 
  useHideMetric, 
  useRestoreMetric, 
  useSaveSuggestion,
  migrateFromLocalStorage,
  MetricStatus
} from '../hooks/useMetricValidations';
import { useAuthCore } from '@/contexts/AuthCoreContext';

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

// Vérifier si une métrique est custom (en base) ou core (dans le code)
function isCustomMetric(metricId: string): boolean {
  return !(metricId in STAT_DEFINITIONS);
}

// Types pour la double confirmation
type DeleteStep = 'confirm1' | 'confirm2';
interface DeleteDialog {
  open: boolean;
  metricId: string;
  metricLabel: string;
  isCustom: boolean;
  step: DeleteStep;
  confirmText: string;
}

export function AllMetricsViewer({ mode, fixedAgencySlug }: AllMetricsViewerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedAgency, setSelectedAgency] = useState(fixedAgencySlug || 'dax');
  const [period, setPeriod] = useState<PeriodType>('current_month');
  const [showHidden, setShowHidden] = useState(false);
  const [suggestionDialog, setSuggestionDialog] = useState<{ open: boolean; metricId: string; metricLabel: string } | null>(null);
  const [suggestionText, setSuggestionText] = useState('');
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; definition: StatDefinition; value: any } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);
  const services = getGlobalApogeeDataServices();

  // Charger les validations depuis la base de données
  const { data: metricsStatus = {}, isLoading: isLoadingValidations } = useMetricValidations();

  // Mutations pour les validations
  const validateMutation = useValidateMetric();
  const unvalidateMutation = useUnvalidateMetric();
  const hideMutation = useHideMetric();
  const restoreMutation = useRestoreMetric();
  const saveSuggestionMutation = useSaveSuggestion();

  // Mutation pour supprimer une métrique custom en base
  const deleteCustomMetricMutation = useMutation({
    mutationFn: (metricId: string) => softDeleteCustomMetric(metricId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-metrics'] });
      toast.success('Métrique supprimée définitivement de la base de données');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  // Migration depuis localStorage au premier chargement
  useEffect(() => {
    if (!migrationDone && user?.id) {
      migrateFromLocalStorage(user.id).then((migrated) => {
        if (migrated) {
          queryClient.invalidateQueries({ queryKey: ['statia-metric-validations'] });
          toast.success('Validations migrées depuis le stockage local');
        }
        setMigrationDone(true);
      });
    }
  }, [user?.id, migrationDone, queryClient]);

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
      // Filtrer les métriques cachées si showHidden est false
      if (!showHidden && metricsStatus[def.id]?.hidden) continue;
      
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category].push(def);
    }
    
    return grouped;
  }, [metricsStatus, showHidden]);

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

  // Actions sur les métriques
  const handleValidate = (metricId: string) => {
    validateMutation.mutate(metricId, {
      onSuccess: () => toast.success('Métrique validée'),
      onError: (err) => toast.error(`Erreur: ${err.message}`),
    });
  };

  const handleUnvalidate = (metricId: string) => {
    unvalidateMutation.mutate(metricId, {
      onSuccess: () => toast.success('Métrique marquée comme non validée'),
      onError: (err) => toast.error(`Erreur: ${err.message}`),
    });
  };

  const handleHide = (metricId: string) => {
    hideMutation.mutate(metricId, {
      onSuccess: () => toast.success('Métrique masquée'),
      onError: (err) => toast.error(`Erreur: ${err.message}`),
    });
  };

  const handleRestore = (metricId: string) => {
    restoreMutation.mutate(metricId, {
      onSuccess: () => toast.success('Métrique restaurée'),
      onError: (err) => toast.error(`Erreur: ${err.message}`),
    });
  };

  const handleOpenSuggestion = (metricId: string, metricLabel: string) => {
    const existingSuggestion = metricsStatus[metricId]?.suggestion || '';
    setSuggestionText(existingSuggestion);
    setSuggestionDialog({ open: true, metricId, metricLabel });
  };

  const handleSaveSuggestion = () => {
    if (!suggestionDialog) return;
    
    saveSuggestionMutation.mutate(
      { metricId: suggestionDialog.metricId, suggestion: suggestionText },
      {
        onSuccess: () => {
          setSuggestionDialog(null);
          setSuggestionText('');
          toast.success('Suggestion enregistrée');
        },
        onError: (err) => toast.error(`Erreur: ${err.message}`),
      }
    );
  };

  // Ouvrir la dialog de suppression (étape 1)
  const handleOpenDelete = (metricId: string, metricLabel: string) => {
    const isCustom = isCustomMetric(metricId);
    setDeleteDialog({
      open: true,
      metricId,
      metricLabel,
      isCustom,
      step: 'confirm1',
      confirmText: '',
    });
  };

  // Passer à l'étape 2 de confirmation
  const handleDeleteStep2 = () => {
    if (deleteDialog) {
      setDeleteDialog({ ...deleteDialog, step: 'confirm2', confirmText: '' });
    }
  };

  // Exécuter la suppression finale
  const handleConfirmDelete = async () => {
    if (!deleteDialog) return;
    
    const { metricId, isCustom, confirmText, metricLabel } = deleteDialog;
    
    // Vérifier que l'utilisateur a tapé SUPPRIMER
    if (confirmText !== 'SUPPRIMER') {
      toast.error('Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    if (isCustom) {
      // Supprimer réellement de la base de données
      await deleteCustomMetricMutation.mutateAsync(metricId);
    } else {
      // Masquer uniquement (métrique core)
      handleHide(metricId);
      toast.info('Cette métrique est définie dans le code et ne peut pas être supprimée. Elle a été masquée.');
    }
    
    setDeleteDialog(null);
  };

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

  const allDefinitions = listStatDefinitions();
  const totalMetrics = allDefinitions.length;
  const hiddenCount = allDefinitions.filter(d => metricsStatus[d.id]?.hidden).length;
  const validatedCount = allDefinitions.filter(d => metricsStatus[d.id]?.validated).length;
  const suggestionsCount = allDefinitions.filter(d => metricsStatus[d.id]?.suggestion).length;
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
              <Badge variant="outline" className="text-green-600 border-green-300">
                {validatedCount} validées
              </Badge>
              {suggestionsCount > 0 && (
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  {suggestionsCount} suggestions
                </Badge>
              )}
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
            
            {hiddenCount > 0 && (
              <Button 
                variant={showHidden ? "secondary" : "outline"}
                size="sm" 
                onClick={() => setShowHidden(!showHidden)}
              >
                {showHidden ? 'Masquer supprimées' : `Voir ${hiddenCount} supprimées`}
              </Button>
            )}
            
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
                      const metricStatus: MetricStatus = metricsStatus[def.id] || { validated: false, hidden: false };
                      const isValidated = metricStatus.validated;
                      const isHidden = metricStatus.hidden;
                      const hasSuggestion = !!metricStatus.suggestion;
                      
                      return (
                        <div 
                          key={def.id}
                          className={cn(
                            "p-3 rounded-lg border transition-colors relative group",
                            isHidden && "opacity-50",
                            isValidated && "ring-2 ring-green-500/50",
                            status === 'ok' && "bg-background hover:bg-muted/50",
                            status === 'zero' && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
                            status === 'error' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                            status === 'complex' && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                          )}
                        >
                          {/* Menu d'actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailsDialog({ open: true, definition: def, value })}>
                                <Eye className="h-4 w-4 mr-2 text-blue-500" />
                                Voir le calcul
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isValidated ? (
                                <DropdownMenuItem onClick={() => handleUnvalidate(def.id)}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                  Dévalider
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleValidate(def.id)}>
                                  <Check className="h-4 w-4 mr-2 text-green-500" />
                                  Valider
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleOpenSuggestion(def.id, def.label)}>
                                <Lightbulb className="h-4 w-4 mr-2 text-purple-500" />
                                {hasSuggestion ? 'Modifier suggestion' : 'Suggérer calcul'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isHidden ? (
                                <DropdownMenuItem onClick={() => handleRestore(def.id)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Restaurer
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleHide(def.id)}
                                    className="text-muted-foreground"
                                  >
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Masquer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleOpenDelete(def.id, def.label)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="flex items-start justify-between gap-2 pr-6">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <UnitIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="text-xs font-medium truncate">
                                        {def.label}
                                      </span>
                                      {isValidated && (
                                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                      )}
                                      {hasSuggestion && (
                                        <Lightbulb className="h-3 w-3 text-purple-500 shrink-0" />
                                      )}
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
                                    {status === 'ok' && !isValidated && <Info className="h-4 w-4 text-muted-foreground" />}
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
                                {hasSuggestion && (
                                  <div className="pt-2 border-t mt-2">
                                    <p className="text-xs font-medium text-purple-600">Suggestion:</p>
                                    <p className="text-xs">{metricStatus.suggestion}</p>
                                  </div>
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
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Dialog de suggestion */}
        <Dialog open={suggestionDialog?.open || false} onOpenChange={(open) => !open && setSuggestionDialog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Suggérer un nouveau calcul</DialogTitle>
              <DialogDescription>
                Métrique: <strong>{suggestionDialog?.metricLabel}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea 
                placeholder="Décrivez comment cette métrique devrait être calculée...&#10;&#10;Ex: CA = somme des factures.totalHT où state != 'draft' et typeFacture != 'avoir'"
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Cette suggestion sera sauvegardée localement. Tu pourras ensuite l'implémenter dans le code.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSuggestionDialog(null)}>
                Annuler
              </Button>
              <Button onClick={handleSaveSuggestion}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de détails du calcul */}
        <Dialog open={detailsDialog?.open || false} onOpenChange={(open) => !open && setDetailsDialog(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Détails du calcul
              </DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-foreground">{detailsDialog?.definition.label}</span>
                {' '}- {detailsDialog?.definition.description || 'Pas de description'}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {detailsDialog?.definition && (
                <div className="space-y-4">
                  {/* Valeur actuelle */}
                  <div className="p-4 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Valeur actuelle:</span>
                    <div className="text-2xl font-bold text-primary">
                      {formatValue(detailsDialog.value, detailsDialog.definition.unit)}
                    </div>
                  </div>
                  
                  {/* Détails du calcul */}
                  <MetricCalculationDetails definition={detailsDialog.definition} />
                </div>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialog(null)}>
                Fermer
              </Button>
              <Button onClick={() => {
                if (detailsDialog) {
                  handleOpenSuggestion(detailsDialog.definition.id, detailsDialog.definition.label);
                  setDetailsDialog(null);
                }
              }}>
                <Lightbulb className="h-4 w-4 mr-2" />
                Suggérer une modification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de suppression avec double confirmation */}
        <Dialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                {deleteDialog?.step === 'confirm1' ? 'Confirmer la suppression' : 'Confirmation finale'}
              </DialogTitle>
              <DialogDescription>
                {deleteDialog?.isCustom ? (
                  <span>
                    Cette action supprimera <strong>définitivement</strong> la métrique{' '}
                    <span className="font-semibold text-foreground">"{deleteDialog?.metricLabel}"</span> de la base de données.
                  </span>
                ) : (
                  <span>
                    La métrique <span className="font-semibold text-foreground">"{deleteDialog?.metricLabel}"</span>{' '}
                    est définie dans le code source et ne peut pas être supprimée. Elle sera <strong>masquée</strong> de l'interface.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {deleteDialog?.step === 'confirm1' ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive font-medium mb-2">⚠️ Attention</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {deleteDialog?.isCustom ? (
                      <>
                        <li>• Cette action est <strong>irréversible</strong></li>
                        <li>• Toutes les données associées seront perdues</li>
                        <li>• Les tableaux de bord utilisant cette métrique seront affectés</li>
                      </>
                    ) : (
                      <>
                        <li>• La métrique sera masquée mais pas supprimée</li>
                        <li>• Vous pourrez la restaurer plus tard</li>
                      </>
                    )}
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Êtes-vous sûr de vouloir continuer ?
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">
                    Tapez <span className="font-mono font-bold text-destructive">SUPPRIMER</span> pour confirmer
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={deleteDialog?.confirmText || ''}
                    onChange={(e) => deleteDialog && setDeleteDialog({ ...deleteDialog, confirmText: e.target.value })}
                    placeholder="SUPPRIMER"
                    className="font-mono"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteDialog(null)}>
                Annuler
              </Button>
              {deleteDialog?.step === 'confirm1' ? (
                <Button variant="destructive" onClick={handleDeleteStep2}>
                  Continuer
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={handleConfirmDelete}
                  disabled={deleteDialog?.confirmText !== 'SUPPRIMER' || deleteCustomMetricMutation.isPending}
                >
                  {deleteCustomMetricMutation.isPending ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
