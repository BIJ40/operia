/**
 * Ligne de ticket dans la table avec édition inline et gestion des droits
 */

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
  columnWidths?: number[];
  shouldBlink?: boolean;
}

const OWNER_SIDES: { value: OwnerSide; label: string }[] = [
  { value: 'APOGEE', label: 'Apogée' },
  { value: '75_25', label: '75/25' },
  { value: '50_50', label: '50/50' },
  { value: '25_75', label: '25/75' },
  { value: 'HC', label: 'HC' },
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
  columnWidths,
  shouldBlink = false,
}: TicketTableRowProps) {
  const { canManage, ticketRole, isPlatformAdmin } = roleInfo;
  
  // Permissions spécifiques - canManage requis pour toute modification
  const canEditStatus = canManage && (allowedTransitions.length > 0 || isPlatformAdmin);
  const canEditModule = canManage;
  const canEditPriority = canManage;
  const canEditOwnerSide = canManage || ticketRole === 'developer';
  const canEditReportedBy = canManage;
  const canEditEstimation = canManage || ticketRole === 'developer';

  // Style des cellules non-éditables
  const disabledCellClass = "bg-muted/30 cursor-not-allowed";

  // Helper pour appliquer la largeur de colonne
  const cellStyle = (index: number) => columnWidths ? { width: columnWidths[index] } : {};

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
        !ticket.is_qualified && "bg-amber-50/30 dark:bg-amber-950/10",
        shouldBlink && "animate-pulse ring-2 ring-green-500"
      )}
      onClick={onSelect}
      onDoubleClick={onOpenDetail}
    >
      {/* Réf */}
      <TableCell className="font-mono text-xs whitespace-nowrap overflow-hidden" style={cellStyle(0)}>
        APO-{ticket.ticket_number}
      </TableCell>

      {/* Priorité */}
      <TableCell className={cn("overflow-hidden", !canEditPriority && disabledCellClass)} style={cellStyle(1)}>
        <HeatPriorityBadge priority={ticket.heat_priority} size="sm" showLabel={false} />
      </TableCell>

      {/* Titre */}
      <TableCell className="truncate overflow-hidden" title={ticket.element_concerne} style={cellStyle(2)}>
        <div className="flex items-center gap-2 overflow-hidden">
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

      {/* Tags */}
      <TableCell className="overflow-hidden" style={cellStyle(3)}>
        <div className="flex flex-wrap gap-1">
          {ticket.impact_tags?.map(tag => {
            const tagColor = tag === 'BUG' ? 'bg-red-100 text-red-800' :
                             tag === 'EVO' ? 'bg-blue-100 text-blue-800' :
                             tag === 'NTH' ? 'bg-gray-100 text-gray-800' :
                             'bg-purple-100 text-purple-800';
            return (
              <Badge key={tag} variant="secondary" className={`${tagColor} text-xs whitespace-nowrap`}>
                {tag}
              </Badge>
            );
          })}
        </div>
      </TableCell>

      {/* Module */}
      <TableCell className={cn("overflow-hidden", !canEditModule && disabledCellClass)} style={cellStyle(4)}>
        {canEditModule ? (
          <Select
            value={ticket.module || 'none'}
            onValueChange={(value) => onUpdate({ module: value === 'none' ? null : value })}
          >
            <SelectTrigger 
              className="h-7 text-xs w-full max-w-[100px]"
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
          <span className="text-xs text-muted-foreground truncate">{moduleLabel}</span>
        )}
      </TableCell>

      {/* Statut */}
      <TableCell className={cn("overflow-hidden", !canEditStatus && disabledCellClass)} style={cellStyle(5)}>
        {canEditStatus ? (
          <Select
            value={ticket.kanban_status}
            onValueChange={(value) => onUpdate({ kanban_status: value })}
          >
            <SelectTrigger 
              ref={statusSelectRef}
              className="h-7 text-xs w-full max-w-[110px]"
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
          <Badge variant="outline" className="text-xs truncate">
            {statusLabel}
          </Badge>
        )}
      </TableCell>

      {/* PEC */}
      <TableCell className={cn("overflow-hidden", !canEditOwnerSide && disabledCellClass)} style={cellStyle(6)}>
        {canEditOwnerSide ? (
          <Select
            value={ticket.owner_side || 'none'}
            onValueChange={(value) => onUpdate({ owner_side: value === 'none' ? null : value as OwnerSide })}
          >
            <SelectTrigger 
              className="h-7 text-xs w-full max-w-[80px]"
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
          <span className="text-xs text-muted-foreground truncate">{ticket.owner_side || '—'}</span>
        )}
      </TableCell>

      {/* Origine */}
      <TableCell className={cn("overflow-hidden", !canEditReportedBy && disabledCellClass)} style={cellStyle(7)}>
        {(() => {
          // Normaliser reported_by en majuscules pour matcher les options
          const normalizedReportedBy = ticket.reported_by?.toUpperCase() || null;
          const matchingOption = REPORTED_BY_OPTIONS.find(rb => rb.value === normalizedReportedBy);
          const displayLabel = matchingOption?.label || ticket.reported_by || '—';
          
          return canEditReportedBy ? (
            <Select
              value={normalizedReportedBy || 'none'}
              onValueChange={(value) => onUpdate({ reported_by: value === 'none' ? null : value as ReportedBy })}
            >
              <SelectTrigger 
                className="h-7 text-xs w-full max-w-[90px]"
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
            <span className="text-xs text-muted-foreground truncate">{displayLabel}</span>
          );
        })()}
      </TableCell>

      {/* Estimation */}
      <TableCell className={cn("text-center overflow-hidden", !canEditEstimation && disabledCellClass)} style={cellStyle(8)}>
        {ticket.h_min !== null || ticket.h_max !== null ? (
          <span className="text-xs">
            {ticket.h_min ?? '?'}-{ticket.h_max ?? '?'}h
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Qualifié */}
      <TableCell className="text-center overflow-hidden" style={cellStyle(9)}>
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
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden" style={cellStyle(10)}>
        {format(new Date(ticket.created_at), 'dd/MM/yy', { locale: fr })}
      </TableCell>

      {/* Modifié le */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden" style={cellStyle(11)}>
        {ticket.last_modified_at 
          ? format(new Date(ticket.last_modified_at), 'dd/MM/yy', { locale: fr })
          : '—'}
      </TableCell>

      {/* Actions */}
      <TableCell style={cellStyle(12)}>
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
                aria-label="Voir détail"
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
                  aria-label="Qualifier le ticket"
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
