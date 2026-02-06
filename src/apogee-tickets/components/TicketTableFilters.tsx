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
import { Search, X, CalendarIcon, Filter, RotateCcw, Tag, MapIcon } from 'lucide-react';
import { FilterPresetSelector } from './FilterPresetSelector';
import { endOfDay, format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ApogeeModule, ApogeeTicketStatus, TicketFilters, OwnerSide, ReportedBy } from '../types';
import { useTicketTags } from '../hooks/useTicketTags';

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
  { value: 'ERIC', label: 'Éric' },
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'AUTRE', label: 'Autre' },
];

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
  // Hook pour récupérer les tags dynamiques depuis la base
  const { tags: availableTags } = useTicketTags();
  
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

  const handleSelectAllStatuses = () => {
    const allSelected = selectedStatuses.length === statuses.length;
    const newStatuses = allSelected ? [] : statuses.map((s) => s.id);
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
      {/* Barre de filtres principale - Style Warm Pastel ludique */}
      <div className="flex flex-wrap items-center gap-2.5 bg-gradient-to-r from-sky-50/50 via-rose-50/30 to-amber-50/40 dark:from-slate-800/30 dark:via-slate-800/20 dark:to-slate-800/30 rounded-[20px] px-4 py-3 shadow-sm border border-sky-100/40 dark:border-slate-700/30">
        {/* Recherche - Style pilule douce */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-800/30 flex items-center justify-center">
            <Search className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
          </div>
          <Input
            placeholder="Rechercher un ticket..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            onBlur={handleSearchSubmit}
            className="pl-12 h-10 rounded-full border-sky-100/60 dark:border-slate-600/40 bg-white/70 dark:bg-slate-800/50 shadow-inner focus:border-sky-200 focus:ring-sky-100/50 placeholder:text-slate-400"
          />
        </div>

        {/* Séparateur visuel doux */}
        <div className="h-6 w-px bg-gradient-to-b from-transparent via-slate-200/60 to-transparent dark:via-slate-600/40 mx-1" />

        {/* Modules (multi-select) */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-full bg-white/60 dark:bg-slate-800/40 border border-violet-100/60 dark:border-violet-800/30 text-violet-600 dark:text-violet-400 hover:bg-violet-50/80 dark:hover:bg-violet-900/30 hover:border-violet-200 transition-all shadow-sm">
              <Filter className="h-3.5 w-3.5" />
              <span>Module</span>
              {selectedModules.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-xs font-semibold bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 rounded-full">
                  {selectedModules.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 rounded-2xl border-violet-100/50 dark:border-violet-800/30 shadow-lg" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium text-violet-700 dark:text-violet-300">Modules</div>
              <div className="space-y-1 max-h-[240px] overflow-auto">
                {modules.map((mod) => (
                  <label
                    key={mod.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-violet-50/60 dark:hover:bg-violet-900/30 rounded-xl px-2.5 py-2 transition-colors"
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
            <button className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-full bg-white/60 dark:bg-slate-800/40 border border-sky-100/60 dark:border-sky-800/30 text-sky-600 dark:text-sky-400 hover:bg-sky-50/80 dark:hover:bg-sky-900/30 hover:border-sky-200 transition-all shadow-sm">
              <span>Statut</span>
              {selectedStatuses.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-xs font-semibold bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 rounded-full">
                  {selectedStatuses.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 rounded-2xl border-sky-100/50 dark:border-sky-800/30 shadow-lg" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-sky-700 dark:text-sky-300">Statuts</span>
                <button
                  className="h-6 text-xs px-2.5 rounded-full bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 transition-colors"
                  onClick={handleSelectAllStatuses}
                >
                  {selectedStatuses.length === statuses.length ? 'Tout décocher' : 'Tout cocher'}
                </button>
              </div>
              <div className="space-y-1 max-h-[240px] overflow-auto">
                {statuses.map((status) => (
                  <label
                    key={status.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-sky-50/60 dark:hover:bg-sky-900/30 rounded-xl px-2.5 py-2 transition-colors"
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
          <SelectTrigger className="w-[105px] h-9 rounded-full border-teal-100/60 dark:border-teal-800/30 bg-white/60 dark:bg-slate-800/40 text-teal-600 dark:text-teal-400 hover:bg-teal-50/80 transition-all shadow-sm text-sm font-medium">
            <span>{filters.owner_side ? OWNER_SIDES.find(os => os.value === filters.owner_side)?.label || 'P.E.C.' : 'P.E.C.'}</span>
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 rounded-2xl border-teal-100/50 shadow-lg">
            <SelectItem value="all" className="rounded-xl">Tous</SelectItem>
            {OWNER_SIDES.map((os) => (
              <SelectItem key={os.value} value={os.value} className="rounded-xl">
                {os.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origine */}
        <Select value={filters.reported_by || 'all'} onValueChange={handleReportedByChange}>
          <SelectTrigger className="w-[115px] h-9 rounded-full border-amber-100/60 dark:border-amber-800/30 bg-white/60 dark:bg-slate-800/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50/80 transition-all shadow-sm text-sm font-medium">
            <span>{filters.reported_by ? REPORTED_BY_OPTIONS.find(rb => rb.value === filters.reported_by)?.label || 'Origine' : 'Origine'}</span>
          </SelectTrigger>
          <SelectContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 rounded-2xl border-amber-100/50 shadow-lg">
            <SelectItem value="all" className="rounded-xl">Tous</SelectItem>
            {REPORTED_BY_OPTIONS.map((rb) => (
              <SelectItem key={rb.value} value={rb.value} className="rounded-xl">
                {rb.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priorité slider */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-full bg-white/60 dark:bg-slate-800/40 border border-rose-100/60 dark:border-rose-800/30 text-rose-500 dark:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-900/30 hover:border-rose-200 transition-all shadow-sm">
              <span>🎯 {heatRange[0]}-{heatRange[1]}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 rounded-2xl border-rose-100/50 shadow-lg" align="start">
            <div className="space-y-4 p-1">
              <div className="text-sm font-medium text-rose-600 dark:text-rose-400">Priorité thermique</div>
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


        {/* Tags */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-full bg-white/60 dark:bg-slate-800/40 border border-pink-100/60 dark:border-pink-800/30 text-pink-500 dark:text-pink-400 hover:bg-pink-50/80 dark:hover:bg-pink-900/30 hover:border-pink-200 transition-all shadow-sm">
              <Tag className="h-3.5 w-3.5" />
              <span>Tags</span>
              {selectedTags.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-xs font-semibold bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300 rounded-full">
                  {selectedTags.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 rounded-2xl border-pink-100/50 shadow-lg" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium text-pink-600 dark:text-pink-400">Tags</div>
              <div className="space-y-1">
                {availableTags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-pink-50/60 dark:hover:bg-pink-900/30 rounded-xl px-2.5 py-2 transition-colors"
                  >
                    <Checkbox checked={selectedTags.includes(tag.id)} onCheckedChange={() => handleTagToggle(tag.id)} />
                    <span className="text-sm">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Roadmap */}
        <button
          className={`inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-full transition-all shadow-sm ${
            filters.roadmap_only 
              ? 'bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' 
              : 'bg-white/60 dark:bg-slate-800/40 border border-indigo-100/60 dark:border-indigo-800/30 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50/80'
          }`}
          onClick={() => onFiltersChange({ ...filters, roadmap_only: !filters.roadmap_only })}
        >
          <MapIcon className="h-3.5 w-3.5" />
          <span>Roadmap</span>
        </button>

        {/* Date */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-full bg-white/60 dark:bg-slate-800/40 border border-cyan-100/60 dark:border-cyan-800/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50/80 dark:hover:bg-cyan-900/30 hover:border-cyan-200 transition-all shadow-sm">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>
                {dateRange.from ? format(dateRange.from, 'dd/MM', { locale: fr }) : 'Date'}
                {dateRange.to && ` - ${format(dateRange.to, 'dd/MM', { locale: fr })}`}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 rounded-2xl border-cyan-100/50 shadow-lg" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => handleDateChange({ from: range?.from, to: range?.to })}
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        {/* Séparateur */}
        <div className="h-6 w-px bg-gradient-to-b from-transparent via-slate-200/60 to-transparent dark:via-slate-600/40 mx-1" />

        {/* Preset selector - Mes filtres sauvegardés */}
        <FilterPresetSelector
          currentFilters={filters}
          onLoadPreset={onFiltersChange}
          hasActiveFilters={activeFiltersCount > 0}
        />

        {/* Reset */}
        {activeFiltersCount > 0 && (
          <button 
            className="h-9 w-9 rounded-full flex items-center justify-center bg-rose-50/80 dark:bg-rose-900/30 border border-rose-200/60 dark:border-rose-800/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-sm" 
            onClick={handleReset}
            title="Réinitialiser les filtres"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Badges des filtres actifs - Style Warm */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              Recherche: {filters.search}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter('search')} />
            </Badge>
          )}

          {shownModuleIds.length > 0 && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              Module{shownModuleIds.length > 1 ? 's' : ''}: {shownModuleIds
                .map((id) => modules.find((m) => m.id === id)?.label || id)
                .join(', ')}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter('modules')} />
            </Badge>
          )}

          {(filters.kanban_statuses && filters.kanban_statuses.length > 0) && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              Statut{filters.kanban_statuses.length > 1 ? 's' : ''}: {filters.kanban_statuses
                .map((id) => statuses.find((s) => s.id === id)?.label || id)
                .join(', ')}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter('kanban_statuses')} />
            </Badge>
          )}

          {filters.owner_side && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              PEC: {filters.owner_side}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter('owner_side')} />
            </Badge>
          )}

          {filters.reported_by && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              Origine: {filters.reported_by}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter('reported_by')} />
            </Badge>
          )}

          {(filters.heat_priority_min !== undefined || filters.heat_priority_max !== undefined) && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              Priorité: {filters.heat_priority_min ?? 0}-{filters.heat_priority_max ?? 12}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  removeFilter('heat_priority_min');
                  removeFilter('heat_priority_max');
                }}
              />
            </Badge>
          )}

          {filters.is_qualified !== undefined && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              {filters.is_qualified ? 'Qualifiés' : 'Non qualifiés'}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter('is_qualified')} />
            </Badge>
          )}

          {(filters.created_at_from || filters.created_at_to) && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              Date: {dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: fr }) : '—'}
              {dateRange.to ? ` - ${format(dateRange.to, 'dd/MM/yyyy', { locale: fr })}` : ''}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  removeFilter('created_at_from');
                  removeFilter('created_at_to');
                }}
              />
            </Badge>
          )}

          {filters.tags && filters.tags.length > 0 &&
            filters.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
                Tag: {tag}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => {
                    const newTags = selectedTags.filter((t) => t !== tag);
                    setSelectedTags(newTags);
                    onFiltersChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
                  }}
                />
              </Badge>
            ))}

          {filters.roadmap_only && (
            <Badge variant="secondary" className="gap-1 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              <MapIcon className="h-3 w-3" />
              Roadmap
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => onFiltersChange({ ...filters, roadmap_only: undefined })} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
