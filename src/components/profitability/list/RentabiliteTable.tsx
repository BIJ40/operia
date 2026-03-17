/**
 * RentabiliteTable — Main table for project profitability list.
 */
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calculator, ArrowUpDown, FileBarChart } from 'lucide-react';
import { ReliabilityBadge } from './ReliabilityBadge';
import { RentabiliteSegments, type RentabiliteSegment } from './RentabiliteSegments';
import { formatCurrency, formatPercent } from '../constants';
import type { RentabiliteListItem } from '../hooks/useRentabiliteList';
import type { ReliabilityLevel } from '@/types/projectProfitability';

interface RentabiliteTableProps {
  items: RentabiliteListItem[];
  isLoading: boolean;
  onSelectProject: (projectId: string) => void;
  onCalculate: (projectId: string) => void;
}

type SortKey = 'projectLabel' | 'clientName' | 'ca' | 'margin' | 'marginPct' | 'reliability';
type SortDir = 'asc' | 'desc';

function getSnapshotStatus(item: RentabiliteListItem): 'not_calculated' | 'up_to_date' | 'outdated' {
  if (!item.hasSnapshot || !item.snapshot) return 'not_calculated';
  // Outdated detection would require comparing hash with current Apogée data
  // For now, we trust the snapshot — UI will override when detail is opened
  return 'up_to_date';
}

function getSegment(item: RentabiliteListItem): RentabiliteSegment {
  if (!item.hasSnapshot) return 'not_calculated';
  const snap = item.snapshot!;
  if (snap.completeness_score >= 60) {
    return snap.net_margin < 0 ? 'deficit' : 'reliable';
  }
  return 'to_complete';
}

export function RentabiliteTable({ items, isLoading, onSelectProject, onCalculate }: RentabiliteTableProps) {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<RentabiliteSegment>('all');
  const [sortKey, setSortKey] = useState<SortKey>('projectLabel');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const counts = useMemo(() => {
    const c: Record<RentabiliteSegment, number> = { all: items.length, reliable: 0, to_complete: 0, deficit: 0, not_calculated: 0 };
    for (const item of items) {
      const seg = getSegment(item);
      c[seg]++;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    
    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => 
        i.projectLabel.toLowerCase().includes(q) ||
        i.clientName.toLowerCase().includes(q) ||
        i.projectId.includes(q)
      );
    }

    // Segment filter
    if (segment !== 'all') {
      result = result.filter(i => getSegment(i) === segment);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'projectLabel': cmp = a.projectLabel.localeCompare(b.projectLabel); break;
        case 'clientName': cmp = a.clientName.localeCompare(b.clientName); break;
        case 'ca': cmp = (a.snapshot?.ca_invoiced_ht ?? 0) - (b.snapshot?.ca_invoiced_ht ?? 0); break;
        case 'margin': cmp = (a.snapshot?.net_margin ?? 0) - (b.snapshot?.net_margin ?? 0); break;
        case 'marginPct': cmp = (a.snapshot?.margin_pct ?? -999) - (b.snapshot?.margin_pct ?? -999); break;
        case 'reliability': cmp = (a.snapshot?.completeness_score ?? 0) - (b.snapshot?.completeness_score ?? 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [items, search, segment, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const SortableHead = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground"
      onClick={() => toggleSort(sortKeyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Segments + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <RentabiliteSegments activeSegment={segment} onSegmentChange={setSegment} counts={counts} />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un dossier…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <FileBarChart className="h-8 w-8" />
          <p className="text-sm">Aucun dossier trouvé</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Dossier" sortKeyName="projectLabel" />
              <SortableHead label="Client" sortKeyName="clientName" />
              <SortableHead label="CA HT" sortKeyName="ca" />
              <SortableHead label="Marge nette" sortKeyName="margin" />
              <SortableHead label="% Marge" sortKeyName="marginPct" />
              <SortableHead label="Fiabilité" sortKeyName="reliability" />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const status = getSnapshotStatus(item);
              const snap = item.snapshot;

              return (
                <TableRow
                  key={item.projectId}
                  className="cursor-pointer"
                  onClick={() => item.hasSnapshot ? onSelectProject(item.projectId) : undefined}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.projectLabel}
                      {status === 'not_calculated' && (
                        <Badge variant="outline" className="text-xs bg-muted">Non calculé</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.clientName || '—'}</TableCell>
                  <TableCell>{snap ? formatCurrency(snap.ca_invoiced_ht) : '—'}</TableCell>
                  <TableCell className={snap && snap.net_margin < 0 ? 'text-destructive font-medium' : ''}>
                    {snap ? formatCurrency(snap.net_margin) : '—'}
                  </TableCell>
                  <TableCell className={snap && snap.margin_pct !== null && snap.margin_pct < 0 ? 'text-destructive' : ''}>
                    {snap ? formatPercent(snap.margin_pct) : '—'}
                  </TableCell>
                  <TableCell>
                    {snap ? (
                      <ReliabilityBadge level={snap.reliability_level as ReliabilityLevel} score={snap.completeness_score} />
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {status === 'not_calculated' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); onCalculate(item.projectId); }}
                      >
                        <Calculator className="h-3.5 w-3.5 mr-1" />
                        Calculer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onSelectProject(item.projectId); }}
                      >
                        Détail
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
