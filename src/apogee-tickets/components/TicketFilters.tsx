/**
 * Filtres pour les tickets Apogée
 * Inclut: recherche, module, origine, qualification IA, slider priorité avec pastilles, PEC et nouveaux messages
 */

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, Snowflake, Flame, Tag, Filter, MessageSquare } from 'lucide-react';
import type { ApogeeModule, ApogeePriority, ApogeeOwnerSide, TicketFilters as Filters, ReportedBy, MissingFieldFilter } from '../types';
import { cn } from '@/lib/utils';
import { useTicketTags } from '../hooks/useTicketTags';

// Couleurs pour le gradient du slider (bleu glacé -> rouge feu)
const getHeatColor = (priority: number): string => {
  const p = Math.max(0, Math.min(12, priority));
  if (p <= 6) {
    // Bleu glacé (200) -> Jaune/Orange (40)
    const hue = 200 - (p * 26.67);
    const sat = 80 + (p * 1.67);
    const light = 70 - (p * 3.33);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  } else {
    // Jaune/Orange -> Rouge feu
    const t = p - 6;
    const hue = 40 - (t * 6.67);
    const sat = 90;
    const light = 50 - (t * 3.33);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
};

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

  // Valeurs du slider range (min et max)
  const heatMin = filters.heat_priority_min ?? 0;
  const heatMax = filters.heat_priority_max ?? 12;
  const exactPriority = filters.heat_priority_exact;
  
  // Vérifie si on a un filtre de priorité actif
  const hasPriorityFilter = exactPriority !== undefined || heatMin > 0 || heatMax < 12;

  const handleRangeChange = (values: number[]) => {
    const [min, max] = values;
    onFiltersChange({
      ...filters,
      heat_priority_min: min,
      heat_priority_max: max,
      heat_priority_exact: undefined, // Clear exact when using range
    });
  };

  const handleDotClick = (level: number) => {
    if (exactPriority === level) {
      // Si on clique sur la même pastille, on désactive le filtre exact
      onFiltersChange({
        ...filters,
        heat_priority_exact: undefined,
      });
    } else {
      // Filtre sur cette priorité exacte
      onFiltersChange({
        ...filters,
        heat_priority_exact: level,
        heat_priority_min: 0,
        heat_priority_max: 12,
      });
    }
  };

  const clearPriorityFilter = () => {
    onFiltersChange({
      ...filters,
      heat_priority_min: undefined,
      heat_priority_max: undefined,
      heat_priority_exact: undefined,
    });
  };

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

        {/* Module */}
        <Select
          value={filters.module || 'all'}
          onValueChange={(v) => updateFilter('module', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Tous modules</SelectItem>
            {[...modules].filter(m => m.id).sort((a, b) => a.label.localeCompare(b.label, 'fr')).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origine */}
        <Select
          value={filters.reported_by || 'all'}
          onValueChange={(v) => updateFilter('reported_by', v === 'all' ? undefined : v as ReportedBy)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Origine" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Toutes origines</SelectItem>
            {ORIGINE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        {/* Complétude - champs manquants */}
        <Select
          value={filters.missing_field || 'all'}
          onValueChange={(v) => updateFilter('missing_field', v === 'all' ? undefined : v as MissingFieldFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Complétude" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">Toute complétude</SelectItem>
            <SelectItem value="complete">✓ Complets</SelectItem>
            <SelectItem value="incomplete">⚠ Incomplets (tous)</SelectItem>
            <SelectItem value="no_module">Module manquant</SelectItem>
            <SelectItem value="no_heat">Priorité manquante</SelectItem>
            <SelectItem value="no_hours">Heures manquantes</SelectItem>
            <SelectItem value="no_description">Description manquante</SelectItem>
          </SelectContent>
        </Select>

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

        {/* Reset filters - highly visible when active */}
        {hasActiveFilters && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={clearFilters}
            className="animate-pulse hover:animate-none"
          >
            <X className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Ligne 2: Filtre priorité compact */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Priorité</span>
          {hasPriorityFilter && (
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={clearPriorityFilter}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Double slider compact */}
        <div className="flex items-center gap-2 max-w-[280px]">
          <Snowflake className="h-3 w-3 shrink-0" style={{ color: getHeatColor(0) }} />
          
          <div className="flex-1 px-1">
            <Slider
              min={0}
              max={12}
              step={1}
              value={exactPriority !== undefined ? [exactPriority, exactPriority] : [heatMin, heatMax]}
              onValueChange={handleRangeChange}
              className="w-full"
              trackClassName="bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500"
              rangeClassName="bg-white/30"
            />
          </div>
          
          <Flame 
            className={cn(
              "h-3 w-3 shrink-0 transition-all",
              (heatMax >= 10 || exactPriority !== undefined && exactPriority >= 10) && 'animate-pulse'
            )} 
            style={{ color: getHeatColor(12) }} 
          />
        </div>

        {/* Pastilles de priorité compactes (0-12) */}
        <div className="flex items-center justify-between max-w-[280px] px-4">
          {Array.from({ length: 13 }, (_, i) => {
            const isSelected = exactPriority === i;
            const isInRange = exactPriority === undefined && i >= heatMin && i <= heatMax;
            
            return (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className={cn(
                  "w-3.5 h-3.5 rounded-full transition-all duration-200 border",
                  "hover:scale-125 hover:shadow-lg cursor-pointer",
                  isSelected && "ring-1 ring-offset-1 ring-foreground scale-110",
                  !isSelected && !isInRange && "opacity-30"
                )}
                style={{
                  backgroundColor: getHeatColor(i),
                  borderColor: isSelected ? 'hsl(var(--foreground))' : 'transparent',
                }}
                title={`Priorité ${i}`}
              />
            );
          })}
        </div>
        
        {/* Indicateur de sélection */}
        {hasPriorityFilter && (
          <div className="text-center text-xs text-muted-foreground">
            {exactPriority !== undefined 
              ? `Priorité exacte: ${exactPriority}`
              : `Plage: ${heatMin} - ${heatMax}`
            }
          </div>
        )}
      </div>
    </div>
  );
}
