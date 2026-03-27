/**
 * RentabiliteTable — Main table for project profitability list.
 * v3: Filters by univers, apporteur, date range + pagination.
 */
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calculator, ArrowUpDown, FileBarChart, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { ReliabilityBadge } from './ReliabilityBadge';
import { RentabiliteSegments, type RentabiliteSegment } from './RentabiliteSegments';
import { formatCurrency, formatPercent } from '../constants';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';
import type { RentabiliteListItem } from '../hooks/useRentabiliteList';
import type { ReliabilityLevel } from '@/types/projectProfitability';

interface RentabiliteTableProps {
  items: RentabiliteListItem[];
  isLoading: boolean;
  onSelectProject: (projectId: string, projectRef?: string) => void;
  onCalculate: (projectId: string) => void;
}

type SortKey = 'projectRef' | 'clientName' | 'apporteur' | 'libelle' | 'ca' | 'margin' | 'marginPct' | 'reliability';
type SortDir = 'asc' | 'desc';
type DatePreset = 'all' | 'current-month' | '2026' | '2025' | 'custom';

const PAGE_SIZE = 50;

function getSegment(item: RentabiliteListItem): RentabiliteSegment {
  if (!item.hasSnapshot) return 'not_calculated';
  const snap = item.snapshot!;
  if (snap.completeness_score >= 60) {
    return snap.net_margin < 0 ? 'deficit' : 'reliable';
  }
  return 'to_complete';
}

function marginColor(pct: number | null): string {
  if (pct === null) return '';
  if (pct >= 30) return 'text-emerald-600 dark:text-emerald-400 font-bold';
  if (pct >= 15) return 'text-emerald-500 dark:text-emerald-400';
  if (pct >= 0) return 'text-foreground';
  if (pct >= -15) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive font-bold';
}

function getDateRange(preset: DatePreset): { start: Date; end: Date } | null {
  const now = new Date();
  switch (preset) {
    case 'current-month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case '2026':
      return { start: startOfYear(new Date(2026, 0, 1)), end: endOfYear(new Date(2026, 0, 1)) };
    case '2025':
      return { start: startOfYear(new Date(2025, 0, 1)), end: endOfYear(new Date(2025, 0, 1)) };
    default:
      return null;
  }
}

