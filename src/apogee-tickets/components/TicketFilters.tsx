/**
 * Filtres pour les tickets Apogée
 * Inclut: recherche, module, TAG, propriétaire, qualification IA, et slider priorité thermique
 */

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Search, X, Snowflake, Flame } from 'lucide-react';
import type { ApogeeModule, ApogeePriority, ApogeeImpactTag, TicketFilters as Filters, OwnerSide } from '../types';

interface TicketFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  impactTags: ApogeeImpactTag[];
}

// Couleurs pour le gradient du slider
const getHeatColor = (priority: number): string => {
  const p = Math.max(0, Math.min(12, priority));
  if (p <= 6) {
    const hue = 200 - (p * 26.67);
    const sat = 80 + (p * 1.67);
    const light = 70 - (p * 3.33);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  } else {
    const t = p - 6;
    const hue = 40 - (t * 6.67);
    const sat = 90;
    const light = 50 - (t * 3.33);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
};

const getHeatLabel = (priority: number): string => {
  if (priority === 0) return 'Gelé';
  if (priority <= 2) return 'Froid';
  if (priority <= 4) return 'Frais';
  if (priority <= 6) return 'Tiède';
  if (priority <= 8) return 'Chaud';
  if (priority <= 10) return 'Brûlant';
  return 'Critique';
};

export function TicketFilters({ filters, onFiltersChange, modules, priorities, impactTags }: TicketFiltersProps) {
  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  // Valeur du slider (seuil minimum)
  const heatThreshold = filters.heat_priority_min ?? 0;
  const isOnFire = heatThreshold >= 10;

  const handleHeatChange = (values: number[]) => {
    const [value] = values;
    onFiltersChange({
      ...filters,
      heat_priority_min: value === 0 ? undefined : value,
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
            {modules.map((m) => (
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
            {impactTags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Propriétaire */}
        <Select
          value={filters.owner_side || 'all'}
          onValueChange={(v) => updateFilter('owner_side', v === 'all' ? undefined : v as OwnerSide)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Propriétaire" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="HC">Help Confort</SelectItem>
            <SelectItem value="APOGEE">Apogée</SelectItem>
            <SelectItem value="PARTAGE">Partagé</SelectItem>
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

      {/* Ligne 2: Slider priorité thermique */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <Snowflake className="h-4 w-4" style={{ color: getHeatColor(0) }} />
          <span>Priorité ≥</span>
        </div>
        
        <div className="flex-1 px-2">
          <Slider
            min={0}
            max={12}
            step={1}
            value={[heatThreshold]}
            onValueChange={handleHeatChange}
            className="w-full"
            trackClassName="bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500"
            rangeClassName="bg-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm shrink-0">
          <Badge 
            variant="outline" 
            className={`font-mono text-xs transition-all ${isOnFire ? 'animate-pulse shadow-lg shadow-red-500/50' : ''}`}
            style={{ 
              borderColor: getHeatColor(heatThreshold),
              color: getHeatColor(heatThreshold),
              backgroundColor: isOnFire ? 'rgba(239, 68, 68, 0.1)' : undefined
            }}
          >
            {heatThreshold} • {getHeatLabel(heatThreshold)}
          </Badge>
          <Flame 
            className={`h-5 w-5 transition-all ${isOnFire ? 'animate-pulse scale-125' : ''}`} 
            style={{ color: getHeatColor(heatThreshold) }} 
          />
        </div>
      </div>
    </div>
  );
}
