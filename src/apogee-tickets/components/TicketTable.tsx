/**
 * Tableau des tickets avec tri, pagination et raccourcis clavier
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketTableRow } from './TicketTableRow';
import type { ApogeeTicket, ApogeeModule, ApogeeTicketStatus, ApogeeOwnerSide } from '../types';
import type { TicketRoleInfo } from '../hooks/useTicketPermissions';

interface TicketTableProps {
  tickets: ApogeeTicket[];
  modules: ApogeeModule[];
  statuses: ApogeeTicketStatus[];
  ownerSides: ApogeeOwnerSide[];
  roleInfo: TicketRoleInfo;
  allowedTransitionsMap: Record<string, string[]>;
  onTicketClick: (ticket: ApogeeTicket) => void;
  onTicketUpdate: (ticketId: string, updates: Partial<ApogeeTicket>) => void;
  onQualifyTicket: (ticketId: string) => void;
  qualifyingTicketId?: string | null;
}

type SortColumn = 'ticket_number' | 'heat_priority' | 'element_concerne' | 'module' | 'kanban_status' | 'created_at';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const COLUMNS: { key: SortColumn | 'actions'; label: string; sortable: boolean; width?: string }[] = [
  { key: 'ticket_number', label: 'Réf', sortable: true, width: 'w-[70px]' },
  { key: 'heat_priority', label: 'Priorité', sortable: true, width: 'w-[80px]' },
  { key: 'element_concerne', label: 'Titre', sortable: true },
  { key: 'module', label: 'Module', sortable: true, width: 'w-[110px]' },
  { key: 'kanban_status', label: 'Statut', sortable: true, width: 'w-[120px]' },
  { key: 'actions', label: 'PEC', sortable: false, width: 'w-[90px]' },
  { key: 'actions', label: 'Origine', sortable: false, width: 'w-[100px]' },
  { key: 'actions', label: 'Est.', sortable: false, width: 'w-[60px]' },
  { key: 'actions', label: 'Qualif.', sortable: false, width: 'w-[70px]' },
  { key: 'created_at', label: 'Créé', sortable: true, width: 'w-[80px]' },
  { key: 'actions', label: 'Actions', sortable: false, width: 'w-[80px]' },
];

export function TicketTable({
  tickets,
  modules,
  statuses,
  ownerSides,
  roleInfo,
  allowedTransitionsMap,
  onTicketClick,
  onTicketUpdate,
  onQualifyTicket,
  qualifyingTicketId,
}: TicketTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Refs pour les raccourcis clavier
  const statusSelectRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Tri des tickets
  const sortedTickets = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'ticket_number':
          comparison = a.ticket_number - b.ticket_number;
          break;
        case 'heat_priority':
          comparison = (a.heat_priority ?? -1) - (b.heat_priority ?? -1);
          break;
        case 'element_concerne':
          comparison = a.element_concerne.localeCompare(b.element_concerne);
          break;
        case 'module':
          comparison = (a.module || '').localeCompare(b.module || '');
          break;
        case 'kanban_status':
          const statusA = statuses.find(s => s.id === a.kanban_status)?.display_order ?? 0;
          const statusB = statuses.find(s => s.id === b.kanban_status)?.display_order ?? 0;
          comparison = statusA - statusB;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [tickets, sortColumn, sortDirection, statuses]);

  // Pagination
  const totalPages = Math.ceil(sortedTickets.length / pageSize);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTickets.slice(start, start + pageSize);
  }, [sortedTickets, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tickets.length]);

  // Gestion du tri
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Raccourcis clavier
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedRowId) return;
    const ticket = paginatedTickets.find(t => t.id === selectedRowId);
    if (!ticket) return;

    const allowedTransitions = allowedTransitionsMap[ticket.kanban_status] || [];

    switch (e.key) {
      case '1':
      case 'Enter':
        e.preventDefault();
        onTicketClick(ticket);
        break;
      case '2':
        e.preventDefault();
        if (allowedTransitions.length > 0 || roleInfo.isAdmin) {
          const selectRef = statusSelectRefs.current.get(selectedRowId);
          selectRef?.click();
        }
        break;
      case '3':
        e.preventDefault();
        // Focus priorité (si canManage)
        if (roleInfo.canManage) {
          // TODO: implement priority focus
        }
        break;
      case '4':
        e.preventDefault();
        if (roleInfo.canManage && !ticket.is_qualified) {
          onQualifyTicket(ticket.id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSelectedRowId(null);
        break;
      case 'ArrowDown':
        e.preventDefault();
        const currentIndex = paginatedTickets.findIndex(t => t.id === selectedRowId);
        if (currentIndex < paginatedTickets.length - 1) {
          setSelectedRowId(paginatedTickets[currentIndex + 1].id);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        const currentIdx = paginatedTickets.findIndex(t => t.id === selectedRowId);
        if (currentIdx > 0) {
          setSelectedRowId(paginatedTickets[currentIdx - 1].id);
        }
        break;
    }
  }, [selectedRowId, paginatedTickets, allowedTransitionsMap, roleInfo, onTicketClick, onQualifyTicket]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Rendu icône de tri
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4" /> 
      : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Stats rapides */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </Badge>
          {selectedRowId && (
            <Badge variant="outline" className="text-xs">
              Sélectionné: APO-{paginatedTickets.find(t => t.id === selectedRowId)?.ticket_number}
              <span className="ml-2 text-muted-foreground">
                (1=détail, 2=statut, 4=IA, ↑↓=navigation, Esc=désélect.)
              </span>
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Afficher</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">par page</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {COLUMNS.map((col, idx) => (
                <TableHead
                  key={`${col.key}-${idx}`}
                  className={cn(col.width, col.sortable && "cursor-pointer hover:bg-muted")}
                  onClick={col.sortable ? () => handleSort(col.key as SortColumn) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && renderSortIcon(col.key as SortColumn)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="text-center py-8 text-muted-foreground">
                  Aucun ticket trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginatedTickets.map((ticket) => (
                <TicketTableRow
                  key={ticket.id}
                  ticket={ticket}
                  modules={modules}
                  statuses={statuses}
                  allowedTransitions={allowedTransitionsMap[ticket.kanban_status] || []}
                  roleInfo={roleInfo}
                  isSelected={selectedRowId === ticket.id}
                  onSelect={() => setSelectedRowId(ticket.id)}
                  onOpenDetail={() => onTicketClick(ticket)}
                  onUpdate={(updates) => onTicketUpdate(ticket.id, updates)}
                  onQualify={() => onQualifyTicket(ticket.id)}
                  isQualifying={qualifyingTicketId === ticket.id}
                  statusSelectRef={{
                    current: statusSelectRefs.current.get(ticket.id) || null,
                  } as React.RefObject<HTMLButtonElement>}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              ««
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              ‹ Préc.
            </Button>
            <span className="px-2 text-sm">
              {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, tickets.length)} / {tickets.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
            >
              Suiv. ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              »»
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
