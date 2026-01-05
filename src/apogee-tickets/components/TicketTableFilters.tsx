/**
 * Filtres horizontaux pour la vue Liste des tickets
 */

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, CalendarIcon, Filter, RotateCcw, Tag } from 'lucide-react';
import { endOfDay, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ApogeeModule, ApogeeTicketStatus, TicketFilters, OwnerSide, ReportedBy } from '../types';

interface TicketTableFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  modules: ApogeeModule[];
  statuses: ApogeeTicketStatus[];
}

const OWNER_SIDES: { value: OwnerSide; label: string }[] = [
  { value: 'HC', label: 'HC' },
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'PARTAGE', label: 'Partagé' },
];

const REPORTED_BY_OPTIONS: { value: ReportedBy; label: string }[] = [
  { value: 'JEROME', label: 'Jérôme' },
  { value: 'FLORIAN', label: 'Florian' },
  { value: 'ERIC', label: 'Eric' },
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'AUTRE', label: 'Autre' },
];

const DEFAULT_TAGS = ['BUG', 'EVO', 'NTH'];

type DateRange = { from?: Date; to?: Date };

function safeDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function isActiveFilterValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function TicketTableFilters({
  filters,
  onFiltersChange,
  modules,
  statuses,
}: TicketTableFiltersProps) {
  // États locaux synchronisés avec les filtres persistés
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [heatRange, setHeatRange] = useState<[number, number]>([
    filters.heat_priority_min ?? 0,
    filters.heat_priority_max ?? 12,
  ]);

  // Modules (multi)
  const [selectedModules, setSelectedModules] = useState<string[]>(
    filters.modules ?? (filters.module ? [filters.module] : [])
  );

  // Statuts (multi)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(filters.kanban_statuses ?? []);

  // Date de création
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: safeDate(filters.created_at_from),
    to: safeDate(filters.created_at_to),
  }));

  const [selectedTags, setSelectedTags] = useState<string[]>(filters.tags || []);

  // Synchroniser les états locaux quand les filtres persistés changent (ex: rechargement page)
  useEffect(() => {
    setLocalSearch(filters.search || '');
    setHeatRange([filters.heat_priority_min ?? 0, filters.heat_priority_max ?? 12]);
    setSelectedModules(filters.modules ?? (filters.module ? [filters.module] : []));
    setSelectedStatuses(filters.kanban_statuses ?? []);
    setSelectedTags(filters.tags || []);
    setDateRange({
      from: safeDate(filters.created_at_from),
      to: safeDate(filters.created_at_to),
    });
  }, [
    filters.search,
    filters.heat_priority_min,
    filters.heat_priority_max,
    filters.module,
    filters.modules,
    filters.kanban_statuses,
    filters.tags,
    filters.created_at_from,
    filters.created_at_to,
  ]);

  const handleSearchSubmit = () => {
    onFiltersChange({ ...filters, search: localSearch || undefined });
  };

  const handleModuleToggle = (moduleId: string) => {
    const newModules = selectedModules.includes(moduleId)
      ? selectedModules.filter((m) => m !== moduleId)
      : [...selectedModules, moduleId];

    setSelectedModules(newModules);

    onFiltersChange({
      ...filters,
      modules: newModules.length > 0 ? newModules : undefined,
      // compat pour affichages/anciennes clés
      module: newModules.length === 1 ? newModules[0] : undefined,
    });
  };

  const handleStatusToggle = (statusId: string) => {
    const newStatuses = selectedStatuses.includes(statusId)
      ? selectedStatuses.filter((s) => s !== statusId)
      : [...selectedStatuses, statusId];

    setSelectedStatuses(newStatuses);

    onFiltersChange({
      ...filters,
      kanban_statuses: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const handleHeatRangeChange = (values: number[]) => {
    setHeatRange([values[0], values[1]]);
  };

  const handleHeatRangeCommit = () => {
    onFiltersChange({
      ...filters,
      heat_priority_min: heatRange[0] > 0 ? heatRange[0] : undefined,
      heat_priority_max: heatRange[1] < 12 ? heatRange[1] : undefined,
    });
  };

  const handleOwnerSideChange = (value: string) => {
    onFiltersChange({
      ...filters,
      owner_side: value === 'all' ? undefined : (value as OwnerSide),
    });
  };

  const handleReportedByChange = (value: string) => {
    onFiltersChange({
      ...filters,
      reported_by: value === 'all' ? undefined : (value as ReportedBy),
    });
  };

  const handleQualifiedChange = (value: string) => {
    onFiltersChange({
      ...filters,
      is_qualified: value === 'all' ? undefined : value === 'yes',
    });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(newTags);
    onFiltersChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
  };

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);

    const from = range.from ? startOfDay(range.from) : undefined;
    const to = range.to ? endOfDay(range.to) : range.from ? endOfDay(range.from) : undefined;

    onFiltersChange({
      ...filters,
      created_at_from: from ? from.toISOString() : undefined,
      created_at_to: to ? to.toISOString() : undefined,
    });
  };

  const handleReset = () => {
    setLocalSearch('');
    setHeatRange([0, 12]);
    setSelectedModules([]);
    setSelectedStatuses([]);
    setDateRange({});
    setSelectedTags([]);
    onFiltersChange({});
  };

  const removeFilter = (key: keyof TicketFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];

    if (key === 'modules' || key === 'module') {
      setSelectedModules([]);
      delete newFilters.modules;
      delete newFilters.module;
    }

    if (key === 'kanban_statuses') {
      setSelectedStatuses([]);
    }

    if (key === 'created_at_from' || key === 'created_at_to') {
      setDateRange({});
      delete newFilters.created_at_from;
      delete newFilters.created_at_to;
    }

    if (key === 'heat_priority_min' || key === 'heat_priority_max') setHeatRange([0, 12]);
    if (key === 'search') setLocalSearch('');

    onFiltersChange(newFilters);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([, v]) => isActiveFilterValue(v)).length;
  }, [filters]);

  const shownModuleIds = filters.modules ?? (filters.module ? [filters.module] : []);

  return (
    <div className="space-y-3">
      {/* Barre de filtres principale */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            onBlur={handleSearchSubmit}
            className="pl-9 h-9"
          />
        </div>

        {/* Modules (multi-select) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-2" />
              Module
              {selectedModules.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5">
                  {selectedModules.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-background z-50" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium">Modules</div>
              <div className="space-y-1 max-h-[240px] overflow-auto">
                {modules.map((mod) => (
                  <label
                    key={mod.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={selectedModules.includes(mod.id)}
                      onCheckedChange={() => handleModuleToggle(mod.id)}
                    />
                    <span className="text-sm">{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Statut (multi-select) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              Statut
              {selectedStatuses.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5">
                  {selectedStatuses.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-background z-50" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium">Statuts</div>
              <div className="space-y-1 max-h-[240px] overflow-auto">
                {statuses.map((status) => (
                  <label
                    key={status.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={selectedStatuses.includes(status.id)}
                      onCheckedChange={() => handleStatusToggle(status.id)}
                    />
                    <span className="text-sm">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* PEC */}
        <Select value={filters.owner_side || 'all'} onValueChange={handleOwnerSideChange}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue placeholder="PEC" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Tous PEC</SelectItem>
            {OWNER_SIDES.map((os) => (
              <SelectItem key={os.value} value={os.value}>
                {os.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origine */}
        <Select value={filters.reported_by || 'all'} onValueChange={handleReportedByChange}>
          <SelectTrigger className="w-[110px] h-9">
            <SelectValue placeholder="Origine" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Tous</SelectItem>
            {REPORTED_BY_OPTIONS.map((rb) => (
              <SelectItem key={rb.value} value={rb.value}>
                {rb.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priorité slider */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              Priorité {heatRange[0]}-{heatRange[1]}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-background z-50" align="start">
            <div className="space-y-4">
              <div className="text-sm font-medium">Priorité thermique</div>
              <Slider
                value={heatRange}
                onValueChange={handleHeatRangeChange}
                onValueCommit={handleHeatRangeCommit}
                min={0}
                max={12}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>❄️ {heatRange[0]}</span>
                <span>🔥 {heatRange[1]}</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Qualifié */}
        <Select
          value={filters.is_qualified === undefined ? 'all' : filters.is_qualified ? 'yes' : 'no'}
          onValueChange={handleQualifiedChange}
        >
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Qualifié" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="yes">✓ Qualifiés</SelectItem>
            <SelectItem value="no">Non qualifiés</SelectItem>
          </SelectContent>
        </Select>

        {/* Tags */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Tag className="h-4 w-4 mr-2" />
              Tags
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-background z-50" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium">Tags</div>
              <div className="space-y-1">
                {DEFAULT_TAGS.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox checked={selectedTags.includes(tag)} onCheckedChange={() => handleTagToggle(tag)} />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateRange.from ? format(dateRange.from, 'dd/MM', { locale: fr }) : 'Date'}
              {dateRange.to && ` - ${format(dateRange.to, 'dd/MM', { locale: fr })}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => handleDateChange({ from: range?.from, to: range?.to })}
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        {/* Reset */}
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Badges des filtres actifs */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Recherche: {filters.search}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('search')} />
            </Badge>
          )}

          {shownModuleIds.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Module{shownModuleIds.length > 1 ? 's' : ''}: {shownModuleIds
                .map((id) => modules.find((m) => m.id === id)?.label || id)
                .join(', ')}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('modules')} />
            </Badge>
          )}

          {(filters.kanban_statuses && filters.kanban_statuses.length > 0) && (
            <Badge variant="secondary" className="gap-1">
              Statut{filters.kanban_statuses.length > 1 ? 's' : ''}: {filters.kanban_statuses
                .map((id) => statuses.find((s) => s.id === id)?.label || id)
                .join(', ')}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('kanban_statuses')} />
            </Badge>
          )}

          {filters.owner_side && (
            <Badge variant="secondary" className="gap-1">
              PEC: {filters.owner_side}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('owner_side')} />
            </Badge>
          )}

          {filters.reported_by && (
            <Badge variant="secondary" className="gap-1">
              Origine: {filters.reported_by}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('reported_by')} />
            </Badge>
          )}

          {(filters.heat_priority_min !== undefined || filters.heat_priority_max !== undefined) && (
            <Badge variant="secondary" className="gap-1">
              Priorité: {filters.heat_priority_min ?? 0}-{filters.heat_priority_max ?? 12}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  removeFilter('heat_priority_min');
                  removeFilter('heat_priority_max');
                }}
              />
            </Badge>
          )}

          {filters.is_qualified !== undefined && (
            <Badge variant="secondary" className="gap-1">
              {filters.is_qualified ? 'Qualifiés' : 'Non qualifiés'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('is_qualified')} />
            </Badge>
          )}

          {(filters.created_at_from || filters.created_at_to) && (
            <Badge variant="secondary" className="gap-1">
              Date: {dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: fr }) : '—'}
              {dateRange.to ? ` - ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}` : ''}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  removeFilter('created_at_from');
                  removeFilter('created_at_to');
                }}
              />
            </Badge>
          )}

          {filters.tags && filters.tags.length > 0 &&
            filters.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                Tag: {tag}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    const newTags = selectedTags.filter((t) => t !== tag);
                    setSelectedTags(newTags);
                    onFiltersChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
                  }}
                />
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}
