/**
 * Planning V2 — Hook filtres persistés en sessionStorage
 */

import { useState, useCallback } from "react";
import type { PlanningView, DisplayDensity, PlanningFilters } from "../types";

const STORAGE_KEY = "planning-v2-filters";

function loadFilters(): Partial<PlanningFilters> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Restore date
    if (parsed.selectedDate) parsed.selectedDate = new Date(parsed.selectedDate);
    return parsed;
  } catch {
    return {};
  }
}

function saveFilters(filters: PlanningFilters) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // silent
  }
}

const DEFAULT_FILTERS: PlanningFilters = {
  selectedDate: new Date(),
  view: "day",
  density: "standard",
  technicianIds: [],
  universes: [],
  statuses: [],
  showBlocks: true,
  showUnconfirmed: true,
  granularity: 30,
};

export function useFilters() {
  const [filters, setFiltersState] = useState<PlanningFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...loadFilters(),
  }));

  const setFilters = useCallback((update: Partial<PlanningFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...update };
      saveFilters(next);
      return next;
    });
  }, []);

  const setDate = useCallback((d: Date) => setFilters({ selectedDate: d }), [setFilters]);
  const setView = useCallback((v: PlanningView) => setFilters({ view: v }), [setFilters]);
  const setDensity = useCallback((d: DisplayDensity) => setFilters({ density: d }), [setFilters]);

  return { filters, setFilters, setDate, setView, setDensity };
}
