/**
 * Filtres pour les tickets Apogée
 * Inclut: recherche, module, origine, qualification IA, PEC et nouveaux messages
 */

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Tag, Filter, MessageSquare, RotateCcw, LayoutGrid, ClipboardCheck, Users } from 'lucide-react';
import type { ApogeeModule, ApogeePriority, ApogeeOwnerSide, TicketFilters as Filters, ReportedBy, MissingFieldFilter } from '../types';
import { useTicketTags } from '../hooks/useTicketTags';

// Options pour Origine (ReportedBy) - triées alphabétiquement
const ORIGINE_OPTIONS: { value: ReportedBy; label: string }[] = [
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'AUTRE', label: 'Autre' },
  { value: 'ERIC', label: 'Éric' },
  { value: 'FLORIAN', label: 'Florian' },
  { value: 'JEROME', label: 'Jérôme' },
];


interface TicketFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  // New props for PEC and blinking
  ownerSides?: ApogeeOwnerSide[];
  selectedPEC?: Set<string>;
  onTogglePEC?: (pecId: string) => void;
  onClearPEC?: () => void;
  blinkingTicketsCount?: number;
  filterBlinkingOnly?: boolean;
  onToggleBlinkingFilter?: () => void;
  // Reset all filters + UI state
  onResetAll?: () => void;
  hasActiveUIState?: boolean;
}

