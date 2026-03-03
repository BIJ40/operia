/**
 * VeilleApporteursTab - Onglet Veille dans le module Commercial
 * Vue consolidée de tous les apporteurs avec scoring adaptatif unifié
 * Utilise exactement le même moteur que les fiches individuelles
 */

import { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

function ScoreGauge({ score }: { score: number }) {
  if (score < 0) {
    return (
      <span className="text-xs text-muted-foreground italic">N/A</span>
    );
  }
  const color =
    score > 72 ? 'bg-green-500' :
    score > 58 ? 'bg-emerald-400' :
    score > 42 ? 'bg-blue-500' :
    score > 30 ? 'bg-amber-500' :
    'bg-destructive';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(score, 2)}%` }} />
      </div>
      <span className="text-xs font-semibold w-6 text-right tabular-nums">{score}</span>
    </div>
  );
}

function TrendLabel({ row }: { row: VeilleApporteurRow }) {
  if (row.score < 0) return <span className="text-xs text-muted-foreground">—</span>;

  const colorMap: Record<string, string> = {
    danger: 'text-destructive',
    warning: 'text-amber-600',
    stable: 'text-blue-600',
    positive: 'text-emerald-600',
    excellent: 'text-green-600',
  };

  return (
    <span className={cn('text-xs font-medium', colorMap[row.level] || 'text-muted-foreground')}>
      {row.label}
    </span>
  );
}

function VariationCell({ pct }: { pct: number }) {
  if (Math.abs(pct) < 3) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600 font-medium">
        <TrendingUp className="w-3 h-3" /> +{pct.toFixed(0)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-destructive font-medium">
      <TrendingDown className="w-3 h-3" /> {pct.toFixed(0)}%
    </span>
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
          'inline-flex items-center gap-1 text-xs hover:text-foreground transition-colors whitespace-nowrap',
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
        <ArrowUpDown className={cn('w-3 h-3', isActive && 'text-primary')} />
      </button>
    </TableHead>
  );
}

function InactivityCell({ jours, isDormant }: { jours: number; isDormant: boolean }) {
  if (jours >= 9999) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn(
      'text-xs tabular-nums',
      isDormant ? 'text-destructive font-semibold' :
      jours > 60 ? 'text-amber-600 font-medium' :
      'text-muted-foreground'
    )}>
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
        <Card>
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
                  <TableHeader>
                    <TableRow>
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
                    {rows.map(row => (
                      <TableRow
                        key={row.apporteurId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(row)}
                      >
                        {/* Nom */}
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {row.apporteurNom}
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
                          <div className="flex flex-col items-end text-xs tabular-nums">
                            <span className="text-muted-foreground">{euroFmt(row.caAvgMensuel)}</span>
                            <span className="font-medium">{euroFmt(row.caRecentMensuel)}</span>
                          </div>
                        </TableCell>

                        {/* Variation CA */}
                        <TableCell className="text-right">
                          <VariationCell pct={row.caVariationPct} />
                        </TableCell>

                        {/* Dossiers */}
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end text-xs tabular-nums">
                            <span className="text-muted-foreground">{row.dossiersAvg.toFixed(1)}</span>
                            <span className="font-medium">{row.dossiersRecent.toFixed(1)}</span>
                          </div>
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
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400/50 cursor-help">
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
