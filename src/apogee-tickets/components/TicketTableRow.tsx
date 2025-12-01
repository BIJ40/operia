/**
 * Ligne de ticket dans la table avec édition inline et gestion des droits
 */

import { useState, useRef, useEffect } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Eye, Sparkles, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HeatPriorityBadge } from './HeatPriorityBadge';
import type { ApogeeTicket, ApogeeModule, ApogeeTicketStatus, OwnerSide, ReportedBy } from '../types';
import type { TicketRoleInfo } from '../hooks/useTicketPermissions';

interface TicketTableRowProps {
  ticket: ApogeeTicket;
  modules: ApogeeModule[];
  statuses: ApogeeTicketStatus[];
  allowedTransitions: string[];
  roleInfo: TicketRoleInfo;
  isSelected: boolean;
  onSelect: () => void;
  onOpenDetail: () => void;
  onUpdate: (updates: Partial<ApogeeTicket>) => void;
  onQualify: () => void;
  isQualifying?: boolean;
  statusSelectRef?: React.RefObject<HTMLButtonElement>;
}

const OWNER_SIDES: { value: OwnerSide; label: string }[] = [
  { value: 'HC', label: 'HC' },
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'PARTAGE', label: 'Partagé' },
];

const REPORTED_BY_OPTIONS: { value: ReportedBy; label: string }[] = [
  { value: 'JEROME', label: 'Jérôme' },
  { value: 'FLORIAN', label: 'Florian' },
  { value: 'ERIC', label: 'Eric' },
  { value: 'APOGEE', label: 'Apogée' },
  { value: 'AUTRE', label: 'Autre' },
];

