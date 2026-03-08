/**
 * TicketDetailDrawer — Header section
 * Contains status selector, badges, navigation, delete action
 */

import { useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft, ChevronRight, Trash2, GitBranch, CheckCircle2, 
  Maximize2, Minimize2, X 
} from 'lucide-react';
import { HeatPriorityBadge } from '../HeatPriorityBadge';
import type { ApogeeTicket, ApogeeTicketStatus } from '../../types';
import { formatTicketRef } from './constants';

interface TicketDrawerHeaderProps {
  ticket: ApogeeTicket;
  statuses: ApogeeTicketStatus[];
  availableStatuses: ApogeeTicketStatus[];
  currentStatusColor: string;
  canManage: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  onStatusChange: (newStatus: string) => void;
  onDelete?: (id: string) => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function TicketDrawerHeader({
  ticket,
  availableStatuses,
  currentStatusColor,
  canManage,
  isExpanded,
  onToggleExpand,
  onClose,
  onStatusChange,
  onDelete,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious,
  hasNext,
}: TicketDrawerHeaderProps) {
  const ticketRef = formatTicketRef(ticket.ticket_number);

  return (
    <div className="flex items-start justify-between gap-4">
      {/* Left: Expand + Close */}
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onToggleExpand}
          title={isExpanded ? "Réduire le panneau" : "Agrandir le panneau"}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 space-y-2">
        {/* Ticket reference */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-sm font-semibold">
            {ticketRef}
          </Badge>
        </div>
        
        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={ticket.kanban_status}
            onValueChange={onStatusChange}
            disabled={!canManage}
          >
            <SelectTrigger 
              className="h-9 w-auto min-w-[140px] text-sm font-medium gap-2"
              style={{ 
                backgroundColor: `${currentStatusColor}20`,
                borderColor: currentStatusColor
              }}
            >
              <GitBranch className="h-4 w-4" style={{ color: currentStatusColor }} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {availableStatuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: s.color || '#6b7280' }}
                    />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ticket.module && (
            <Badge className="bg-blue-500 text-white">
              {ticket.apogee_modules?.label || ticket.module}
            </Badge>
          )}
          <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
          {ticket.owner_side && (
            <Badge variant="outline">{ticket.owner_side}</Badge>
          )}
          {ticket.needs_completion && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              À compléter
            </Badge>
          )}
        </div>
        
        {/* AI Qualification */}
        <div className="flex flex-wrap items-center gap-2">
          {ticket.is_qualified ? (
            <>
              <Badge className="bg-green-600 text-white flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Qualifié
              </Badge>
              {ticket.ticket_type && (
                <Badge variant="outline" className="capitalize">
                  {ticket.ticket_type}
                </Badge>
              )}
              {ticket.theme && (
                <Badge variant="secondary" className="text-xs">
                  {ticket.theme}
                </Badge>
              )}
            </>
          ) : null}
        </div>
      </div>
      
      {/* Right: Navigation + Delete */}
      <div className="flex flex-col items-end gap-1">
        {(onNavigatePrevious || onNavigateNext) && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={onNavigatePrevious}
              disabled={!hasPrevious}
              title="Ticket précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={onNavigateNext}
              disabled={!hasNext}
              title="Ticket suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {onDelete && canManage && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                title="Supprimer le ticket"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="text-xs">Supprimer</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce ticket ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le ticket "{ticket.element_concerne.slice(0, 50)}..." sera définitivement supprimé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    onDelete(ticket.id);
                    onClose();
                  }}
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
