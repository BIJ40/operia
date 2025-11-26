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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtres</h3>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-8"
          >
            <X className="w-4 h-4 mr-1" />
            Réinitialiser ({activeFiltersCount})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtre type d'action */}
        <div className="space-y-2">
          <Label htmlFor="action-type">Type d'action</Label>
          <Select value={actionTypeFilter} onValueChange={onActionTypeChange}>
            <SelectTrigger id="action-type">
              <SelectValue placeholder="Toutes les actions" />
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
        </div>

        {/* Filtre client */}
        <div className="space-y-2">
          <Label htmlFor="client">Client</Label>
          <Select value={clientFilter} onValueChange={onClientFilterChange}>
            <SelectTrigger id="client">
              <SelectValue placeholder="Tous les clients" />
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
        </div>

        {/* Filtre statut */}
        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dossiers</SelectItem>
              <SelectItem value="late">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="px-1.5 py-0">!</Badge>
                  En retard uniquement
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
