/**
 * Planning V2 — Hook filtres persistés en sessionStorage
 */

import { useState, useCallback } from "react";
import type { PlanningView, DisplayDensity, PlanningFilters, HoverDisplaySettings } from "../types";
import { DEFAULT_HOVER_SETTINGS } from "../types";

const STORAGE_KEY = "planning-v2-filters";
const HOVER_STORAGE_KEY = "planning-v2-hover-settings";

function loadFilters(): Partial<PlanningFilters> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
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

function loadHoverSettings(): HoverDisplaySettings {
  try {
    const raw = localStorage.getItem(HOVER_STORAGE_KEY);
    if (!raw) return DEFAULT_HOVER_SETTINGS;
    return { ...DEFAULT_HOVER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_HOVER_SETTINGS;
  }
}

function saveHoverSettings(s: HoverDisplaySettings) {
  try {
    localStorage.setItem(HOVER_STORAGE_KEY, JSON.stringify(s));
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

  const [hoverSettings, setHoverSettingsState] = useState<HoverDisplaySettings>(loadHoverSettings);

  const setFilters = useCallback((update: Partial<PlanningFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...update };
      saveFilters(next);
      return next;
    });
  }, []);

  const setHoverSettings = useCallback((s: HoverDisplaySettings) => {
    setHoverSettingsState(s);
    saveHoverSettings(s);
  }, []);

  const setDate = useCallback((d: Date) => setFilters({ selectedDate: d }), [setFilters]);
  const setView = useCallback((v: PlanningView) => setFilters({ view: v }), [setFilters]);
  const setDensity = useCallback((d: DisplayDensity) => setFilters({ density: d }), [setFilters]);

  return { filters, setFilters, setDate, setView, setDensity, hoverSettings, setHoverSettings };
}
