/**
 * Tableau des tickets avec tri, pagination, raccourcis clavier, colonnes redimensionnables
 * et sélecteur de colonnes visibles
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketTableRow } from './TicketTableRow';
import { useMyTicketViews } from '../hooks/useTicketViews';
import { useAuth } from '@/contexts/AuthContext';
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

type SortColumn = 'ticket_number' | 'heat_priority' | 'element_concerne' | 'module' | 'kanban_status' | 'created_at' | 'last_modified_at';
type SortDirection = 'asc' | 'desc';

type PersistedTableUIState = {
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  pageSize?: number;
  columnWidths?: number[];
  hiddenColumns?: number[]; // indices des colonnes masquées
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const TABLE_UI_STATE_KEY = 'apogee-tickets-list-table-ui:v4'; // v4: added column visibility

const SORT_COLUMNS: SortColumn[] = [
  'ticket_number',
  'heat_priority',
  'element_concerne',
  'module',
  'kanban_status',
  'created_at',
  'last_modified_at',
];

export interface ColumnDef {
  key: SortColumn | 'actions';
  label: string;
  sortable: boolean;
  minWidth: number;
  defaultWidth: number;
  id: string; // identifiant unique pour la visibilité
}

export const COLUMNS: ColumnDef[] = [
  { key: 'ticket_number', label: 'Réf', sortable: true, minWidth: 50, defaultWidth: 70, id: 'ref' },
  { key: 'heat_priority', label: 'Priorité', sortable: true, minWidth: 60, defaultWidth: 80, id: 'priority' },
  { key: 'element_concerne', label: 'Titre', sortable: true, minWidth: 150, defaultWidth: 250, id: 'title' },
  { key: 'actions', label: 'Tags', sortable: false, minWidth: 80, defaultWidth: 120, id: 'tags' },
  { key: 'module', label: 'Module', sortable: true, minWidth: 80, defaultWidth: 110, id: 'module' },
  { key: 'kanban_status', label: 'Statut', sortable: true, minWidth: 100, defaultWidth: 120, id: 'status' },
  { key: 'actions', label: 'PEC', sortable: false, minWidth: 60, defaultWidth: 90, id: 'pec' },
  { key: 'actions', label: 'Origine', sortable: false, minWidth: 80, defaultWidth: 100, id: 'origine' },
  { key: 'actions', label: 'Est.', sortable: false, minWidth: 50, defaultWidth: 60, id: 'estimation' },
  { key: 'actions', label: 'Qualif.', sortable: false, minWidth: 60, defaultWidth: 70, id: 'qualif' },
  { key: 'actions', label: 'Roadmap', sortable: false, minWidth: 70, defaultWidth: 90, id: 'roadmap' },
  { key: 'created_at', label: 'Créé', sortable: true, minWidth: 70, defaultWidth: 80, id: 'created' },
  { key: 'last_modified_at', label: 'Modifié', sortable: true, minWidth: 70, defaultWidth: 85, id: 'modified' },
  { key: 'actions', label: 'Actions', sortable: false, minWidth: 70, defaultWidth: 80, id: 'actions' },
];

// Colonnes obligatoires (toujours visibles)
const REQUIRED_COLUMN_IDS = ['ref', 'title', 'actions'];

function loadTableUIState(): PersistedTableUIState {
  try {
    // Utiliser localStorage pour persister durablement les préférences utilisateur
    const raw = localStorage.getItem(TABLE_UI_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedTableUIState;

    const sortColumn =
      parsed.sortColumn && SORT_COLUMNS.includes(parsed.sortColumn)
        ? parsed.sortColumn
        : undefined;

    const sortDirection = parsed.sortDirection === 'asc' || parsed.sortDirection === 'desc'
      ? parsed.sortDirection
      : undefined;

    const pageSize =
      typeof parsed.pageSize === 'number' && PAGE_SIZE_OPTIONS.includes(parsed.pageSize)
        ? parsed.pageSize
        : undefined;

    // Reset column widths if the count doesn't match (schema changed)
    let columnWidths: number[] | undefined;
    if (
      Array.isArray(parsed.columnWidths) &&
      parsed.columnWidths.length === COLUMNS.length &&
      parsed.columnWidths.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)
    ) {
      columnWidths = parsed.columnWidths.map((w, idx) => 
        Math.max(w, COLUMNS[idx].minWidth)
      );
    } else {
      localStorage.removeItem(TABLE_UI_STATE_KEY);
      columnWidths = undefined;
    }

    // Colonnes masquées
    let hiddenColumns: number[] | undefined;
    if (Array.isArray(parsed.hiddenColumns)) {
      hiddenColumns = parsed.hiddenColumns.filter(
        (idx) => typeof idx === 'number' && idx >= 0 && idx < COLUMNS.length
      );
    }

    return { sortColumn, sortDirection, pageSize, columnWidths, hiddenColumns };
  } catch {
    return {};
  }
}

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
  const { user } = useAuth();
  const { data: myViews = [] } = useMyTicketViews();

  const initialUI = useMemo(() => loadTableUIState(), []);

  const [sortColumn, setSortColumn] = useState<SortColumn>(() => initialUI.sortColumn ?? 'created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => initialUI.sortDirection ?? 'desc');
  const [pageSize, setPageSize] = useState(() => initialUI.pageSize ?? 50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Colonnes masquées (indices)
  const [hiddenColumns, setHiddenColumns] = useState<number[]>(() => initialUI.hiddenColumns ?? []);

  // Colonnes redimensionnables
  const [columnWidths, setColumnWidths] = useState<number[]>(
    () => initialUI.columnWidths ?? COLUMNS.map(col => col.defaultWidth)
  );
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Refs pour les raccourcis clavier
  const statusSelectRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Fonction pour déterminer si un ticket doit clignoter
  const getTicketShouldBlink = useCallback(
    (ticket: ApogeeTicket): boolean => {
      if (!user?.id || !ticket.last_modified_by_user_id || !ticket.last_modified_at) {
        return false;
      }
      if (ticket.last_modified_by_user_id === user.id) {
        return false;
      }
      const myView = myViews.find((v) => v.ticket_id === ticket.id);
      if (!myView) {
        return true;
      }
      return new Date(ticket.last_modified_at).getTime() > new Date(myView.viewed_at).getTime();
    },
    [user?.id, myViews]
  );

  // Colonnes visibles
  const visibleColumnIndices = useMemo(() => {
    return COLUMNS.map((_, idx) => idx).filter(idx => !hiddenColumns.includes(idx));
  }, [hiddenColumns]);

  // Toggle visibilité d'une colonne
  const toggleColumnVisibility = useCallback((colIndex: number) => {
    const col = COLUMNS[colIndex];
    // Ne pas masquer les colonnes obligatoires
    if (REQUIRED_COLUMN_IDS.includes(col.id)) return;
    
    setHiddenColumns(prev => 
      prev.includes(colIndex) 
        ? prev.filter(i => i !== colIndex)
        : [...prev, colIndex]
    );
  }, []);

  // Persister tri / colonnes / taille de page durablement via localStorage
  useEffect(() => {
    try {
      const payload: PersistedTableUIState = { sortColumn, sortDirection, pageSize, columnWidths, hiddenColumns };
      localStorage.setItem(TABLE_UI_STATE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [sortColumn, sortDirection, pageSize, columnWidths, hiddenColumns]);
  // Gestion du redimensionnement des colonnes
  const handleResizeStart = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingIndex(index);
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[index];
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (resizingIndex === null) return;
    
    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(COLUMNS[resizingIndex].minWidth, startWidthRef.current + diff);
    
    setColumnWidths(prev => {
      const updated = [...prev];
      updated[resizingIndex] = newWidth;
      return updated;
    });
  }, [resizingIndex]);

  const handleResizeEnd = useCallback(() => {
    setResizingIndex(null);
  }, []);

  useEffect(() => {
    if (resizingIndex !== null) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizingIndex, handleResizeMove, handleResizeEnd]);

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
        case 'last_modified_at':
          const dateA = a.last_modified_at ? new Date(a.last_modified_at).getTime() : 0;
          const dateB = b.last_modified_at ? new Date(b.last_modified_at).getTime() : 0;
          comparison = dateA - dateB;
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

  // Raccourcis clavier - NE PAS intercepter si l'utilisateur est dans un champ de saisie
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignorer si on est dans un input, textarea, select ou élément contentEditable
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable = tagName === 'input' || 
                       tagName === 'textarea' || 
                       tagName === 'select' ||
                       target.isContentEditable ||
                       target.closest('[role="combobox"]') ||
                       target.closest('[role="listbox"]') ||
                       target.closest('[data-radix-popper-content-wrapper]');
    
    if (isEditable) return;
    
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
        if (allowedTransitions.length > 0 || roleInfo.isPlatformAdmin) {
          const selectRef = statusSelectRefs.current.get(selectedRowId);
          selectRef?.click();
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
        
        <div className="flex items-center gap-3">
          {/* Sélecteur de colonnes */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Columns3 className="h-4 w-4" />
                <span className="hidden sm:inline">Colonnes</span>
                {hiddenColumns.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {COLUMNS.length - hiddenColumns.length}/{COLUMNS.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 bg-background z-50" align="end">
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">Colonnes visibles</p>
                {COLUMNS.map((col, idx) => {
                  const isRequired = REQUIRED_COLUMN_IDS.includes(col.id);
                  const isVisible = !hiddenColumns.includes(idx);
                  return (
                    <label
                      key={col.id}
                      className={cn(
                        "flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer",
                        isRequired && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <Checkbox
                        checked={isVisible}
                        onCheckedChange={() => toggleColumnVisibility(idx)}
                        disabled={isRequired}
                      />
                      <span className="text-sm">{col.label}</span>
                      {isRequired && (
                        <span className="text-xs text-muted-foreground ml-auto">(requis)</span>
                      )}
                    </label>
                  );
                })}
                {hiddenColumns.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs"
                    onClick={() => setHiddenColumns([])}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

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

      {/* Table avec colonnes redimensionnables et scroll horizontal */}
      <div className="rounded-md border overflow-x-auto">
        <Table style={{ tableLayout: 'fixed', minWidth: visibleColumnIndices.reduce((sum, idx) => sum + columnWidths[idx], 0) }}>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {visibleColumnIndices.map((colIdx) => {
                const col = COLUMNS[colIdx];
                return (
                  <TableHead
                    key={`${col.key}-${colIdx}`}
                    style={{ width: columnWidths[colIdx], minWidth: col.minWidth }}
                    className={cn(
                      "relative select-none",
                      col.sortable && "cursor-pointer hover:bg-muted"
                    )}
                    onClick={col.sortable ? () => handleSort(col.key as SortColumn) : undefined}
                  >
                    <div className="flex items-center gap-1 pr-2 overflow-hidden">
                      <span className="truncate">{col.label}</span>
                      {col.sortable && renderSortIcon(col.key as SortColumn)}
                    </div>
                    
                    {/* Poignée de redimensionnement */}
                    <div
                      className={cn(
                        "absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-helpconfort-blue/50 transition-colors",
                        resizingIndex === colIdx && "bg-helpconfort-blue"
                      )}
                      onMouseDown={(e) => handleResizeStart(e, colIdx)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnIndices.length} className="text-center py-8 text-muted-foreground">
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
                  columnWidths={columnWidths}
                  visibleColumnIndices={visibleColumnIndices}
                  shouldBlink={getTicketShouldBlink(ticket)}
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