export function TicketFilters({ 
  filters, 
  onFiltersChange, 
  modules, 
  priorities,
  ownerSides = [],
  selectedPEC = new Set(),
  onTogglePEC,
  onClearPEC,
  blinkingTicketsCount = 0,
  filterBlinkingOnly = false,
  onToggleBlinkingFilter,
  onResetAll,
  hasActiveUIState = false,
}: TicketFiltersProps) {
  const { tags, getTagColor } = useTicketTags();

  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');
  
  // Compte les filtres actifs en plus de la recherche
  const activeFiltersCount = Object.entries(filters).filter(([key, v]) => 
    key !== 'search' && v !== undefined && v !== ''
  ).length;
  
  const hasSearchAndFilters = filters.search && filters.search.length > 0 && activeFiltersCount > 0;
  const filterWarningText = activeFiltersCount === 1 
    ? "Attention, un filtre est activé" 
    : `Attention, ${activeFiltersCount} filtres sont activés`;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      {/* Ligne 1: Filtres principaux + PEC + Nouveaux messages */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Recherche */}
        <div className="relative w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
          {hasSearchAndFilters && (
            <p className="absolute -bottom-5 left-0 text-[11px] text-destructive">
              ⚠ {filterWarningText}
            </p>
          )}
        </div>

        {/* Module - multi-select avec checkboxes */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[160px] justify-between">
              <span className="flex items-center gap-1.5 truncate">
                <LayoutGrid className="h-4 w-4 shrink-0" />
                {filters.modules && filters.modules.length > 0 
                  ? filters.modules.length === 1
                    ? modules.find(m => m.id === filters.modules![0])?.label || 'Module'
                    : `${filters.modules.length} modules`
                  : 'Module'}
              </span>
              {filters.modules && filters.modules.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {filters.modules.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-background z-50" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Modules</span>
                {filters.modules && filters.modules.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={() => updateFilter('modules', undefined)}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {[...modules].filter(m => m.id).sort((a, b) => a.label.localeCompare(b.label, 'fr')).map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.modules?.includes(m.id) || false}
                      onCheckedChange={(checked) => {
                        const currentModules = filters.modules || [];
                        const newModules = checked
                          ? [...currentModules, m.id]
                          : currentModules.filter((mod) => mod !== m.id);
                        updateFilter('modules', newModules.length > 0 ? newModules : undefined);
                      }}
                    />
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Origine - multi-select avec checkboxes */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[160px] justify-between">
              <span className="flex items-center gap-1.5 truncate">
                <Users className="h-4 w-4 shrink-0" />
                {filters.origins && filters.origins.length > 0 
                  ? filters.origins.length === 1
                    ? ORIGINE_OPTIONS.find(o => o.value === filters.origins![0])?.label || 'Origine'
                    : `${filters.origins.length} origines`
                  : 'Origine'}
              </span>
              {filters.origins && filters.origins.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {filters.origins.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-background z-50" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Origines</span>
                {filters.origins && filters.origins.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={() => updateFilter('origins', undefined)}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {ORIGINE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.origins?.includes(opt.value) || false}
                      onCheckedChange={(checked) => {
                        const currentOrigins = filters.origins || [];
                        const newOrigins = checked
                          ? [...currentOrigins, opt.value]
                          : currentOrigins.filter((o) => o !== opt.value);
                        updateFilter('origins', newOrigins.length > 0 ? newOrigins : undefined);
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Tags Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Tag className="h-4 w-4 mr-2" />
              Tags
              {filters.tags && filters.tags.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filters.tags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-background z-50" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium">Filtrer par tag</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.tags?.includes(tag.id) || false}
                      onCheckedChange={(checked) => {
                        const currentTags = filters.tags || [];
                        const newTags = checked
                          ? [...currentTags, tag.id]
                          : currentTags.filter((t) => t !== tag.id);
                        updateFilter('tags', newTags.length > 0 ? newTags : undefined);
                      }}
                    />
                    <span className="text-sm">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Complétude - champs manquants avec checkboxes */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[170px] justify-between">
              <span className="flex items-center gap-1.5 truncate">
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                {filters.missing_field 
                  ? filters.missing_field === 'complete' ? 'Complets'
                    : filters.missing_field === 'incomplete' ? 'Incomplets'
                    : filters.missing_field === 'no_module' ? 'Sans module'
                    : filters.missing_field === 'no_heat' ? 'Sans priorité'
                    : filters.missing_field === 'no_hours' ? 'Sans heures'
                    : filters.missing_field === 'no_description' ? 'Sans description'
                    : 'Complétude'
                  : 'Complétude'}
              </span>
              {filters.missing_field && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">1</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 bg-background z-50" align="start">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filtrer par complétude</span>
                {filters.missing_field && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateFilter('missing_field', undefined)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Réinitialiser
                  </Button>
                )}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {[
                  { value: 'complete', label: '✓ Complets' },
                  { value: 'incomplete', label: '⚠ Incomplets (tous)' },
                  { value: 'no_module', label: 'Module manquant' },
                  { value: 'no_heat', label: 'Priorité manquante' },
                  { value: 'no_hours', label: 'Heures manquantes' },
                  { value: 'no_description', label: 'Description manquante' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.missing_field === opt.value}
                      onCheckedChange={(checked) => {
                        updateFilter('missing_field', checked ? opt.value as MissingFieldFilter : undefined);
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Separator visual */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Filtre P.E.C */}
        {ownerSides.length > 0 && onTogglePEC && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`gap-2 ${selectedPEC.size > 0 ? 'border-helpconfort-blue text-helpconfort-blue' : ''}`}>
                <Filter className="h-4 w-4" />
                P.E.C
                {selectedPEC.size > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-helpconfort-blue/20 text-helpconfort-blue">
                    {selectedPEC.size}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 bg-background z-50">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">P.E.C</span>
                  {selectedPEC.size > 0 && onClearPEC && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClearPEC}>
                      Réinitialiser
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  {ownerSides.map((pec) => (
                    <label
                      key={pec.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <Checkbox
                        checked={selectedPEC.has(pec.id)}
                        onCheckedChange={() => onTogglePEC(pec.id)}
                      />
                      <span className="text-sm">{pec.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Nouveaux messages */}
        {onToggleBlinkingFilter && (
          <button
            onClick={onToggleBlinkingFilter}
            className={`text-sm flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              filterBlinkingOnly 
                ? 'bg-helpconfort-blue/10 text-helpconfort-blue font-medium' 
                : blinkingTicketsCount > 0
                  ? 'text-green-600 animate-pulse font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <MessageSquare className={`w-3.5 h-3.5 ${blinkingTicketsCount > 0 && !filterBlinkingOnly ? 'text-green-600' : ''}`} />
            Nouveaux
            {blinkingTicketsCount > 0 && (
              <Badge variant="secondary" className={`text-xs px-1.5 ${filterBlinkingOnly ? 'bg-helpconfort-blue/20 text-helpconfort-blue' : 'bg-green-100 text-green-700 animate-pulse'}`}>
                {blinkingTicketsCount}
              </Badge>
            )}
          </button>
        )}

        {/* R.A.Z. tous les filtres */}
        {onResetAll && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onResetAll}
            disabled={!hasActiveFilters && !hasActiveUIState}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            R.A.Z.
          </Button>
        )}
      </div>

    </div>
  );
}
