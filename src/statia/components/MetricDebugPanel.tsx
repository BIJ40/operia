/**
 * STATiA-BY-BIJ - Panneau de debug enrichi pour l'exécution de métriques
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Database, 
  GitMerge, 
  Filter, 
  Calculator,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import type { ExecutionDebug } from '../engine/metricEngine';

// ============================================
// TYPES
// ============================================

interface MetricDebugPanelProps {
  debug: ExecutionDebug;
  className?: string;
}

// ============================================
// COMPOSANTS
// ============================================

function SectionHeader({ 
  title, 
  icon: Icon, 
  count, 
  isOpen, 
  onToggle 
}: { 
  title: string; 
  icon: React.ElementType; 
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleTrigger asChild>
      <Button 
        variant="ghost" 
        className="w-full justify-between p-2 h-auto"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    </CollapsibleTrigger>
  );
}

function EndpointsSection({ endpoints }: { endpoints: ExecutionDebug['endpoints'] }) {
  return (
    <div className="space-y-2 pl-6">
      {endpoints.map((ep, i) => (
        <div 
          key={i} 
          className="p-3 bg-muted/50 rounded-lg border border-border/50 space-y-2"
        >
          <div className="flex items-center justify-between">
            <code className="text-sm font-medium text-primary">{ep.source}</code>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {ep.rawCount} brut
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {ep.filteredCount} filtré
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground break-all font-mono flex items-center gap-1">
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
            {ep.url}
          </div>
        </div>
      ))}
    </div>
  );
}

function JoinsSection({ joins }: { joins: ExecutionDebug['joins'] }) {
  if (joins.length === 0) {
    return (
      <div className="pl-6 text-sm text-muted-foreground italic">
        Aucune jointure exécutée
      </div>
    );
  }

  return (
    <div className="space-y-2 pl-6">
      {joins.map((join, i) => (
        <div 
          key={i}
          className="p-3 bg-muted/50 rounded-lg border border-border/50"
        >
          <div className="flex items-center gap-2 text-sm">
            <code className="font-medium">{join.from}</code>
            <GitMerge className="h-4 w-4 text-muted-foreground" />
            <code className="font-medium">{join.to}</code>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            <span className="font-mono">{join.keys.local}</span>
            <span className="mx-1">=</span>
            <span className="font-mono">{join.keys.foreign}</span>
          </div>
          <div className="mt-1">
            <Badge 
              variant={join.matchedCount > 0 ? 'default' : 'destructive'} 
              className="text-xs"
            >
              {join.matchedCount} correspondances
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function FiltersSection({ filters }: { filters: ExecutionDebug['filters'] }) {
  if (filters.length === 0) {
    return (
      <div className="pl-6 text-sm text-muted-foreground italic">
        Aucun filtre appliqué
      </div>
    );
  }

  return (
    <div className="space-y-2 pl-6">
      {filters.map((filter, i) => (
        <div 
          key={i}
          className="p-3 bg-muted/50 rounded-lg border border-border/50 flex items-center justify-between"
        >
          <div className="text-sm">
            <code className="font-medium">{filter.field}</code>
            <span className="mx-1 text-muted-foreground">{filter.operator}</span>
            <code className="text-primary">
              {typeof filter.value === 'object' 
                ? JSON.stringify(filter.value) 
                : String(filter.value)}
            </code>
          </div>
          <Badge variant="outline" className="text-xs">
            -{filter.filteredOutCount} lignes
          </Badge>
        </div>
      ))}
    </div>
  );
}

function AggregationSection({ aggregation }: { aggregation: ExecutionDebug['aggregation'] }) {
  const { stats } = aggregation;

  return (
    <div className="pl-6 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default">{aggregation.type}</Badge>
        {aggregation.field && (
          <Badge variant="outline">
            field: {aggregation.field}
          </Badge>
        )}
        {aggregation.groupBy && aggregation.groupBy.length > 0 && (
          <Badge variant="secondary">
            groupBy: {aggregation.groupBy.join(', ')}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatCard label="Count" value={stats.count} />
        {stats.sum !== undefined && (
          <StatCard label="Somme" value={stats.sum.toFixed(2)} />
        )}
        {stats.avg !== undefined && (
          <StatCard label="Moyenne" value={stats.avg.toFixed(2)} />
        )}
        {stats.min !== undefined && (
          <StatCard label="Min" value={stats.min.toFixed(2)} />
        )}
        {stats.max !== undefined && (
          <StatCard label="Max" value={stats.max.toFixed(2)} />
        )}
        {stats.numeratorCount !== undefined && (
          <StatCard label="Numérateur" value={stats.numeratorCount} />
        )}
        {stats.denominatorCount !== undefined && (
          <StatCard label="Dénominateur" value={stats.denominatorCount} />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-2 bg-muted/50 rounded border border-border/50 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono font-medium">{value}</div>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function MetricDebugPanel({ debug, className = '' }: MetricDebugPanelProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['endpoints', 'aggregation'])
  );

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const isSuccess = debug.durationMs > 0 && debug.aggregation.stats.count > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Debug d'exécution
          </CardTitle>
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Succès
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Erreur
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {debug.durationMs}ms
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-1">
          ID: {debug.executionId}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Endpoints */}
        <Collapsible open={openSections.has('endpoints')}>
          <SectionHeader
            title="Sources de données"
            icon={Database}
            count={debug.endpoints.length}
            isOpen={openSections.has('endpoints')}
            onToggle={() => toggleSection('endpoints')}
          />
          <CollapsibleContent className="pt-2">
            <EndpointsSection endpoints={debug.endpoints} />
          </CollapsibleContent>
        </Collapsible>

        {/* Jointures */}
        <Collapsible open={openSections.has('joins')}>
          <SectionHeader
            title="Jointures"
            icon={GitMerge}
            count={debug.joins.length}
            isOpen={openSections.has('joins')}
            onToggle={() => toggleSection('joins')}
          />
          <CollapsibleContent className="pt-2">
            <JoinsSection joins={debug.joins} />
          </CollapsibleContent>
        </Collapsible>

        {/* Filtres */}
        <Collapsible open={openSections.has('filters')}>
          <SectionHeader
            title="Filtres appliqués"
            icon={Filter}
            count={debug.filters.length}
            isOpen={openSections.has('filters')}
            onToggle={() => toggleSection('filters')}
          />
          <CollapsibleContent className="pt-2">
            <FiltersSection filters={debug.filters} />
          </CollapsibleContent>
        </Collapsible>

        {/* Agrégation */}
        <Collapsible open={openSections.has('aggregation')}>
          <SectionHeader
            title="Agrégation"
            icon={Calculator}
            isOpen={openSections.has('aggregation')}
            onToggle={() => toggleSection('aggregation')}
          />
          <CollapsibleContent className="pt-2">
            <AggregationSection aggregation={debug.aggregation} />
          </CollapsibleContent>
        </Collapsible>

        {/* JSON brut */}
        <Collapsible open={openSections.has('raw')}>
          <SectionHeader
            title="Debug complet (JSON)"
            icon={Database}
            isOpen={openSections.has('raw')}
            onToggle={() => toggleSection('raw')}
          />
          <CollapsibleContent className="pt-2">
            <pre className="pl-6 text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-64 font-mono">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default MetricDebugPanel;
