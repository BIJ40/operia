/**
 * Vue complète des devis acceptés avec filtres, stats et table triable.
 */
import { useState } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DossierDetailDialog } from '@/apogee-connect/components/DossierDetailDialog';
import { useDevisAcceptes, SortField, DossierStatusFilter } from '@/apogee-connect/hooks/useDevisAcceptes';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: 'asc' | 'desc' }) {
  if (field !== current) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return dir === 'asc' 
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" /> 
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

const STATUS_FILTER_OPTIONS: { value: DossierStatusFilter; label: string; description: string }[] = [
  { value: 'all', label: 'Tous', description: 'Tous les devis acceptés' },
  { value: 'to_action', label: 'À traiter', description: 'À commander / Attente fourn. / À planifier' },
  { value: 'planned', label: 'Planifié', description: 'Dossier planifié ou en cours' },
];

const STATE_BADGE_COLORS: Record<string, string> = {
  'devis_to_order': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'wait_fourn': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'to_planify_tvx': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'planned': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'planifie_tvx': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'in_progress': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'done': 'bg-muted text-muted-foreground',
  'canceled': 'bg-destructive/10 text-destructive',
};

export default function DevisAcceptesView() {
  const {
    dossiers, totalDossiers, totalHT, allUnivers, statusCounts,
    isLoading, filters, setSearch, setUniversFilter, setStatusFilter, setSort,
  } = useDevisAcceptes();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const toggleUnivers = (u: string) => {
    const current = filters.univers;
    setUniversFilter(
      current.includes(u) ? current.filter(x => x !== u) : [...current, u]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dossiers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalDossiers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Montant total HT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalHT)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {STATUS_FILTER_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={filters.statusFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
            className="h-8 text-xs"
            title={opt.description}
          >
            {opt.label}
            <span className={cn(
              "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              filters.statusFilter === opt.value 
                ? "bg-primary-foreground/20 text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {opt.value === 'all' ? statusCounts.all : opt.value === 'to_action' ? statusCounts.to_action : statusCounts.planned}
            </span>
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dossier, client, ville..."
            value={filters.search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        {allUnivers.map(u => (
          <Badge
            key={u}
            variant={filters.univers.includes(u) ? 'default' : 'outline'}
            className="cursor-pointer select-none capitalize"
            onClick={() => toggleUnivers(u)}
          >
            {u}
          </Badge>
        ))}
        {filters.univers.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setUniversFilter([])} className="h-7 text-xs">
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => setSort('projectRef')}>
                  <span className="flex items-center">Réf. dossier <SortIcon field="projectRef" current={filters.sortField} dir={filters.sortDir} /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => setSort('clientName')}>
                  <span className="flex items-center">Client <SortIcon field="clientName" current={filters.sortField} dir={filters.sortDir} /></span>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Apporteur</TableHead>
                <TableHead className="hidden md:table-cell">Ville</TableHead>
                <TableHead className="hidden lg:table-cell">Univers</TableHead>
                <TableHead>Statut dossier</TableHead>
                <TableHead className="text-center">Devis</TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => setSort('totalHT')}>
                  <span className="flex items-center justify-end">Total HT <SortIcon field="totalHT" current={filters.sortField} dir={filters.sortDir} /></span>
                </TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => setSort('lastDevisDate')}>
                  <span className="flex items-center">Dernier devis <SortIcon field="lastDevisDate" current={filters.sortField} dir={filters.sortDir} /></span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dossiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Aucun dossier avec devis accepté trouvé
                  </TableCell>
                </TableRow>
              ) : (
                dossiers.map(d => (
                  <TableRow
                    key={d.projectId}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() => setSelectedProjectId(d.projectId)}
                  >
                    <TableCell className="font-medium">
                      <div>{d.projectRef}</div>
                      {d.projectLabel && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{d.projectLabel}</div>
                      )}
                    </TableCell>
                    <TableCell>{d.clientName}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{d.commanditaireName || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{d.ville}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {d.univers.map(u => (
                          <Badge key={u} variant="secondary" className="text-[10px] capitalize">{u}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        STATE_BADGE_COLORS[d.projectState] || "bg-muted text-muted-foreground"
                      )}>
                        {d.projectStateLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{d.nbDevis}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(d.totalHT)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {d.lastDevisDate ? new Date(d.lastDevisDate).toLocaleDateString('fr-FR') : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dossier detail dialog */}
      {selectedProjectId && (
        <DossierDetailDialog
          open={!!selectedProjectId}
          onOpenChange={open => !open && setSelectedProjectId(null)}
          projectId={selectedProjectId}
        />
      )}
    </div>
  );
}
