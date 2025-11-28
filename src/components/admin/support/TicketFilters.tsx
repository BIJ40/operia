/**
 * Composant de filtres avancés pour les tickets support
 * Phase 3 - UI : Filtres par statut, priorité, service
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
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_SERVICES,
  TICKET_SERVICE_LABELS,
  type TicketStatus,
  type TicketPriority,
  type TicketService,
} from '@/services/supportService';

interface TicketFiltersProps {
  statusFilter: TicketStatus | 'all';
  priorityFilter: TicketPriority | 'all';
  serviceFilter: TicketService | 'all';
  assignmentFilter: 'all' | 'mine' | 'unassigned';
  onStatusChange: (value: TicketStatus | 'all') => void;
  onPriorityChange: (value: TicketPriority | 'all') => void;
  onServiceChange: (value: TicketService | 'all') => void;
  onAssignmentChange: (value: 'all' | 'mine' | 'unassigned') => void;
  onClearFilters: () => void;
}

export function TicketFilters({
  statusFilter,
  priorityFilter,
  serviceFilter,
  assignmentFilter,
  onStatusChange,
  onPriorityChange,
  onServiceChange,
  onAssignmentChange,
  onClearFilters,
}: TicketFiltersProps) {
  const hasActiveFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    serviceFilter !== 'all' ||
    assignmentFilter !== 'all';

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4" />
          Filtres
        </div>
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

      <div className="grid grid-cols-2 gap-2">
        {/* Filtre Statut */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Statut</label>
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusChange(v as TicketStatus | 'all')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tous" />
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

        {/* Filtre Priorité */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Priorité</label>
          <Select
            value={priorityFilter}
            onValueChange={(v) => onPriorityChange(v as TicketPriority | 'all')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les priorités</SelectItem>
              {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtre Service */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Service</label>
          <Select
            value={serviceFilter}
            onValueChange={(v) => onServiceChange(v as TicketService | 'all')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tous" />
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
              <SelectValue placeholder="Tous" />
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
          {priorityFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              {TICKET_PRIORITY_LABELS[priorityFilter]}
              <button
                onClick={() => onPriorityChange('all')}
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
