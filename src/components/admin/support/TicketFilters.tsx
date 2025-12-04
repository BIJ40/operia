/**
 * Composant de filtres avancés pour les tickets support
 * Phase 3 - UI : Filtres par statut, priorité, service
 * P2: Ajout export CSV
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_SERVICES,
  TICKET_SERVICE_LABELS,
  type TicketStatus,
  type TicketService,
} from '@/services/supportService';
import { getHeatPriorityConfig } from '@/utils/heatPriority';
import { TicketExportCSV } from './TicketExportCSV';
import { SupportTicket } from '@/hooks/use-admin-support';

interface TicketFiltersProps {
  statusFilter: TicketStatus | 'all';
  heatPriorityMin: number;
  heatPriorityMax: number;
  serviceFilter: TicketService | 'all';
  assignmentFilter: 'all' | 'mine' | 'unassigned';
  filteredTickets?: SupportTicket[];
  onStatusChange: (value: TicketStatus | 'all') => void;
  onHeatPriorityChange: (min: number, max: number) => void;
  onServiceChange: (value: TicketService | 'all') => void;
  onAssignmentChange: (value: 'all' | 'mine' | 'unassigned') => void;
  onClearFilters: () => void;
}

export function TicketFilters({
  statusFilter,
  heatPriorityMin,
  heatPriorityMax,
  serviceFilter,
  assignmentFilter,
  filteredTickets = [],
  onStatusChange,
  onHeatPriorityChange,
  onServiceChange,
  onAssignmentChange,
  onClearFilters,
}: TicketFiltersProps) {
  const hasActiveFilters =
    statusFilter !== 'all' ||
    heatPriorityMin > 0 ||
    heatPriorityMax < 12 ||
    serviceFilter !== 'all' ||
    assignmentFilter !== 'all';

  const minConfig = getHeatPriorityConfig(heatPriorityMin);
  const maxConfig = getHeatPriorityConfig(heatPriorityMax);

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4" />
          Filtres
        </div>
        <div className="flex items-center gap-2">
          {/* P2: Export CSV */}
          <TicketExportCSV tickets={filteredTickets} />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Filtre Statut */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Statut</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusChange(v as TicketStatus | 'all')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tous." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtre Priorité Heat (0-12) */}
        <div className="space-y-2 col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Priorité Heat</label>
            <span className="text-xs font-medium">
              {minConfig.emoji} {heatPriorityMin} - {heatPriorityMax} {maxConfig.emoji}
            </span>
          </div>
          <Slider
            min={0}
            max={12}
            step={1}
            value={[heatPriorityMin, heatPriorityMax]}
            onValueChange={([min, max]) => onHeatPriorityChange(min, max)}
            className="w-full"
          />
        </div>

        {/* Filtre Service */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Service</label>
          <Select
            value={serviceFilter}
            onValueChange={(v) => onServiceChange(v as TicketService | 'all')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tous." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les services</SelectItem>
              {Object.entries(TICKET_SERVICE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtre Assignation */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Assignation</label>
          <Select
            value={assignmentFilter}
            onValueChange={(v) => onAssignmentChange(v as 'all' | 'mine' | 'unassigned')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tous." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="mine">Mes tickets</SelectItem>
              <SelectItem value="unassigned">Non assignés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Badges des filtres actifs */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {TICKET_STATUS_LABELS[statusFilter]}
              <button
                onClick={() => onStatusChange('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(heatPriorityMin > 0 || heatPriorityMax < 12) && (
            <Badge variant="secondary" className="text-xs">
              Heat: {heatPriorityMin}-{heatPriorityMax}
              <button
                onClick={() => onHeatPriorityChange(0, 12)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {serviceFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {TICKET_SERVICE_LABELS[serviceFilter]}
              <button
                onClick={() => onServiceChange('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {assignmentFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {assignmentFilter === 'mine' ? 'Mes tickets' : 'Non assignés'}
              <button
                onClick={() => onAssignmentChange('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
