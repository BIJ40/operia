/**
 * FinancialEntityTable — Premium sortable, searchable table for apporteurs/clients
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatEuros, formatPercent } from '@/apogee-connect/utils/formatters';
import { cn } from '@/lib/utils';
import { Search, ArrowUpDown, ChevronRight, Building2, Users } from 'lucide-react';
import type { FinancialEntityStats, DebtRiskLevel } from '@/apogee-connect/types/financial';

type SortField = 'entityLabel' | 'totalFactureTTC' | 'totalEncaisse' | 'resteDu' | 'nbFactures' | 'delaiMoyenPaiement' | 'partDuGlobal';
type SortDir = 'asc' | 'desc';

const RISK_STYLES: Record<DebtRiskLevel, { label: string; cls: string }> = {
  healthy: { label: 'Sain', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  watch: { label: 'Surveillance', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  warning: { label: 'Alerte', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  critical: { label: 'Critique', cls: 'bg-destructive/15 text-destructive' },
};

interface FinancialEntityTableProps {
  byApporteur: FinancialEntityStats[];
  byClient: FinancialEntityStats[];
  isLoading: boolean;
  onEntityClick: (entity: FinancialEntityStats) => void;
}

export function FinancialEntityTable({ byApporteur, byClient, isLoading, onEntityClick }: FinancialEntityTableProps) {
  const [view, setView] = useState<'apporteur' | 'client'>('apporteur');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'resteDu', dir: 'desc' });

  const entities = view === 'apporteur' ? byApporteur : byClient;

  const filtered = useMemo(() => {
    let result = entities;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => e.entityLabel.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const aVal = a[sort.field] ?? 0;
      const bVal = b[sort.field] ?? 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sort.dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [entities, search, sort]);

  const toggleSort = (field: SortField) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort(field)}>
      {children}
      <ArrowUpDown className={cn('h-3 w-3', sort.field === field ? 'text-foreground' : 'text-muted-foreground/40')} />
    </button>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Détail par tiers</CardTitle>
          <div className="flex items-center gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="apporteur" className="text-xs gap-1.5 px-3 h-7">
                  <Users className="h-3.5 w-3.5" />Apporteurs
                </TabsTrigger>
                <TabsTrigger value="client" className="text-xs gap-1.5 px-3 h-7">
                  <Building2 className="h-3.5 w-3.5" />Clients
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[200px]"><SortHeader field="entityLabel">Nom</SortHeader></TableHead>
                <TableHead className="text-right"><SortHeader field="totalFactureTTC">Facturé TTC</SortHeader></TableHead>
                <TableHead className="text-right"><SortHeader field="totalEncaisse">Encaissé</SortHeader></TableHead>
                <TableHead className="text-right"><SortHeader field="resteDu">Reste dû</SortHeader></TableHead>
                <TableHead className="text-right"><SortHeader field="nbFactures">Factures</SortHeader></TableHead>
                <TableHead className="text-right"><SortHeader field="delaiMoyenPaiement">Délai moy.</SortHeader></TableHead>
                <TableHead className="text-right"><SortHeader field="partDuGlobal">% du dû</SortHeader></TableHead>
                <TableHead className="w-[90px]">Risque</TableHead>
                <TableHead className="w-[32px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                    {search ? 'Aucun résultat pour cette recherche' : 'Aucune donnée disponible'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(entity => {
                  const risk = RISK_STYLES[entity.riskLevel];
                  return (
                    <TableRow
                      key={entity.entityId}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onEntityClick(entity)}
                    >
                      <TableCell className="font-medium truncate max-w-[200px]">{entity.entityLabel}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatEuros(entity.totalFactureTTC)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatEuros(entity.totalEncaisse)}</TableCell>
                      <TableCell className={cn('text-right tabular-nums font-semibold',
                        entity.resteDu > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                      )}>
                        {formatEuros(entity.resteDu)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{entity.nbFactures}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entity.delaiMoyenPaiement !== null ? `${entity.delaiMoyenPaiement} j` : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(entity.partDuGlobal)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', risk.cls)}>
                          {risk.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground px-4 py-2">
            {filtered.length} {view === 'apporteur' ? 'apporteur' : 'client'}{filtered.length > 1 ? 's' : ''} · Total dû : {formatEuros(filtered.reduce((s, e) => s + Math.max(0, e.resteDu), 0))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
