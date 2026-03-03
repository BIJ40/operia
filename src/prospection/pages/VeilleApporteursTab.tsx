/**
 * VeilleApporteursTab - Onglet Veille dans le module Commercial
 * Vue globale de tous les apporteurs avec scoring, tri, filtrage
 * Réutilise le hook useVeilleApporteurs existant
 */

import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search, ArrowUpDown, Loader2, TrendingDown, TrendingUp,
  AlertTriangle, CheckCircle, Moon, Minus, Radar, HelpCircle,
} from 'lucide-react';
import { useVeilleApporteurs, type VeilleFilterType, type VeilleSortKey } from '@/statia/hooks/useVeilleApporteurs';
import type { VeilleApporteurConsolide } from '@/statia/engines/veilleApporteursEngine';
import { cn } from '@/lib/utils';

interface Props {
  onSelectApporteur: (id: string, name: string) => void;
}

const euroFmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

// KPI card config
interface KpiCardConfig {
  label: string;
  filterKey: VeilleFilterType;
  icon: React.ElementType;
  colorClass: string;
  tooltip: string;
}

const KPI_CARDS: KpiCardConfig[] = [
  { label: 'Tous', filterKey: 'all', icon: Radar, colorClass: 'text-foreground', tooltip: 'Nombre total d\'apporteurs actifs dans la période' },
  { label: 'Sains', filterKey: 'sains', icon: CheckCircle, colorClass: 'text-green-600', tooltip: 'Apporteurs sans aucun signal d\'alerte (ni dormant, ni en déclin, ni sous seuil)' },
  { label: 'Dormants', filterKey: 'dormants', icon: Moon, colorClass: 'text-destructive', tooltip: 'Apporteurs n\'ayant confié aucun dossier depuis plus de 30 jours' },
  { label: 'En déclin', filterKey: 'declassement', icon: TrendingDown, colorClass: 'text-amber-600', tooltip: 'Apporteurs dont le CA période récente est en baisse significative vs période précédente' },
  { label: 'Sous seuil', filterKey: 'sous_seuil', icon: AlertTriangle, colorClass: 'text-amber-500', tooltip: 'Apporteurs dont le CA est inférieur au seuil de rentabilité défini (5 000€)' },
];

function StatusBadges({ a }: { a: VeilleApporteurConsolide }) {
  return (
    <div className="flex flex-wrap gap-1">
      {a.isDormant && (
        <Badge variant="destructive" className="text-[10px] gap-0.5">
          <Moon className="w-3 h-3" /> Dormant
        </Badge>
      )}
      {a.isEnDeclassement && (
        <Badge className="text-[10px] gap-0.5 bg-amber-500/15 text-amber-700 border-amber-500/30">
          <TrendingDown className="w-3 h-3" /> Déclin
        </Badge>
      )}
      {a.isSousSeuil && (
        <Badge variant="outline" className="text-[10px] gap-0.5 text-amber-600 border-amber-400/50">
          <AlertTriangle className="w-3 h-3" /> Sous seuil
        </Badge>
      )}
      {!a.isDormant && !a.isEnDeclassement && !a.isSousSeuil && (
        <Badge variant="outline" className="text-[10px] gap-0.5 text-green-600 border-green-400/50">
          <CheckCircle className="w-3 h-3" /> Sain
        </Badge>
      )}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 65 ? 'bg-green-500' : score >= 45 ? 'bg-blue-500' : score >= 30 ? 'bg-amber-500' : 'bg-destructive';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium w-6 text-right">{score}</span>
    </div>
  );
}

function VariationCell({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground">—</span>;
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

function SortableHeader({ label, sortKey: key, currentKey, direction, onToggle, tooltip }: {
  label: string;
  sortKey: VeilleSortKey;
  currentKey: VeilleSortKey;
  direction: 'asc' | 'desc';
  onToggle: (k: VeilleSortKey) => void;
  tooltip?: string;
}) {
  const isActive = currentKey === key;
  return (
    <TableHead className="text-right">
      <button
        onClick={() => onToggle(key)}
        className={cn(
          'inline-flex items-center gap-1 text-xs hover:text-foreground transition-colors',
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

export function VeilleApporteursTab({ onSelectApporteur }: Props) {
  const {
    apporteurs, kpis, isLoading, activeFilter, sortKey, sortDirection, searchQuery,
    setActiveFilter, toggleSort, setSearchQuery,
  } = useVeilleApporteurs();

  const kpiValues: Record<VeilleFilterType, number> = useMemo(() => ({
    all: kpis.totalActifs,
    sains: kpis.sains,
    dormants: kpis.dormants,
    declassement: kpis.enDeclassement,
    sous_seuil: kpis.sousSeuil,
  }), [kpis]);

  const handleRowClick = useCallback((a: VeilleApporteurConsolide) => {
    onSelectApporteur(a.apporteurId, a.apporteurNom);
  }, [onSelectApporteur]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* KPI Pills */}
        <div className="flex flex-wrap gap-2">
          {KPI_CARDS.map(kpi => {
            const Icon = kpi.icon;
            const isActive = activeFilter === kpi.filterKey;
            const count = kpiValues[kpi.filterKey];
            return (
              <Tooltip key={kpi.filterKey}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter(kpi.filterKey)}
                    className={cn(
                      'gap-1.5 text-xs',
                      !isActive && kpi.colorClass
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {kpi.label}
                    <Badge variant="secondary" className="ml-0.5 text-[10px] h-4 px-1.5">
                      {count}
                    </Badge>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {kpi.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un apporteur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : apporteurs.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Aucun apporteur trouvé pour ce filtre.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader label="Apporteur" sortKey="nom" currentKey={sortKey} direction={sortDirection} onToggle={toggleSort} />
                      <TableHead className="w-32">Statut</TableHead>
                      <SortableHeader
                        label="Score"
                        sortKey="scoreRisque"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Score de risque 0-100. Plus le score est élevé, plus l'apporteur est à risque."
                      />
                      <SortableHeader
                        label="CA période A"
                        sortKey="CA_A_HT"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Chiffre d'affaires HT facturé sur la période récente (30 derniers jours)"
                      />
                      <SortableHeader
                        label="CA période B"
                        sortKey="CA_B_HT"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Chiffre d'affaires HT facturé sur la période précédente (30 jours avant)"
                      />
                      <SortableHeader
                        label="Variation"
                        sortKey="variationPct"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Évolution en % du CA entre les deux périodes. Négatif = baisse."
                      />
                      <SortableHeader
                        label="Inactivité"
                        sortKey="joursInactivite"
                        currentKey={sortKey}
                        direction={sortDirection}
                        onToggle={toggleSort}
                        tooltip="Nombre de jours depuis le dernier dossier confié par cet apporteur."
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apporteurs.map(a => (
                      <TableRow
                        key={a.apporteurId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(a)}
                      >
                        <TableCell className="font-medium">
                          {a.apporteurNom || a.apporteurId}
                        </TableCell>
                        <TableCell>
                          <StatusBadges a={a} />
                        </TableCell>
                        <TableCell className="text-right">
                          <ScoreBar score={a.scoreRisque} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {euroFmt(a.CA_A_HT)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {euroFmt(a.CA_B_HT)}
                        </TableCell>
                        <TableCell className="text-right">
                          <VariationCell pct={a.variationPct} />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'text-sm',
                            a.joursInactivite > 30 ? 'text-destructive font-medium' :
                            a.joursInactivite > 14 ? 'text-amber-600' : 'text-muted-foreground'
                          )}>
                            {a.joursInactivite}j
                          </span>
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
