/**
 * Ligne de ticket dans la table avec édition inline et gestion des droits
 * Style "Warm Pastel" avec badges tags pour Module/Origine
 */

import { TableCell, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HeatPriorityBadge } from './HeatPriorityBadge';
import { ModuleBadge } from './ModuleBadge';
import { OrigineBadge } from './OrigineBadge';
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
  statusSelectRef?: React.RefObject<HTMLButtonElement>;
  columnWidths?: number[];
  visibleColumnIndices?: number[]; // indices des colonnes à afficher
  shouldBlink?: boolean;
}

const OWNER_SIDES: { value: OwnerSide; label: string }[] = [
  { value: 'APOGEE', label: 'Apogée' },
  { value: '75_25', label: '75/25' },
  { value: '50_50', label: '50/50' },
  { value: '25_75', label: '25/75' },
  { value: 'HC', label: 'HC' },
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
  statusSelectRef,
  columnWidths,
  visibleColumnIndices,
  shouldBlink = false,
}: TicketTableRowProps) {
  const { canManage, ticketRole, isPlatformAdmin } = roleInfo;
  
  // Vérifier si le ticket est un BUG créé il y a plus de 48h
  const isBugOver48h = (() => {
    const hasBugTag = ticket.impact_tags?.includes('BUG');
    if (!hasBugTag) return false;
    const createdAt = new Date(ticket.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 48;
  })();
  
  // Permissions spécifiques - canManage requis pour toute modification
  const canEditStatus = canManage && (allowedTransitions.length > 0 || isPlatformAdmin);
  const canEditOwnerSide = canManage || ticketRole === 'developer';
  const canEditEstimation = canManage || ticketRole === 'developer';

  // Style des cellules non-éditables (plus doux)
  const disabledCellClass = "bg-slate-50/50 dark:bg-slate-800/20";

  // Helper pour appliquer la largeur de colonne
  const cellStyle = (index: number) => columnWidths ? { width: columnWidths[index] } : {};

  // Vérifier si une colonne est visible
  const isVisible = (index: number) => !visibleColumnIndices || visibleColumnIndices.includes(index);

  // Trouve le statut label et couleur
  const currentStatus = statuses.find(s => s.id === ticket.kanban_status);
  const statusLabel = currentStatus?.label || ticket.kanban_status;

  // Couleur de statut pour le badge
  const getStatusColor = (statusId: string) => {
    const statusColorMap: Record<string, string> = {
      'BACKLOG': 'bg-slate-50 text-slate-600 border-slate-100',
      'TODO': 'bg-amber-50/70 text-amber-600 border-amber-100',
      'IN_PROGRESS': 'bg-sky-50/70 text-sky-600 border-sky-100',
      'REVIEW': 'bg-violet-50/70 text-violet-600 border-violet-100',
      'DONE': 'bg-emerald-50/70 text-emerald-600 border-emerald-100',
      'ARCHIVED': 'bg-gray-50 text-gray-400 border-gray-100',
    };
    return statusColorMap[statusId] || 'bg-slate-50/50 text-slate-500 border-slate-100';
  };

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-all hover:bg-slate-50/60 dark:hover:bg-slate-800/30",
        isSelected && "bg-sky-50/40 ring-1 ring-sky-200/50 dark:bg-sky-900/20 dark:ring-sky-700/30",
        ticket.needs_completion && "border-l-2 border-l-amber-300",
        !ticket.is_qualified && "bg-amber-50/30 dark:bg-amber-950/10",
        shouldBlink && "animate-pulse ring-2 ring-emerald-300"
      )}
      onClick={onSelect}
      onDoubleClick={onOpenDetail}
    >
      {/* Réf - Index 0 */}
      {isVisible(0) && (
        <TableCell className="font-mono text-xs whitespace-nowrap overflow-hidden py-3" style={cellStyle(0)}>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100/70 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
            APO-{ticket.ticket_number}
          </span>
        </TableCell>
      )}

      {/* Priorité - Index 1 */}
      {isVisible(1) && (
        <TableCell className="overflow-hidden py-3" style={cellStyle(1)}>
          <div className={cn(isBugOver48h && "animate-pulse-subtle")}>
            <HeatPriorityBadge priority={ticket.heat_priority} size="sm" showLabel={false} />
          </div>
        </TableCell>
      )}

      {/* Titre - Index 2 */}
      {isVisible(2) && (
        <TableCell className="truncate overflow-hidden py-3" title={ticket.element_concerne} style={cellStyle(2)}>
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Icône Roadmap */}
            {ticket.roadmap_enabled && (
              <Tooltip>
                <TooltipTrigger>
                  <CalendarClock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  Roadmap: {ticket.roadmap_month}/{ticket.roadmap_year}
                </TooltipContent>
              </Tooltip>
            )}
            {ticket.needs_completion && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Ticket incomplet</TooltipContent>
              </Tooltip>
            )}
            <span className="truncate font-medium text-foreground/90">{ticket.element_concerne}</span>
          </div>
        </TableCell>
      )}

      {/* Tags - Index 3 */}
      {isVisible(3) && (
        <TableCell className="overflow-hidden py-3" style={cellStyle(3)}>
          <div className="flex flex-wrap gap-1">
            {ticket.impact_tags?.map(tag => {
              const tagColor = tag === 'BUG' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                               tag === 'EVO' ? 'bg-sky-50 text-sky-500 border-sky-100' :
                               tag === 'NTH' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                               'bg-violet-50 text-violet-500 border-violet-100';
              return (
                <Badge key={tag} variant="outline" className={`${tagColor} text-xs whitespace-nowrap rounded-full border px-2`}>
                  {tag}
                </Badge>
              );
            })}
          </div>
        </TableCell>
      )}

      {/* Module - Index 4 (maintenant en tag lecture seule) */}
      {isVisible(4) && (
        <TableCell className="overflow-hidden py-3" style={cellStyle(4)}>
          <ModuleBadge moduleId={ticket.module} modules={modules} size="sm" />
        </TableCell>
      )}

      {/* Statut - Index 5 */}
      {isVisible(5) && (
        <TableCell className={cn("overflow-hidden py-3", !canEditStatus && disabledCellClass)} style={cellStyle(5)} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {canEditStatus ? (
            <Select
              value={ticket.kanban_status}
              onValueChange={(value) => onUpdate({ kanban_status: value })}
            >
              <SelectTrigger 
                ref={statusSelectRef}
                className="h-7 text-xs w-full rounded-full border-muted"
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
            <Badge variant="outline" className={cn("text-xs truncate rounded-full border px-2.5", getStatusColor(ticket.kanban_status))}>
              {statusLabel}
            </Badge>
          )}
        </TableCell>
      )}

      {/* PEC - Index 6 */}
      {isVisible(6) && (
        <TableCell className={cn("overflow-hidden py-3", !canEditOwnerSide && disabledCellClass)} style={cellStyle(6)} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {canEditOwnerSide ? (
            <Select
              value={ticket.owner_side || 'none'}
              onValueChange={(value) => onUpdate({ owner_side: value === 'none' ? null : value as OwnerSide })}
            >
              <SelectTrigger 
                className="h-7 text-xs w-full max-w-[80px] rounded-full border-muted"
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
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
              {ticket.owner_side || '—'}
            </span>
          )}
        </TableCell>
      )}

      {/* Origine - Index 7 (maintenant en tag lecture seule) */}
      {isVisible(7) && (
        <TableCell className="overflow-hidden py-3" style={cellStyle(7)}>
          <OrigineBadge origine={ticket.reported_by} size="sm" />
        </TableCell>
      )}

      {/* Estimation - Index 8 */}
      {isVisible(8) && (
        <TableCell className={cn("text-center overflow-hidden py-3", !canEditEstimation && disabledCellClass)} style={cellStyle(8)}>
          {ticket.h_min !== null || ticket.h_max !== null ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs">
              {ticket.h_min ?? '?'}-{ticket.h_max ?? '?'}h
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      )}

      {/* Créé le - Index 9 */}
      {isVisible(9) && (
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden py-3" style={cellStyle(9)}>
          {format(new Date(ticket.created_at), 'dd/MM/yy', { locale: fr })}
        </TableCell>
      )}

      {/* Modifié le - Index 10 */}
      {isVisible(10) && (
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden py-3" style={cellStyle(10)}>
          {ticket.last_modified_at 
            ? format(new Date(ticket.last_modified_at), 'dd/MM/yy', { locale: fr })
            : '—'}
        </TableCell>
      )}
    </TableRow>
  );
}
