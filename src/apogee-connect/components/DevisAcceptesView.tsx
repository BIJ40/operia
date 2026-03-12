/**
 * Vue complète des devis acceptés avec filtres, stats et table triable.
 */
import { useState } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileCheck, Loader2, CalendarCheck, Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DossierDetailDialog } from '@/apogee-connect/components/DossierDetailDialog';
import { useDevisAcceptes, SortField } from '@/apogee-connect/hooks/useDevisAcceptes';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: 'asc' | 'desc' }) {
  if (field !== current) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  return dir === 'asc' 
    ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" /> 
    : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

/** Column header filter popover with search + multi-select */
function ColumnFilterPopover({
  label,
  options,
  selected,
  onSelectionChange,
  sortField,
  currentSortField,
  sortDir,
  onSort,
}: {
  label: string;
  options: string[];
  selected: string[];
  onSelectionChange: (values: string[]) => void;
  sortField?: SortField;
  currentSortField?: SortField;
  sortDir?: 'asc' | 'desc';
  onSort?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = searchTerm
    ? options.filter(o => o.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;
  const hasFilter = selected.length > 0;

  const toggle = (value: string) => {
    onSelectionChange(
      selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]
    );
  };

  return (
    <div className="flex items-center gap-0.5">
      {onSort && sortField && (
        <button onClick={onSort} className="flex items-center hover:text-foreground">
          {label}
          <SortIcon field={sortField} current={currentSortField!} dir={sortDir!} />
        </button>
      )}
      {!onSort && <span>{label}</span>}
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn(
            "ml-1 p-0.5 rounded hover:bg-muted/80 transition-colors",
            hasFilter && "text-primary"
          )}>
            <Filter className={cn("w-3.5 h-3.5", hasFilter ? "fill-primary/20" : "opacity-50")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder={`Filtrer ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <ScrollArea className="h-48 overflow-y-auto">
            <div className="p-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun résultat</p>
              ) : (
                filtered.map(opt => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted/60 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.includes(opt)}
                      onCheckedChange={() => toggle(opt)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate capitalize">{opt}</span>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
          {hasFilter && (
            <div className="p-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange([])}
                className="w-full h-7 text-xs"
              >
                <X className="w-3 h-3 mr-1" /> Effacer le filtre
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {hasFilter && (
        <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5">{selected.length}</Badge>
      )}
    </div>
  );
}

const STATE_BADGE_COLORS: Record<string, string> = {
  'devis_to_order': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'wait_fourn': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'to_planify_tvx': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'planifie_rt': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  'done': 'bg-muted text-muted-foreground',
  'canceled': 'bg-destructive/10 text-destructive',
};

export default function DevisAcceptesView() {
  const {
    dossiers, totalDossiers, totalHT, allUnivers, allVilles, allApporteurs, allStatuses,
    isLoading, filters, setSearch, setUniversFilter, setVillesFilter, setApporteursFilter, setStatusesFilter, setSort,
  } = useDevisAcceptes();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const activeFilterCount = (filters.univers.length > 0 ? 1 : 0) + (filters.villes.length > 0 ? 1 : 0) + (filters.apporteurs.length > 0 ? 1 : 0) + (filters.statuses.length > 0 ? 1 : 0);

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

      {/* Search + active filters summary */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dossier, client..."
            value={filters.search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setUniversFilter([]); setVillesFilter([]); setApporteursFilter([]); setStatusesFilter([]); }} 
            className="h-7 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Effacer {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''}
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
                <TableHead className="hidden lg:table-cell">
                  <ColumnFilterPopover
                    label="Apporteur"
                    options={allApporteurs}
                    selected={filters.apporteurs}
                    onSelectionChange={setApporteursFilter}
                  />
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <ColumnFilterPopover
                    label="Ville"
                    options={allVilles}
                    selected={filters.villes}
                    onSelectionChange={setVillesFilter}
                  />
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <ColumnFilterPopover
                    label="Univers"
                    options={allUnivers}
                    selected={filters.univers}
                    onSelectionChange={setUniversFilter}
                  />
                </TableHead>
                <TableHead>
                  <ColumnFilterPopover
                    label="Statut"
                    options={allStatuses}
                    selected={filters.statuses}
                    onSelectionChange={setStatusesFilter}
                  />
                </TableHead>
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
                    Aucun dossier trouvé pour ce filtre
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
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                          STATE_BADGE_COLORS[d.projectState] || "bg-muted text-muted-foreground"
                        )}>
                          {d.projectStateLabel}
                        </span>
                        {d.hasPlannedIntervention && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                            <CalendarCheck className="w-3 h-3" />
                            Planifié{d.plannedInterventionType ? ` ${d.plannedInterventionType}` : ''}
                          </span>
                        )}
                      </div>
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
