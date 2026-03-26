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
import { useAuthCore } from '@/contexts/AuthCoreContext';
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
const TABLE_UI_STATE_KEY = 'apogee-tickets-list-table-ui:v5'; // v5: removed qualif/roadmap/actions columns

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
  { key: 'element_concerne', label: 'Titre', sortable: true, minWidth: 150, defaultWidth: 280, id: 'title' },
  { key: 'actions', label: 'Tags', sortable: false, minWidth: 80, defaultWidth: 120, id: 'tags' },
  { key: 'module', label: 'Module', sortable: true, minWidth: 80, defaultWidth: 110, id: 'module' },
  { key: 'kanban_status', label: 'Statut', sortable: true, minWidth: 120, defaultWidth: 150, id: 'status' },
  { key: 'actions', label: 'PEC', sortable: false, minWidth: 60, defaultWidth: 90, id: 'pec' },
  { key: 'actions', label: 'Origine', sortable: false, minWidth: 80, defaultWidth: 100, id: 'origine' },
  { key: 'actions', label: 'Est.', sortable: false, minWidth: 50, defaultWidth: 60, id: 'estimation' },
  { key: 'created_at', label: 'Créé', sortable: true, minWidth: 70, defaultWidth: 80, id: 'created' },
  { key: 'last_modified_at', label: 'Modifié', sortable: true, minWidth: 70, defaultWidth: 85, id: 'modified' },
];

// Colonnes obligatoires (toujours visibles)
const REQUIRED_COLUMN_IDS = ['ref', 'title'];

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
}: TicketTableProps) {
  const { user } = useAuthCore();
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

  // Raccourcis clavier supprimés à la demande de l'utilisateur

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
      {/* Stats rapides - Style Warm */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-transparent dark:from-slate-800/30 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300 border-0">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </Badge>
          {selectedRowId && (
            <Badge variant="outline" className="text-xs rounded-full border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">
              Sélectionné: APO-{paginatedTickets.find(t => t.id === selectedRowId)?.ticket_number}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Sélecteur de colonnes */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full border-muted hover:bg-muted/50">
                <Columns3 className="h-4 w-4" />
                <span className="hidden sm:inline">Colonnes</span>
                {hiddenColumns.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs rounded-full">
                    {COLUMNS.length - hiddenColumns.length}/{COLUMNS.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 bg-background z-50 rounded-xl" align="end">
              <div className="space-y-1">
                <p className="text-sm font-medium mb-2">Colonnes visibles</p>
                {COLUMNS.map((col, idx) => {
                  const isRequired = REQUIRED_COLUMN_IDS.includes(col.id);
                  const isVisible = !hiddenColumns.includes(idx);
                  return (
                    <label
                      key={col.id}
                      className={cn(
                        "flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted cursor-pointer transition-colors",
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
                    className="w-full mt-2 text-xs rounded-lg"
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
            <SelectTrigger className="w-[70px] h-8 rounded-full border-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 rounded-xl">
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

      {/* Table avec style Warm Pastel */}
      <div className="rounded-2xl border border-border/50 overflow-x-auto bg-card/50 shadow-sm">
        <Table style={{ tableLayout: 'fixed', minWidth: visibleColumnIndices.reduce((sum, idx) => sum + columnWidths[idx], 0) }}>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/30">
              {visibleColumnIndices.map((colIdx) => {
                const col = COLUMNS[colIdx];
                return (
                  <TableHead
                    key={`${col.key}-${colIdx}`}
                    style={{ width: columnWidths[colIdx], minWidth: col.minWidth }}
                    className={cn(
                      "relative select-none py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                      col.sortable && "cursor-pointer hover:text-foreground hover:bg-muted/30 transition-colors"
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
                        "absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors",
                        resizingIndex === colIdx && "bg-primary"
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
                <TableCell colSpan={visibleColumnIndices.length} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📋</span>
                    <span>Aucun ticket trouvé</span>
                  </div>
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

      {/* Pagination - Style Warm */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-transparent to-muted/30 rounded-2xl px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-muted hover:bg-muted/50"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              ««
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-muted hover:bg-muted/50"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              ‹ Préc.
            </Button>
            <span className="px-3 py-1 text-sm bg-muted/30 rounded-full">
              {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, tickets.length)} / {tickets.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-muted hover:bg-muted/50"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
            >
              Suiv. ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-muted hover:bg-muted/50"
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
