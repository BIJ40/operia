/**
 * Hook pour persister les filtres du Kanban dans localStorage
 * et le ticket sélectionné dans l'URL
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TicketFilters, OwnerSide, ReportedBy, MissingFieldFilter } from '../types';

const STORAGE_KEY = 'apogee-kanban-filters';
const UI_STATE_KEY = 'apogee-kanban-ui-state';

const DEFAULT_FILTERS: TicketFilters = {};

interface UIState {
  selectedPEC: string[];
  filterBlinkingOnly: boolean;
  hiddenColumns: string[];
  columnWidth: number;
}

const DEFAULT_UI_STATE: UIState = {
  selectedPEC: [],
  filterBlinkingOnly: false,
  hiddenColumns: [],
  columnWidth: 288,
};

export function usePersistedFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from localStorage
  const [filters, setFilters] = useState<TicketFilters>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_FILTERS;
  });

  // Initialize UI state from localStorage
  const [uiState, setUIState] = useState<UIState>(() => {
    try {
      const stored = localStorage.getItem(UI_STATE_KEY);
      if (stored) {
        return { ...DEFAULT_UI_STATE, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_UI_STATE;
  });

  // Get selected ticket ID from URL
  const selectedTicketId = searchParams.get('ticket') || null;

  // Persist filters to localStorage when they change
  useEffect(() => {
    try {
      // Only store if there are filters
      const hasFilters = Object.keys(filters).length > 0;
      if (hasFilters) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [filters]);

  // Persist UI state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState));
    } catch {
      // Ignore storage errors
    }
  }, [uiState]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Reset UI state
  const resetUIState = useCallback(() => {
    setUIState(DEFAULT_UI_STATE);
    localStorage.removeItem(UI_STATE_KEY);
  }, []);

  // Set selected ticket (updates URL)
  const setSelectedTicketId = useCallback((ticketId: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (ticketId) {
      newParams.set('ticket', ticketId);
    } else {
      newParams.delete('ticket');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // UI State setters
  const setSelectedPEC = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setUIState(prev => {
      const newSet = typeof value === 'function' 
        ? value(new Set(prev.selectedPEC)) 
        : value;
      return { ...prev, selectedPEC: Array.from(newSet) };
    });
  }, []);

  const setFilterBlinkingOnly = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setUIState(prev => {
      const newValue = typeof value === 'function' ? value(prev.filterBlinkingOnly) : value;
      return { ...prev, filterBlinkingOnly: newValue };
    });
  }, []);

  const setHiddenColumns = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setUIState(prev => {
      const newSet = typeof value === 'function' 
        ? value(new Set(prev.hiddenColumns)) 
        : value;
      return { ...prev, hiddenColumns: Array.from(newSet) };
    });
  }, []);

  const setColumnWidth = useCallback((value: number | ((prev: number) => number)) => {
    setUIState(prev => {
      const newValue = typeof value === 'function' ? value(prev.columnWidth) : value;
      return { ...prev, columnWidth: newValue };
    });
  }, []);

  // Check if any filter is active
  const hasActiveFilters = Object.keys(filters).length > 0;

  return {
    filters,
    setFilters,
    resetFilters,
    selectedTicketId,
    setSelectedTicketId,
    hasActiveFilters,
    // UI State
    selectedPEC: new Set(uiState.selectedPEC),
    setSelectedPEC,
    filterBlinkingOnly: uiState.filterBlinkingOnly,
    setFilterBlinkingOnly,
    hiddenColumns: new Set(uiState.hiddenColumns),
    setHiddenColumns,
    columnWidth: uiState.columnWidth,
    setColumnWidth,
    resetUIState,
  };
}
