/**
 * Hook pour persister les filtres du Kanban dans localStorage
 * et le ticket sélectionné dans l'URL
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TicketFilters, OwnerSide, ReportedBy, MissingFieldFilter } from '../types';

const STORAGE_KEY = 'apogee-kanban-filters';

const DEFAULT_FILTERS: TicketFilters = {};

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

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    localStorage.removeItem(STORAGE_KEY);
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

  // Check if any filter is active
  const hasActiveFilters = Object.keys(filters).length > 0;

  return {
    filters,
    setFilters,
    resetFilters,
    selectedTicketId,
    setSelectedTicketId,
    hasActiveFilters,
  };
}
