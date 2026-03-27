/**
 * VeilleApporteursTab - Onglet Veille dans le module Commercial
 * Vue consolidée de tous les apporteurs avec scoring adaptatif unifié
 * Utilise exactement le même moteur que les fiches individuelles
 * v2: Indicateurs visuels colorés, rang, hover orange, footer récap
 */

import { useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search, ArrowUpDown, Loader2, TrendingDown, TrendingUp,
  Minus, Radar, HelpCircle, Moon, AlertTriangle, CheckCircle2, Sparkles,
} from 'lucide-react';
import { useVeilleAdaptive, type VeilleFilterType, type VeilleSortKey, type VeilleApporteurRow } from '../hooks/useVeilleAdaptive';
import type { RecentMonthsOption } from '../engine/adaptiveScoring';
import { cn } from '@/lib/utils';

interface Props {
  onSelectApporteur: (id: string, name: string) => void;
}

const euroFmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

// ==================== KPI Filter Pills ====================

interface FilterPill {
  key: VeilleFilterType;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  tooltip: string;
  countKey: keyof ReturnType<typeof useVeilleAdaptive>['kpis'];
}

const FILTER_PILLS: FilterPill[] = [
  { key: 'all', label: 'Tous', icon: Radar, colorClass: 'text-foreground', tooltip: 'Tous les apporteurs avec historique', countKey: 'total' },
  { key: 'dormants', label: 'Dormants', icon: Moon, colorClass: 'text-destructive', tooltip: 'Aucun dossier depuis le seuil configuré', countKey: 'dormants' },
  { key: 'en_baisse', label: 'En baisse', icon: AlertTriangle, colorClass: 'text-amber-600', tooltip: 'Score adaptatif < 42 — tendance baissière vs leur propre moyenne', countKey: 'enBaisse' },
  { key: 'stables', label: 'Stables', icon: CheckCircle2, colorClass: 'text-blue-600', tooltip: 'Score adaptatif entre 42 et 58 — activité conforme à leur historique', countKey: 'stables' },
  { key: 'en_hausse', label: 'En hausse', icon: Sparkles, colorClass: 'text-green-600', tooltip: 'Score adaptatif > 58 — en progression vs leur propre moyenne', countKey: 'enHausse' },
];

// ==================== Sub-components ====================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold text-xs">🥇</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold text-xs">🥈</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold text-xs">🥉</span>;
  return <span className="inline-flex items-center justify-center w-6 h-6 text-muted-foreground text-xs font-medium">{rank}</span>;
}

