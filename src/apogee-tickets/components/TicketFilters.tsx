/**
 * Filtres pour les tickets Apogée
 */

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';
import type { ApogeeModule, ApogeePriority, TicketFilters as Filters, OwnerSide } from '../types';

interface TicketFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
}

export function TicketFilters({ filters, onFiltersChange, modules, priorities }: TicketFiltersProps) {
  const updateFilter = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg">
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

      {/* Priorité */}
      <Select
        value={filters.priority || 'all'}
        onValueChange={(v) => updateFilter('priority', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Priorité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes priorités</SelectItem>
          {priorities.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
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
  );
}
