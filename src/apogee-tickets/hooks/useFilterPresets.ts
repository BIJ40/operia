/**
 * Hook pour gérer les presets de filtres sauvegardés
 * Permet de sauvegarder, charger et supprimer des jeux de filtres nommés
 */

import { useState, useCallback, useEffect } from 'react';
import type { TicketFilters } from '../types';

const STORAGE_KEY = 'apogee-filter-presets';

export interface FilterPreset {
  id: string;
  name: string;
  filters: TicketFilters;
  createdAt: string;
  updatedAt: string;
}

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Persist to localStorage when presets change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // ignore
    }
  }, [presets]);

  const savePreset = useCallback((name: string, filters: TicketFilters): FilterPreset => {
    const now = new Date().toISOString();
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim(),
      filters,
      createdAt: now,
      updatedAt: now,
    };

    setPresets((prev) => [...prev, newPreset]);
    return newPreset;
  }, []);

  const updatePreset = useCallback((id: string, filters: TicketFilters) => {
    setPresets((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, filters, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const renamePreset = useCallback((id: string, newName: string) => {
    setPresets((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, name: newName.trim(), updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getPreset = useCallback(
    (id: string): FilterPreset | undefined => {
      return presets.find((p) => p.id === id);
    },
    [presets]
  );

  return {
    presets,
    savePreset,
    updatePreset,
    renamePreset,
    deletePreset,
    getPreset,
  };
}
