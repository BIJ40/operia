import { ActionType, ACTION_LABELS } from '../types/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionsAMenerFiltersProps {
  actionTypeFilter: ActionType | 'all';
  onActionTypeChange: (value: ActionType | 'all') => void;
  clientFilter: string;
  onClientFilterChange: (value: string) => void;
  statusFilter: 'all' | 'late';
  onStatusFilterChange: (value: 'all' | 'late') => void;
  availableClients: string[];
  activeFiltersCount: number;
  onResetFilters: () => void;
}

export function ActionsAMenerFilters({
  actionTypeFilter,
  onActionTypeChange,
  clientFilter,
  onClientFilterChange,
  statusFilter,
  onStatusFilterChange,
  availableClients,
  activeFiltersCount,
  onResetFilters,
}: ActionsAMenerFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filtre type d'action */}
      <Select value={actionTypeFilter} onValueChange={onActionTypeChange}>
        <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
          <SelectValue placeholder="Type d'action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les actions</SelectItem>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre client */}
      <Select value={clientFilter} onValueChange={onClientFilterChange}>
        <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les clients</SelectItem>
          {availableClients.map((client) => (
            <SelectItem key={client} value={client}>
              {client}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre statut */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="late">
            <div className="flex items-center gap-1">
              <Badge variant="destructive" className="px-1 py-0 text-[10px]">!</Badge>
              En retard
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Reset */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="h-8 px-2 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          ({activeFiltersCount})
        </Button>
      )}
    </div>
  );
}
