/**
 * ApporteurListPage - Liste des apporteurs avec KPIs agrégés
 * Inclut recherche live depuis Apogée (commanditaires)
 * Tri par colonne, filtres inline, indicateurs visuels colorés
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, TrendingDown, Loader2, Building2, MapPin, Phone, Mail, ArrowUpDown, ArrowUp, ArrowDown, FilterX, Trophy, Medal } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';
import { useApporteurListMetrics, type ApporteurListItem } from '../hooks/useApporteurListMetrics';
import { useApogeeCommanditaires, type ApogeeCommanditaire } from '@/hooks/useApogeeCommanditaires';
import { format, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  onSelectApporteur: (id: string, name?: string) => void;
}

type PeriodKey = '30j' | '90j' | '6m' | '12m';
type SortColumn = 'name' | 'dossiers' | 'ca_ht' | 'taux_transfo' | 'panier_moyen' | 'factures';
type SortDir = 'asc' | 'desc';
type TransfoFilter = 'all' | 'low' | 'mid' | 'high';
type PanierFilter = 'all' | 'below' | 'above';

function getPeriodDates(period: PeriodKey): { from: string; to: string } {
  const to = format(new Date(), 'yyyy-MM-dd');
  const map: Record<PeriodKey, Date> = {
    '30j': subDays(new Date(), 30),
    '90j': subDays(new Date(), 90),
    '6m': subMonths(new Date(), 6),
    '12m': subMonths(new Date(), 12),
  };
  return { from: format(map[period], 'yyyy-MM-dd'), to };
}

/** Rank medal for top 3 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold text-xs">🥇</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold text-xs">🥈</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold text-xs">🥉</span>;
  return <span className="inline-flex items-center justify-center w-6 h-6 text-muted-foreground text-xs font-medium">{rank}</span>;
}

/** Taux transfo colored badge */
function TransfoBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  let colorClasses: string;
  if (value >= 60) colorClasses = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
  else if (value >= 30) colorClasses = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
  else colorClasses = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', colorClasses)}>
      {value.toFixed(1)}%
    </span>
  );
}

/** CA color based on amount relative to max */
function caColor(value: number, max: number): string {
  if (max === 0) return 'text-muted-foreground';
  const ratio = value / max;
  if (ratio >= 0.7) return 'text-emerald-600 dark:text-emerald-400 font-bold';
  if (ratio >= 0.3) return 'text-foreground font-medium';
  return 'text-muted-foreground';
}

/** Panier moyen badge */
function PanierBadge({ value, median }: { value: number | null; median: number | null }) {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const isAboveMedian = median != null && value >= median;
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
      isAboveMedian
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
        : 'bg-muted text-muted-foreground'
    )}>
      {fmt(value)}€
    </span>
  );
}