function ScoreGauge({ score }: { score: number }) {
  if (score < 0) {
    return <span className="text-xs text-muted-foreground italic">N/A</span>;
  }
  const color =
    score > 72 ? 'bg-emerald-500' :
    score > 58 ? 'bg-emerald-400' :
    score > 42 ? 'bg-blue-500' :
    score > 30 ? 'bg-amber-500' :
    'bg-red-500';

  const textColor =
    score > 72 ? 'text-emerald-600 dark:text-emerald-400' :
    score > 58 ? 'text-emerald-500 dark:text-emerald-400' :
    score > 42 ? 'text-blue-600 dark:text-blue-400' :
    score > 30 ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.max(score, 3)}%` }} />
      </div>
      <span className={cn('text-xs font-bold w-7 text-right tabular-nums', textColor)}>{score}</span>
    </div>
  );
}

function TrendLabel({ row }: { row: VeilleApporteurRow }) {
  if (row.score < 0) return <span className="text-xs text-muted-foreground">—</span>;

  const config: Record<string, { color: string; bg: string }> = {
    danger: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    warning: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    stable: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    positive: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    excellent: { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  };

  const c = config[row.level] || { color: 'text-muted-foreground', bg: 'bg-muted' };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', c.color, c.bg)}>
      {row.label}
    </span>
  );
}

function VariationCell({ pct }: { pct: number }) {
  if (Math.abs(pct) < 3) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs text-muted-foreground bg-muted">
        <Minus className="w-3 h-3" /> {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30">
        <TrendingUp className="w-3 h-3" /> +{pct.toFixed(0)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30">
      <TrendingDown className="w-3 h-3" /> {pct.toFixed(0)}%
    </span>
  );
}

/** CA cell with color intensity relative to max */
function CaCell({ avg, recent, maxCa }: { avg: number; recent: number; maxCa: number }) {
  const ratio = maxCa > 0 ? recent / maxCa : 0;
  const recentColor = ratio >= 0.7
    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
    : ratio >= 0.3
    ? 'text-foreground font-semibold'
    : 'text-muted-foreground font-medium';

  return (
    <div className="flex flex-col items-end text-xs tabular-nums">
      <span className="text-muted-foreground">{euroFmt(avg)}</span>
      <span className={recentColor}>{euroFmt(recent)}</span>
    </div>
  );
}

/** Dossiers cell with mini progress bar */
function DossiersCell({ avg, recent, maxDossiers }: { avg: number; recent: number; maxDossiers: number }) {
  const pct = maxDossiers > 0 ? Math.round((recent / maxDossiers) * 100) : 0;
  return (
    <div className="relative flex flex-col items-end text-xs tabular-nums">
      <div
        className="absolute inset-y-0 right-0 bg-primary/8 rounded-sm transition-all"
        style={{ width: `${pct}%` }}
      />
      <span className="relative text-muted-foreground">{avg.toFixed(1)}</span>
      <span className="relative font-semibold">{recent.toFixed(1)}</span>
    </div>
  );
}

function SortableHeader({ label, sortKey: key, currentKey, direction, onToggle, tooltip, className: cls }: {
  label: string;
  sortKey: VeilleSortKey;
  currentKey: VeilleSortKey;
  direction: 'asc' | 'desc';
  onToggle: (k: VeilleSortKey) => void;
  tooltip?: string;
  className?: string;
}) {
  const isActive = currentKey === key;
  return (
    <TableHead className={cn('text-right', cls)}>
      <button
        onClick={() => onToggle(key)}
        className={cn(
          'inline-flex items-center gap-1 text-xs hover:text-foreground transition-colors whitespace-nowrap group',
          isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
        )}
      >
        {label}
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3 h-3 text-muted-foreground/50" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <ArrowUpDown className={cn('w-3 h-3 transition-opacity', isActive ? 'text-primary opacity-100' : 'opacity-30 group-hover:opacity-60')} />
      </button>
    </TableHead>
  );
}

function InactivityCell({ jours, isDormant }: { jours: number; isDormant: boolean }) {
  if (jours >= 9999) return <span className="text-xs text-muted-foreground">—</span>;

  const config = isDormant
    ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 font-bold'
    : jours > 60
    ? 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 font-semibold'
    : jours > 30
    ? 'text-muted-foreground bg-muted'
    : 'text-muted-foreground';

  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs tabular-nums', config)}>
      {jours}j
    </span>
  );
}

// ==================== Main Component ====================

export function VeilleApporteursTab({ onSelectApporteur }: Props) {
  const {
    rows, kpis, isLoading,
    recentMonths, setRecentMonths,
    seuilDormantMois, setSeuilDormantMois,
    activeFilter, setActiveFilter,
    sortKey, sortDirection, toggleSort,
    searchQuery, setSearchQuery,
  } = useVeilleAdaptive();

  const handleRowClick = useCallback((r: VeilleApporteurRow) => {
    onSelectApporteur(r.apporteurId, r.apporteurNom);
  }, [onSelectApporteur]);

  // Compute max values for relative coloring
  const stats = useMemo(() => {
    const maxCa = Math.max(1, ...rows.map(r => r.caRecentMensuel));
    const maxDossiers = Math.max(0.1, ...rows.map(r => r.dossiersRecent));
    const avgScore = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + (r.score >= 0 ? r.score : 0), 0) / rows.filter(r => r.score >= 0).length) : 0;
    const totalCaRecent = rows.reduce((s, r) => s + r.caRecentMensuel, 0);
    const totalDossiersRecent = rows.reduce((s, r) => s + r.dossiersRecent, 0);
    return { maxCa, maxDossiers, avgScore, totalCaRecent, totalDossiersRecent };
  }, [rows]);

  // Row-level alert detection
  const isAlertRow = (row: VeilleApporteurRow) =>
    row.isDormant || (row.level === 'danger' && row.dossiersRecent >= 1);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Barre de contrôle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_PILLS.map(pill => {
              const Icon = pill.icon;
              const count = kpis[pill.countKey];
              const isActive = activeFilter === pill.key;
              return (
                <Tooltip key={pill.key}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveFilter(pill.key)}
                      className={cn('gap-1.5 text-xs', !isActive && pill.colorClass)}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {pill.label}
                      <Badge variant="secondary" className="ml-0.5 text-[10px] h-4 px-1.5">
                        {count}
                      </Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {pill.tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 ml-auto">
            <Select value={String(recentMonths)} onValueChange={v => setRecentMonths(Number(v) as RecentMonthsOption)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Tendance 1 mois</SelectItem>
                <SelectItem value="3">Tendance 3 mois</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(seuilDormantMois)} onValueChange={v => setSeuilDormantMois(Number(v))}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Dormant si &gt; 1 mois</SelectItem>
                <SelectItem value="2">Dormant si &gt; 2 mois</SelectItem>
                <SelectItem value="3">Dormant si &gt; 3 mois</SelectItem>
                <SelectItem value="6">Dormant si &gt; 6 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un apporteur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Aucun apporteur trouvé pour ce filtre.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="w-10 text-center text-xs text-muted-foreground">#</TableHead>
                      <SortableHeader label="Apporteur" sortKey="nom" currentKey={sortKey} direction={sortDirection} onToggle={toggleSort} className="text-left" />
                      <SortableHeader
                        label="Score"
                        sortKey="score"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Score adaptatif 0-100 basé sur les variations CA (40%), dossiers (25%), taux transfo (20%), factures (15%) vs la moyenne historique propre à l'apporteur."
                      />
                      <TableHead className="text-center">
                        <span className="text-xs text-muted-foreground">Tendance</span>
                      </TableHead>
                      <SortableHeader
                        label="CA moy/mois"
                        sortKey="caRecentMensuel"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Moyenne mensuelle historique → Moyenne récente"
                      />
                      <SortableHeader
                        label="Var. CA"
                        sortKey="caVariationPct"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Variation % du CA récent vs la moyenne historique de l'apporteur"
                      />
                      <SortableHeader
                        label="Dossiers/mois"
                        sortKey="dossiersRecent"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Volume moyen de dossiers par mois (historique → récent)"
                      />
                      <SortableHeader
                        label="Inactivité"
                        sortKey="joursInactivite"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Nombre de jours depuis le dernier dossier confié"
                      />
                      <TableHead className="text-center">
                        <span className="text-xs text-muted-foreground">Alertes</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => {
                      const rank = idx + 1;
                      const alert = isAlertRow(row);
                      return (
                        <TableRow
                          key={row.apporteurId}
                          className={cn(
                            'cursor-pointer transition-colors',
                            'hover:bg-orange-50/60 dark:hover:bg-orange-950/20',
                            alert && 'bg-red-50/40 dark:bg-red-950/15',
                            row.isDormant && 'opacity-75'
                          )}
                          onClick={() => handleRowClick(row)}
                        >
                          {/* Rang */}
                          <TableCell className="text-center">
                            <RankBadge rank={rank} />
                          </TableCell>

                          {/* Nom */}
                          <TableCell className="font-medium max-w-[200px] truncate">
                            <div className="flex items-center gap-2">
                              {row.apporteurNom}
                              {row.isDormant && (
                                <Badge variant="outline" className="text-[10px] border-red-300 text-red-600 dark:text-red-400 gap-0.5">
                                  <Moon className="w-3 h-3" /> Dormant
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Score gauge */}
                          <TableCell className="text-right">
                            <ScoreGauge score={row.score} />
                          </TableCell>

                          {/* Tendance label */}
                          <TableCell className="text-center">
                            <TrendLabel row={row} />
                          </TableCell>

                          {/* CA historique → récent */}
                          <TableCell className="text-right">
                            <CaCell avg={row.caAvgMensuel} recent={row.caRecentMensuel} maxCa={stats.maxCa} />
                          </TableCell>

                          {/* Variation CA */}
                          <TableCell className="text-right">
                            <VariationCell pct={row.caVariationPct} />
                          </TableCell>

                          {/* Dossiers */}
                          <TableCell className="text-right p-0 pr-4">
                            <DossiersCell avg={row.dossiersAvg} recent={row.dossiersRecent} maxDossiers={stats.maxDossiers} />
                          </TableCell>

                          {/* Inactivité */}
                          <TableCell className="text-right">
                            <InactivityCell jours={row.joursInactivite} isDormant={row.isDormant} />
                          </TableCell>

                          {/* Alertes */}
                          <TableCell className="text-center">
                            {row.alerts.length > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-400/50 cursor-help">
                                    {row.alerts.length}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-sm text-xs space-y-1">
                                  {row.alerts.map((a, i) => (
                                    <p key={i}>• {a}</p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  {rows.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/50 font-semibold text-sm">
                        <TableCell />
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {rows.length} apporteurs
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <span className="text-muted-foreground">Moy.</span> <span className="font-bold">{stats.avgScore}</span>
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right text-xs font-semibold">
                          {euroFmt(stats.totalCaRecent)}/mois
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right text-xs font-semibold">
                          {stats.totalDossiersRecent.toFixed(1)}/mois
                        </TableCell>
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
