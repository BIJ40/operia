/**
 * Hook pour persister les filtres de la vue Liste dans le stockage local
 * et le ticket sélectionné dans l'URL.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TicketFilters } from '../types';

const STORAGE_KEY = 'apogee-list-filters';
const FALLBACK_KEY = 'apogee-kanban-filters';

const DEFAULT_FILTERS: TicketFilters = {};

type FiltersEntry = [keyof TicketFilters, TicketFilters[keyof TicketFilters]];

function normalizeFilters(input: TicketFilters): TicketFilters {
  const out: TicketFilters = {};

  (Object.entries(input) as FiltersEntry[]).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (Array.isArray(value) && value.length === 0) return;

    out[key] = value as any;
  });

  return out;
}

export function usePersistedListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from localStorage (fallback to old key for backward compat)
  const [filters, setFilters] = useState<TicketFilters>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(FALLBACK_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_FILTERS, ...parsed };
      }
    } catch {
      // ignore
    }

    return DEFAULT_FILTERS;
  });

  // Get selected ticket ID from URL
  const selectedTicketId = searchParams.get('ticket') || null;

  // Persist filters (normalized) to localStorage when they change
  useEffect(() => {
    try {
      const normalized = normalizeFilters(filters);
      if (Object.keys(normalized).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [filters]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Set selected ticket (updates URL)
  const setSelectedTicketId = useCallback(
    (ticketId: string | null) => {
      const newParams = new URLSearchParams(searchParams);
      if (ticketId) {
        newParams.set('ticket', ticketId);
      } else {
        newParams.delete('ticket');
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const hasActiveFilters = useMemo(() => {
    return Object.keys(normalizeFilters(filters)).length > 0;
  }, [filters]);

  return {
    filters,
    setFilters,
    resetFilters,
    selectedTicketId,
    setSelectedTicketId,
    hasActiveFilters,
  };
}