/** Mini progress bar in background of cell */
function DossierCell({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barColor = pct >= 70
    ? 'bg-emerald-200/60 dark:bg-emerald-800/30'
    : pct >= 30
      ? 'bg-primary/10'
      : 'bg-muted/60';
  return (
    <div className="relative flex items-center justify-end">
      <div
        className={cn('absolute inset-y-0 right-0 rounded-sm transition-all', barColor)}
        style={{ width: `${pct}%` }}
      />
      <span className="relative z-10 font-medium">{value}</span>
    </div>
  );
}

/** Factures badge coloré */
function FacturesBadge({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  if (value === 0) return <span className="text-muted-foreground">0</span>;
  const cls = ratio >= 0.6
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
    : ratio >= 0.25
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
      : 'bg-muted text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cls)}>
      {value}
    </span>
  );
}

/** Sortable header */
function SortableHead({
  label, column, currentSort, currentDir, onSort, className,
}: {
  label: string;
  column: SortColumn;
  currentSort: SortColumn;
  currentDir: SortDir;
  onSort: (col: SortColumn) => void;
  className?: string;
}) {
  const isActive = currentSort === column;
  const Icon = isActive ? (currentDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead
      className={cn('cursor-pointer select-none group hover:bg-muted/50 transition-colors', className)}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1 justify-end">
        <span>{label}</span>
        <Icon className={cn('w-3.5 h-3.5 transition-opacity', isActive ? 'opacity-100 text-foreground' : 'opacity-30 group-hover:opacity-60')} />
      </div>
    </TableHead>
  );
}

export function ApporteurListPage({ onSelectApporteur }: Props) {
  const { agencyId } = useProfile();
  const [period, setPeriod] = useState<PeriodKey>('90j');
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>('ca_ht');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filter state
  const [filterDossiersMin, setFilterDossiersMin] = useState('');
  const [filterCaMin, setFilterCaMin] = useState('');
  const [filterTransfo, setFilterTransfo] = useState<TransfoFilter>('all');
  const [filterPanier, setFilterPanier] = useState<PanierFilter>('all');
  const [filterFacturesMin, setFilterFacturesMin] = useState('');

  const hasFilters = filterDossiersMin !== '' || filterCaMin !== '' || filterTransfo !== 'all' || filterPanier !== 'all' || filterFacturesMin !== '';

  const resetFilters = useCallback(() => {
    setFilterDossiersMin('');
    setFilterCaMin('');
    setFilterTransfo('all');
    setFilterPanier('all');
    setFilterFacturesMin('');
  }, []);

  const handleSort = useCallback((col: SortColumn) => {
    setSortDir(prev => sortColumn === col ? (prev === 'asc' ? 'desc' : 'asc') : 'desc');
    setSortColumn(col);
  }, [sortColumn]);

  useEffect(() => {
    if (showSuggestions && search.length >= 2 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [showSuggestions, search]);

  const { from, to } = getPeriodDates(period);
  const { data: apporteurs = [], isLoading } = useApporteurListMetrics({
    agencyId,
    dateFrom: from,
    dateTo: to,
  });

  const { data: commanditaires = [], isLoading: loadingApogee } = useApogeeCommanditaires();

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return commanditaires
      .filter(c => c.name.toLowerCase().includes(q) || String(c.id).includes(q))
      .slice(0, 8);
  }, [commanditaires, search]);

  const commanditairesById = useMemo(() => {
    const map = new Map<string, ApogeeCommanditaire>();
    for (const c of commanditaires) {
      map.set(String(c.id), c);
    }
    return map;
  }, [commanditaires]);

  const getApporteurName = useCallback((id: string) => {
    return commanditairesById.get(id)?.name || `Apporteur #${id}`;
  }, [commanditairesById]);

  // Compute derived stats
  const stats = useMemo(() => {
    const maxDossiers = Math.max(1, ...apporteurs.map(a => a.kpis.dossiers_received));
    const maxCa = Math.max(1, ...apporteurs.map(a => a.kpis.ca_ht));
    const maxFactures = Math.max(1, ...apporteurs.map(a => a.kpis.factures));
    const paniers = apporteurs.map(a => a.kpis.panier_moyen).filter((v): v is number => v != null).sort((a, b) => a - b);
    const medianPanier = paniers.length > 0 ? paniers[Math.floor(paniers.length / 2)] : null;
    return { maxDossiers, maxCa, maxFactures, medianPanier };
  }, [apporteurs]);

  // Filter + sort pipeline
  const processedList = useMemo(() => {
    let list = apporteurs;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => {
        const name = getApporteurName(a.apporteur_id).toLowerCase();
        return name.includes(q) || a.apporteur_id.toLowerCase().includes(q);
      });
    }

    // Numeric filters
    if (filterDossiersMin !== '') {
      const min = parseInt(filterDossiersMin, 10);
      if (!isNaN(min)) list = list.filter(a => a.kpis.dossiers_received >= min);
    }
    if (filterCaMin !== '') {
      const min = parseInt(filterCaMin, 10);
      if (!isNaN(min)) list = list.filter(a => a.kpis.ca_ht >= min);
    }
    if (filterFacturesMin !== '') {
      const min = parseInt(filterFacturesMin, 10);
      if (!isNaN(min)) list = list.filter(a => a.kpis.factures >= min);
    }
    if (filterTransfo !== 'all') {
      list = list.filter(a => {
        const t = a.kpis.taux_transfo_devis;
        if (t == null) return filterTransfo === 'low';
        if (filterTransfo === 'low') return t < 30;
        if (filterTransfo === 'mid') return t >= 30 && t < 60;
        return t >= 60;
      });
    }
    if (filterPanier !== 'all') {
      list = list.filter(a => {
        const p = a.kpis.panier_moyen;
        if (p == null) return filterPanier === 'below';
        if (filterPanier === 'below') return stats.medianPanier != null && p < stats.medianPanier;
        return stats.medianPanier != null && p >= stats.medianPanier;
      });
    }

    // Sort
    const getValue = (a: ApporteurListItem): number | string => {
      switch (sortColumn) {
        case 'name': return getApporteurName(a.apporteur_id).toLowerCase();
        case 'dossiers': return a.kpis.dossiers_received;
        case 'ca_ht': return a.kpis.ca_ht;
        case 'taux_transfo': return a.kpis.taux_transfo_devis ?? -1;
        case 'panier_moyen': return a.kpis.panier_moyen ?? -1;
        case 'factures': return a.kpis.factures;
        default: return 0;
      }
    };

    return [...list].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [apporteurs, search, getApporteurName, filterDossiersMin, filterCaMin, filterFacturesMin, filterTransfo, filterPanier, stats.medianPanier, sortColumn, sortDir]);

  // Footer totals
  const totals = useMemo(() => {
    const dossiers = processedList.reduce((s, a) => s + a.kpis.dossiers_received, 0);
    const ca = processedList.reduce((s, a) => s + a.kpis.ca_ht, 0);
    const factures = processedList.reduce((s, a) => s + a.kpis.factures, 0);
    const devisT = processedList.reduce((s, a) => s + a.kpis.devis_total, 0);
    const devisS = processedList.reduce((s, a) => s + a.kpis.devis_signed, 0);
    const taux = devisT > 0 ? Math.round((devisS / devisT) * 10000) / 100 : null;
    const panier = factures > 0 ? Math.round(ca / factures) : null;
    return { dossiers, ca, factures, taux, panier };
  }, [processedList]);

  const handleSelectSuggestion = useCallback((cmd: ApogeeCommanditaire) => {
    setSearch(cmd.name);
    setShowSuggestions(false);
    onSelectApporteur(String(cmd.id), cmd.name);
  }, [onSelectApporteur]);

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

  const isAlertRow = (a: ApporteurListItem) =>
    a.kpis.taux_transfo_devis != null && a.kpis.taux_transfo_devis < 30 && a.kpis.dossiers_received >= 5;

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 relative z-30">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Rechercher un apporteur (nom ou ID Apogée)..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pl-9"
          />

          {showSuggestions && search.length >= 2 && dropdownPos && createPortal(
            <div
              className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl max-h-[400px] overflow-y-auto"
              style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
            >
              {loadingApogee ? (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recherche dans Apogée...
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border">
                    Apporteurs Apogée
                  </div>
                  {suggestions.map(cmd => (
                    <button
                      key={cmd.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors",
                        "border-b border-border/50 last:border-b-0"
                      )}
                      onMouseDown={() => handleSelectSuggestion(cmd)}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground truncate">{cmd.name}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">#{cmd.id}</Badge>
                            {cmd.type && <Badge variant="secondary" className="text-[10px] shrink-0">{cmd.type}</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
                            {cmd.ville && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{cmd.ville}</span>}
                            {cmd.tel && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{cmd.tel}</span>}
                            {cmd.email && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" />{cmd.email}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Aucun apporteur trouvé dans Apogée
                </div>
              )}
            </div>,
            document.body
          )}
        </div>
        <Select value={period} onValueChange={v => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30j">30 jours</SelectItem>
            <SelectItem value="90j">90 jours</SelectItem>
            <SelectItem value="6m">6 mois</SelectItem>
            <SelectItem value="12m">12 mois</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground gap-1.5">
            <FilterX className="w-3.5 h-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : apporteurs.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Aucune donnée. Lancez le calcul des métriques.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <SortableHead label="Apporteur" column="name" currentSort={sortColumn} currentDir={sortDir} onSort={handleSort} className="text-left" />
                    <SortableHead label="Dossiers" column="dossiers" currentSort={sortColumn} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="CA HT" column="ca_ht" currentSort={sortColumn} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Taux transfo" column="taux_transfo" currentSort={sortColumn} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Panier moy." column="panier_moyen" currentSort={sortColumn} currentDir={sortDir} onSort={handleSort} />
                    <SortableHead label="Factures" column="factures" currentSort={sortColumn} currentDir={sortDir} onSort={handleSort} />
                  </TableRow>
                  {/* Inline filters row */}
                  <TableRow className="bg-muted/30 border-b">
                    <TableHead />
                    <TableHead />
                    <TableHead className="px-2 py-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filterDossiersMin}
                        onChange={e => setFilterDossiersMin(e.target.value)}
                        className="h-7 text-xs w-20 ml-auto"
                      />
                    </TableHead>
                    <TableHead className="px-2 py-1">
                      <Input
                        type="number"
                        placeholder="Min €"
                        value={filterCaMin}
                        onChange={e => setFilterCaMin(e.target.value)}
                        className="h-7 text-xs w-24 ml-auto"
                      />
                    </TableHead>
                    <TableHead className="px-2 py-1">
                      <Select value={filterTransfo} onValueChange={v => setFilterTransfo(v as TransfoFilter)}>
                        <SelectTrigger className="h-7 text-xs w-24 ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="low">&lt; 30%</SelectItem>
                          <SelectItem value="mid">30-60%</SelectItem>
                          <SelectItem value="high">&gt; 60%</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="px-2 py-1">
                      <Select value={filterPanier} onValueChange={v => setFilterPanier(v as PanierFilter)}>
                        <SelectTrigger className="h-7 text-xs w-28 ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="below">Sous médiane</SelectItem>
                          <SelectItem value="above">Au-dessus</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableHead>
                    <TableHead className="px-2 py-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filterFacturesMin}
                        onChange={e => setFilterFacturesMin(e.target.value)}
                        className="h-7 text-xs w-20 ml-auto"
                      />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun résultat pour ces filtres.
                      </TableCell>
                    </TableRow>
                  ) : (
                    processedList.map((a, idx) => {
                      const rank = idx + 1;
                      const alert = isAlertRow(a);
                      return (
                        <TableRow
                          key={a.apporteur_id}
                          className={cn(
                            'cursor-pointer transition-colors',
                            'hover:bg-orange-50/60 dark:hover:bg-orange-950/20',
                            alert && 'bg-red-50/50 dark:bg-red-950/20'
                          )}
                          onClick={() => onSelectApporteur(a.apporteur_id, getApporteurName(a.apporteur_id))}
                        >
                          <TableCell className="text-center">
                            <RankBadge rank={rank} />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getApporteurName(a.apporteur_id)}
                              {alert && (
                                <Badge variant="destructive" className="text-[10px] gap-0.5">
                                  <TrendingDown className="w-3 h-3" />Alerte
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right p-0 pr-4">
                            <DossierCell value={a.kpis.dossiers_received} max={stats.maxDossiers} />
                          </TableCell>
                          <TableCell className={cn('text-right', caColor(a.kpis.ca_ht, stats.maxCa))}>
                            {fmt(a.kpis.ca_ht)}€
                          </TableCell>
                          <TableCell className="text-right">
                            <TransfoBadge value={a.kpis.taux_transfo_devis} />
                          </TableCell>
                          <TableCell className="text-right">
                            <PanierBadge value={a.kpis.panier_moyen} median={stats.medianPanier} />
                          </TableCell>
                          <TableCell className="text-right">
                            <FacturesBadge value={a.kpis.factures} max={stats.maxFactures} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {processedList.length > 0 && (
                  <TableFooter>
                    <TableRow className="bg-muted/50 font-semibold text-sm">
                      <TableCell colSpan={2} className="text-right text-muted-foreground">
                        Total ({processedList.length} apporteurs)
                      </TableCell>
                      <TableCell className="text-right">{fmt(totals.dossiers)}</TableCell>
                      <TableCell className="text-right">{fmt(totals.ca)}€</TableCell>
                      <TableCell className="text-right">
                        <TransfoBadge value={totals.taux} />
                      </TableCell>
                      <TableCell className="text-right">
                        {totals.panier != null ? `${fmt(totals.panier)}€` : '—'}
                      </TableCell>
                      <TableCell className="text-right">{fmt(totals.factures)}</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