export function RentabiliteTable({ items, isLoading, onSelectProject, onCalculate }: RentabiliteTableProps) {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<RentabiliteSegment>('all');
  const [sortKey, setSortKey] = useState<SortKey>('projectRef');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  // Filters
  const [filterUnivers, setFilterUnivers] = useState<string>('__all__');
  const [filterApporteur, setFilterApporteur] = useState<string>('__all__');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  // Extract unique values for dropdowns
  const { universOptions, apporteurOptions } = useMemo(() => {
    const universSet = new Set<string>();
    const apporteurSet = new Set<string>();
    for (const item of items) {
      if (item.univers) universSet.add(item.univers);
      if (item.apporteurName) apporteurSet.add(item.apporteurName);
    }
    return {
      universOptions: [...universSet].sort(),
      apporteurOptions: [...apporteurSet].sort(),
    };
  }, [items]);

  // Apply date filter first (shared between counts and results)
  const dateFiltered = useMemo(() => {
    const dateRange = getDateRange(datePreset);
    if (!dateRange) return items;
    return items.filter(i => {
      const dateStr = i.lastFactureDate || i.dateCreation;
      if (!dateStr) return false;
      try {
        const d = parseISO(dateStr);
        return isWithinInterval(d, dateRange);
      } catch {
        return false;
      }
    });
  }, [items, datePreset]);

  // Segment counts computed on date-filtered items
  const counts = useMemo(() => {
    const c: Record<RentabiliteSegment, number> = { all: dateFiltered.length, reliable: 0, to_complete: 0, deficit: 0, not_calculated: 0 };
    for (const item of dateFiltered) c[getSegment(item)]++;
    return c;
  }, [dateFiltered]);

  const filtered = useMemo(() => {
    let result = dateFiltered;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.projectLabel.toLowerCase().includes(q) ||
        i.clientName.toLowerCase().includes(q) ||
        i.projectId.includes(q) ||
        i.projectRef.toLowerCase().includes(q) ||
        i.apporteurName.toLowerCase().includes(q) ||
        i.libelle.toLowerCase().includes(q)
      );
    }

    // Segment
    if (segment !== 'all') result = result.filter(i => getSegment(i) === segment);

    // Univers filter
    if (filterUnivers !== '__all__') {
      result = result.filter(i => i.univers === filterUnivers);
    }

    // Apporteur filter
    if (filterApporteur !== '__all__') {
      result = result.filter(i => i.apporteurName === filterApporteur);
    }

    // Sort
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'projectRef': cmp = a.projectRef.localeCompare(b.projectRef); break;
        case 'clientName': cmp = a.clientName.localeCompare(b.clientName); break;
        case 'apporteur': cmp = a.apporteurName.localeCompare(b.apporteurName); break;
        case 'libelle': cmp = a.libelle.localeCompare(b.libelle); break;
        case 'ca': cmp = (a.snapshot?.ca_invoiced_ht ?? 0) - (b.snapshot?.ca_invoiced_ht ?? 0); break;
        case 'margin': cmp = (a.snapshot?.net_margin ?? 0) - (b.snapshot?.net_margin ?? 0); break;
        case 'marginPct': cmp = (a.snapshot?.margin_pct ?? -999) - (b.snapshot?.margin_pct ?? -999); break;
        case 'reliability': cmp = (a.snapshot?.completeness_score ?? 0) - (b.snapshot?.completeness_score ?? 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [dateFiltered, search, segment, sortKey, sortDir, filterUnivers, filterApporteur]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  const resetPage = () => setPage(0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const hasActiveFilters = filterUnivers !== '__all__' || filterApporteur !== '__all__' || datePreset !== 'all';
  const clearFilters = () => {
    setFilterUnivers('__all__');
    setFilterApporteur('__all__');
    setDatePreset('all');
    resetPage();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  const SortableHead = ({ label, sortKeyName, className: cls }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <TableHead className={cn('cursor-pointer select-none hover:text-foreground', cls)} onClick={() => toggleSort(sortKeyName)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('h-3 w-3', sortKey === sortKeyName ? 'text-primary' : 'opacity-30')} />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Date preset badges */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: 'current-month' as DatePreset, label: 'Mois en cours' },
            { key: '2026' as DatePreset, label: '2026' },
            { key: '2025' as DatePreset, label: '2025' },
            { key: 'all' as DatePreset, label: 'Tout' },
          ]).map(({ key, label }) => (
            <Badge
              key={key}
              variant={datePreset === key ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer select-none text-xs px-3 py-1 transition-colors',
                datePreset === key
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-accent hover:text-accent-foreground',
              )}
              onClick={() => { setDatePreset(key); resetPage(); }}
            >
              {label}
            </Badge>
          ))}
        </div>

        {/* Univers dropdown */}
        <Select value={filterUnivers} onValueChange={(v) => { setFilterUnivers(v); resetPage(); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Univers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les univers</SelectItem>
            {universOptions.map(u => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Apporteur dropdown */}
        <Select value={filterApporteur} onValueChange={(v) => { setFilterApporteur(v); resetPage(); }}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Apporteur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les apporteurs</SelectItem>
            {apporteurOptions.map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3 w-3" />
            Effacer filtres
          </Button>
        )}

        {/* Search - pushed right */}
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} className="pl-9 h-8 text-xs" />
        </div>
      </div>

      {/* Segments */}
      <RentabiliteSegments activeSegment={segment} onSegmentChange={(s) => { setSegment(s); resetPage(); }} counts={counts} />

      {/* Result count */}
      <div className="text-xs text-muted-foreground">
        {filtered.length} dossier{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
        {totalPages > 1 && ` — page ${page + 1}/${totalPages}`}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <FileBarChart className="h-8 w-8" />
          <p className="text-sm">Aucun dossier trouvé</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Réf" sortKeyName="projectRef" />
                <SortableHead label="Apporteur" sortKeyName="apporteur" />
                <SortableHead label="Client" sortKeyName="clientName" />
                <SortableHead label="Libellé" sortKeyName="libelle" />
                <SortableHead label="CA HT" sortKeyName="ca" className="text-right" />
                <SortableHead label="Marge" sortKeyName="margin" className="text-right" />
                <SortableHead label="%" sortKeyName="marginPct" className="text-right" />
                <SortableHead label="Fiabilité" sortKeyName="reliability" />
                <TableHead className="text-right w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => {
                const snap = item.snapshot;
                const notCalc = !item.hasSnapshot;

                return (
                  <TableRow
                    key={item.projectId}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-orange-50/60 dark:hover:bg-orange-950/20',
                      snap && snap.net_margin < 0 && 'bg-red-50/30 dark:bg-red-950/10',
                    )}
                    onClick={() => onSelectProject(item.projectId, item.projectRef)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-primary">{item.projectRef}</span>
                        {notCalc && <Badge variant="outline" className="text-[10px] bg-muted px-1.5">—</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[140px] truncate">{item.apporteurName || '—'}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{item.clientName || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">{item.libelle || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{snap ? formatCurrency(snap.ca_invoiced_ht) : '—'}</TableCell>
                    <TableCell className={cn('text-right tabular-nums whitespace-nowrap', snap ? marginColor(snap.margin_pct) : '')}>
                      {snap ? formatCurrency(snap.net_margin) : '—'}
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums whitespace-nowrap', snap ? marginColor(snap.margin_pct) : '')}>
                      {snap ? formatPercent(snap.margin_pct) : '—'}
                    </TableCell>
                    <TableCell>
                      {snap ? <ReliabilityBadge level={snap.reliability_level as ReliabilityLevel} score={snap.completeness_score} /> : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {notCalc ? (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onCalculate(item.projectId); }}>
                          <Calculator className="h-3.5 w-3.5 mr-1" />
                          Calc.
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelectProject(item.projectId, item.projectRef); }}>
                          Détail
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i;
                  } else if (page < 3) {
                    pageNum = i;
                  } else if (page > totalPages - 4) {
                    pageNum = totalPages - 7 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <Badge
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer select-none min-w-[28px] justify-center text-xs',
                        page === pageNum ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                      )}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum + 1}
                    </Badge>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
