/**
 * Overlay de résultat pour la recherche unifiée
 * Modale plein écran avec carte centrale animée
 * Mode debug pour N5/N6
 */

import React, { useEffect } from 'react';
import { X, ExternalLink, BarChart3, FileText, AlertCircle, TrendingUp, Medal, Euro, Bug, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUnifiedSearch } from './UnifiedSearchContext';
import { StatSearchResult, DocSearchResult, FallbackSearchResult } from './types';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';
import { QUICK_PERIOD_CHIPS } from './nlDictionaries';

export function UnifiedSearchResultOverlay() {
  const { result, query, clearResult, submitQuery } = useUnifiedSearch();
  const { isAdmin } = usePermissions();

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && result) {
        clearResult();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [result, clearResult]);

  if (!result) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={clearResult}
    >
      <Card 
        className={cn(
          "w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden",
          "animate-in zoom-in-95 fade-in duration-300",
          "shadow-2xl shadow-primary/10"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                {result.type === 'stat' && <BarChart3 className="w-5 h-5 text-primary" />}
                {result.type === 'doc' && <FileText className="w-5 h-5 text-primary" />}
                {result.type === 'fallback' && <AlertCircle className="w-5 h-5 text-muted-foreground" />}
                
                {result.type === 'stat' && 'Résultat Statistiques'}
                {result.type === 'doc' && 'Résultats Documentation'}
                {result.type === 'fallback' && 'Pas de résultat'}
              </CardTitle>
              <CardDescription className="mt-1 truncate">
                « {query} »
              </CardDescription>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={clearResult}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <CardContent className="p-6">
            {result.type === 'stat' && (
              <StatResultContent 
                result={result} 
                query={query}
                isAdmin={isAdmin}
                onPeriodChange={(periodLabel) => {
                  // Relancer la requête avec la nouvelle période
                  const newQuery = query.replace(
                    /(ce mois|cette année|12 derniers mois|mois dernier)/gi, 
                    ''
                  ).trim() + ' ' + periodLabel;
                  submitQuery(newQuery);
                }}
              />
            )}
            {result.type === 'doc' && <DocResultContent result={result} />}
            {result.type === 'fallback' && <FallbackResultContent result={result} />}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}

// === Sub-components ===

interface StatResultContentProps {
  result: StatSearchResult;
  query: string;
  isAdmin: boolean;
  onPeriodChange: (periodLabel: string) => void;
}

function StatResultContent({ result, query, isAdmin, onPeriodChange }: StatResultContentProps) {
  const periode = result.filters?.periode;
  const periodeLabel = periode?.label || 
    (periode?.start && periode?.end ? formatPeriodLabel(periode) : null);

  const isDefaultPeriod = periode?.isDefault === true;
  const parsed = result.parsed;

  // Access denied
  if (result.accessDenied) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-70" />
        <p className="text-foreground font-medium">Accès restreint</p>
        <p className="text-sm text-muted-foreground mt-2">
          {result.accessMessage || 'Vous n\'avez pas accès à cette statistique.'}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-4">
          Seuls les responsables (N2+) peuvent consulter les statistiques par technicien et apporteur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metadata badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <BarChart3 className="w-3 h-3" />
          {result.metricLabel}
        </Badge>
        {result.filters.univers && (
          <Badge variant="secondary" className="gap-1">
            {result.filters.univers}
          </Badge>
        )}
        
        {/* Période avec indication si par défaut */}
        <Badge 
          variant={isDefaultPeriod ? "outline" : "secondary"} 
          className={cn("gap-1", isDefaultPeriod && "border-dashed border-amber-500/50 text-amber-600")}
        >
          <Calendar className="w-3 h-3" />
          {periodeLabel || '12 derniers mois'}
          {isDefaultPeriod && (
            <span className="text-[10px] ml-1 opacity-70">(par défaut)</span>
          )}
        </Badge>
        
        {result.agencyName && (
          <Badge variant="outline" className="gap-1">
            Agence: {result.agencyName}
          </Badge>
        )}
      </div>

      {/* Chips de période rapide (si période par défaut) */}
      {isDefaultPeriod && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <RefreshCw className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Période déduite par défaut. Changer :
          </span>
          <div className="flex gap-1.5">
            {QUICK_PERIOD_CHIPS.map((chip) => (
              <Badge
                key={chip.id}
                variant="outline"
                className="cursor-pointer text-xs hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={() => onPeriodChange(chip.label.toLowerCase())}
              >
                {chip.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main result */}
      {result.result.topItem && (
        <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Medal className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top résultat</p>
              <p className="text-xl font-bold text-foreground">
                {result.result.topItem.name}
              </p>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-bold text-primary">
              {formatValue(result.result.topItem.value, result.result.unit)}
            </span>
          </div>
        </div>
      )}

      {/* Simple value if no topItem */}
      {!result.result.topItem && (
        <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-xl p-6 border border-primary/20">
          <div className="flex items-baseline gap-2">
            <Euro className="w-6 h-6 text-primary" />
            <span className="text-3xl font-bold text-primary">
              {formatValue(result.result.value, result.result.unit)}
            </span>
          </div>
        </div>
      )}

      {/* Ranking table */}
      {result.result.ranking && result.result.ranking.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Classement complet
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-medium">#</th>
                  <th className="text-left px-4 py-2 text-sm font-medium">Nom</th>
                  <th className="text-right px-4 py-2 text-sm font-medium">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {result.result.ranking.map((item, idx) => (
                  <tr key={item.id} className={cn(
                    "border-t",
                    idx === 0 && "bg-primary/5"
                  )}>
                    <td className="px-4 py-2 text-sm">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : item.rank}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      {formatValue(item.value, result.result.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debug panel for N5/N6 */}
      {isAdmin && parsed && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Bug className="w-4 h-4" />
              Debug (N5/N6)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-muted/50 rounded-lg border text-xs font-mono space-y-1">
              <div><span className="text-muted-foreground">metricId:</span> {parsed?.metricId || 'null'}</div>
              <div><span className="text-muted-foreground">dimension:</span> {parsed?.debug?.detectedDimension || 'null'}</div>
              <div><span className="text-muted-foreground">intent:</span> {parsed?.debug?.detectedIntent || 'null'}</div>
              <div><span className="text-muted-foreground">univers:</span> {parsed?.debug?.detectedUnivers || 'null'}</div>
              <div><span className="text-muted-foreground">période:</span> {parsed?.debug?.detectedPeriod || 'null'}</div>
              <div><span className="text-muted-foreground">routing:</span> {parsed?.debug?.routingPath || 'null'}</div>
              <div><span className="text-muted-foreground">confidence:</span> {parsed?.confidence != null ? (parsed.confidence * 100).toFixed(0) + '%' : 'null'}</div>
              <div><span className="text-muted-foreground">minRole:</span> {parsed?.minRole || 'null'}</div>
              <div><span className="text-muted-foreground">isRanking:</span> {parsed?.isRanking ? 'true' : 'false'}</div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Link to StatIA */}
      <div className="pt-4 border-t">
        <Button asChild variant="outline" className="gap-2">
          <Link to="/agency/indicateurs">
            <ExternalLink className="w-4 h-4" />
            Voir dans Pilotage Agence
          </Link>
        </Button>
      </div>
    </div>
  );
}

function DocResultContent({ result }: { result: DocSearchResult }) {
  const sourceLabels: Record<string, { label: string; color: string }> = {
    apogee: { label: 'Apogée', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
    helpconfort: { label: 'HelpConfort', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
    apporteurs: { label: 'Apporteurs', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
    faq: { label: 'FAQ', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  };

  const results = result?.results ?? [];

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Aucun document trouvé pour cette recherche.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((doc) => {
        const sourceInfo = sourceLabels[doc.source] || { label: doc.source, color: 'bg-muted' };
        
        return (
          <Link 
            key={doc.id}
            to={doc.url}
            className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn("text-xs", sourceInfo.color)}>
                    {sourceInfo.label}
                  </Badge>
                  {doc.similarity && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(doc.similarity * 100)}% pertinent
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {doc.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {doc.snippet}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function FallbackResultContent({ result }: { result: FallbackSearchResult }) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground">{result.message}</p>
      <p className="text-sm text-muted-foreground/70 mt-2">
        Essaie de reformuler ta question ou utilise des mots-clés plus précis.
      </p>
    </div>
  );
}

// === Helpers ===

function formatPeriodLabel(periode: { start: string; end: string }): string {
  try {
    const start = new Date(periode.start);
    const end = new Date(periode.end);
    
    const startMonth = format(start, 'MMMM yyyy', { locale: fr });
    const endMonth = format(end, 'MMMM yyyy', { locale: fr });
    
    if (startMonth === endMonth) {
      return startMonth;
    }
    return `${startMonth} - ${endMonth}`;
  } catch {
    return 'Période non spécifiée';
  }
}

function formatValue(value: number | string, unit?: string): string {
  if (typeof value !== 'number') return String(value);
  
  if (unit === '€') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value);
}