export function TicketTableRow({
  ticket,
  modules,
  statuses,
  allowedTransitions,
  roleInfo,
  isSelected,
  onSelect,
  onOpenDetail,
  onUpdate,
  onQualify,
  isQualifying = false,
  statusSelectRef,
}: TicketTableRowProps) {
  const { canManage, ticketRole, isAdmin } = roleInfo;
  
  // Permissions spécifiques
  const canEditStatus = allowedTransitions.length > 0 || isAdmin;
  const canEditModule = canManage;
  const canEditPriority = canManage;
  const canEditOwnerSide = canManage || ticketRole === 'developer';
  const canEditReportedBy = canManage;
  const canEditEstimation = canManage || ticketRole === 'developer';

  // Style des cellules non-éditables
  const disabledCellClass = "bg-muted/30 cursor-not-allowed";

  // Trouve le module label
  const moduleLabel = ticket.module 
    ? modules.find(m => m.id === ticket.module)?.label || ticket.module
    : '—';

  // Trouve le statut label
  const statusLabel = statuses.find(s => s.id === ticket.kanban_status)?.label || ticket.kanban_status;

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors",
        isSelected && "bg-helpconfort-blue/10 ring-1 ring-helpconfort-blue",
        ticket.needs_completion && "border-l-2 border-l-orange-400",
        !ticket.is_qualified && "bg-amber-50/30 dark:bg-amber-950/10"
      )}
      onClick={onSelect}
      onDoubleClick={onOpenDetail}
    >
      {/* Réf */}
      <TableCell className="font-mono text-xs whitespace-nowrap">
        APO-{ticket.ticket_number}
      </TableCell>

      {/* Priorité */}
      <TableCell className={cn(!canEditPriority && disabledCellClass)}>
        <HeatPriorityBadge priority={ticket.heat_priority} size="sm" showLabel={false} />
      </TableCell>

      {/* Titre */}
      <TableCell className="max-w-[300px] truncate" title={ticket.element_concerne}>
        <div className="flex items-center gap-2">
          {ticket.needs_completion && (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent>Ticket incomplet</TooltipContent>
            </Tooltip>
          )}
          <span className="truncate">{ticket.element_concerne}</span>
        </div>
      </TableCell>

      {/* Module */}
      <TableCell className={cn(!canEditModule && disabledCellClass)}>
        {canEditModule ? (
          <Select
            value={ticket.module || 'none'}
            onValueChange={(value) => onUpdate({ module: value === 'none' ? null : value })}
          >
            <SelectTrigger 
              className="h-7 text-xs w-[100px]"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="none">—</SelectItem>
              {modules.map((mod) => (
                <SelectItem key={mod.id} value={mod.id}>
                  {mod.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">{moduleLabel}</span>
        )}
      </TableCell>

      {/* Statut */}
      <TableCell className={cn(!canEditStatus && disabledCellClass)}>
        {canEditStatus ? (
          <Select
            value={ticket.kanban_status}
            onValueChange={(value) => onUpdate({ kanban_status: value })}
          >
            <SelectTrigger 
              ref={statusSelectRef}
              className="h-7 text-xs w-[110px]"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {/* Statut actuel toujours visible */}
              <SelectItem value={ticket.kanban_status}>{statusLabel}</SelectItem>
              {/* Transitions autorisées */}
              {allowedTransitions
                .filter(s => s !== ticket.kanban_status)
                .map((statusId) => {
                  const status = statuses.find(s => s.id === statusId);
                  return status ? (
                    <SelectItem key={statusId} value={statusId}>
                      {status.label}
                    </SelectItem>
                  ) : null;
                })}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="text-xs">
            {statusLabel}
          </Badge>
        )}
      </TableCell>

      {/* PEC */}
      <TableCell className={cn(!canEditOwnerSide && disabledCellClass)}>
        {canEditOwnerSide ? (
          <Select
            value={ticket.owner_side || 'none'}
            onValueChange={(value) => onUpdate({ owner_side: value === 'none' ? null : value as OwnerSide })}
          >
            <SelectTrigger 
              className="h-7 text-xs w-[80px]"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="none">—</SelectItem>
              {OWNER_SIDES.map((os) => (
                <SelectItem key={os.value} value={os.value}>
                  {os.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">{ticket.owner_side || '—'}</span>
        )}
      </TableCell>

      {/* Origine */}
      <TableCell className={cn(!canEditReportedBy && disabledCellClass)}>
        {canEditReportedBy ? (
          <Select
            value={ticket.reported_by || 'none'}
            onValueChange={(value) => onUpdate({ reported_by: value === 'none' ? null : value as ReportedBy })}
          >
            <SelectTrigger 
              className="h-7 text-xs w-[90px]"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="none">—</SelectItem>
              {REPORTED_BY_OPTIONS.map((rb) => (
                <SelectItem key={rb.value} value={rb.value}>
                  {rb.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">{ticket.reported_by || '—'}</span>
        )}
      </TableCell>

      {/* Estimation */}
      <TableCell className={cn("text-center", !canEditEstimation && disabledCellClass)}>
        {ticket.h_min !== null || ticket.h_max !== null ? (
          <span className="text-xs">
            {ticket.h_min ?? '?'}-{ticket.h_max ?? '?'}h
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Qualifié */}
      <TableCell className="text-center">
        {ticket.is_qualified ? (
          <Tooltip>
            <TooltipTrigger>
              <Check className="h-4 w-4 text-green-600 mx-auto" />
            </TooltipTrigger>
            <TooltipContent>
              Qualifié {ticket.qualified_at && `le ${format(new Date(ticket.qualified_at), 'dd/MM/yyyy', { locale: fr })}`}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger>
              <Sparkles className="h-4 w-4 text-amber-500 mx-auto" />
            </TooltipTrigger>
            <TooltipContent>Non qualifié</TooltipContent>
          </Tooltip>
        )}
      </TableCell>

      {/* Créé le */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(ticket.created_at), 'dd/MM/yy', { locale: fr })}
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail();
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voir détail (1)</TooltipContent>
          </Tooltip>
          
          {canManage && !ticket.is_qualified && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQualify();
                  }}
                  disabled={isQualifying}
                >
                  <Sparkles className={cn("h-4 w-4", isQualifying && "animate-pulse")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Qualifier IA (4)</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
