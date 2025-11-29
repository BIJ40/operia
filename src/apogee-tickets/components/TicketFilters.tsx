/**
 * Filtres pour les tickets Apogée
 * Inclut: recherche, module, TAG, origine, qualification IA, et slider priorité avec pastilles
 */

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Search, X, Snowflake, Flame } from 'lucide-react';
import type { ApogeeModule, ApogeePriority, ApogeeImpactTag, TicketFilters as Filters, OwnerSide } from '../types';
import { cn } from '@/lib/utils';

interface TicketFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  impactTags: ApogeeImpactTag[];
}

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

// Options pour Origine
const ORIGINE_OPTIONS: { value: OwnerSide; label: string }[] = [
  { value: 'JEROME', label: 'Jérôme' },
  { value: 'FLORIAN', label: 'Florian' },
  { value: 'ERIC', label: 'Éric' },
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'AUTRE', label: 'Autre' },
];

export function TicketFilters({ filters, onFiltersChange, modules, priorities, impactTags }: TicketFiltersProps) {
  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

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
      {/* Ligne 1: Filtres principaux */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Module */}
        <Select
          value={filters.module || 'all'}
          onValueChange={(v) => updateFilter('module', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous modules</SelectItem>
            {modules.filter(m => m.id).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* TAG d'impact */}
        <Select
          value={filters.impact_tag || 'all'}
          onValueChange={(v) => updateFilter('impact_tag', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tag impact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous tags</SelectItem>
            {impactTags.filter(tag => tag.id).map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origine */}
        <Select
          value={filters.owner_side || 'all'}
          onValueChange={(v) => updateFilter('owner_side', v === 'all' ? undefined : v as OwnerSide)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Origine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes origines</SelectItem>
            {ORIGINE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Qualification IA */}
        <Select
          value={filters.is_qualified === undefined ? 'all' : filters.is_qualified ? 'qualified' : 'unqualified'}
          onValueChange={(v) => updateFilter('is_qualified', v === 'all' ? undefined : v === 'qualified')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Qualification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="qualified">✓ Qualifiés IA</SelectItem>
            <SelectItem value="unqualified">À qualifier</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
      </div>

      {/* Ligne 2: Filtre priorité avec double curseur et pastilles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Priorité</span>
          {hasPriorityFilter && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearPriorityFilter}>
              <X className="h-3 w-3 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
        
        {/* Double slider */}
        <div className="flex items-center gap-4">
          <Snowflake className="h-4 w-4 shrink-0" style={{ color: getHeatColor(0) }} />
          
          <div className="flex-1 px-2">
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
              "h-4 w-4 shrink-0 transition-all",
              (heatMax >= 10 || exactPriority !== undefined && exactPriority >= 10) && 'animate-pulse'
            )} 
            style={{ color: getHeatColor(12) }} 
          />
        </div>

        {/* Pastilles de priorité (0-12) */}
        <div className="flex items-center justify-between px-6 pt-1">
          {Array.from({ length: 13 }, (_, i) => {
            const isSelected = exactPriority === i;
            const isInRange = exactPriority === undefined && i >= heatMin && i <= heatMax;
            
            return (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className={cn(
                  "w-5 h-5 rounded-full transition-all duration-200 border-2",
                  "hover:scale-125 hover:shadow-lg cursor-pointer",
                  isSelected && "ring-2 ring-offset-2 ring-foreground scale-125",
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
