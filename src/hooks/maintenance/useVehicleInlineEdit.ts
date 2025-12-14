/**
 * Hook pour l'édition inline des véhicules (double-clic + auto-save 10s)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUpdateFleetVehicle } from './useFleetVehicles';
import { toast } from 'sonner';
import type { FleetVehicle, FleetVehicleFormData } from '@/types/maintenance';

interface PendingChange {
  vehicleId: string;
  field: keyof FleetVehicleFormData;
  value: unknown;
}

const AUTO_SAVE_DELAY = 10000; // 10 secondes

export function useVehicleInlineEdit() {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [localData, setLocalData] = useState<Record<string, Record<string, unknown>>>({});
  const updateMutation = useUpdateFleetVehicle();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleValueChange = useCallback((vehicleId: string, field: keyof FleetVehicleFormData, value: unknown) => {
    // Update local state
    setLocalData(prev => ({
      ...prev,
      [vehicleId]: {
        ...(prev[vehicleId] || {}),
        [field]: value,
      },
    }));

    // Add to pending changes
    setPendingChanges(prev => {
      const filtered = prev.filter(c => !(c.vehicleId === vehicleId && c.field === field));
      return [...filtered, { vehicleId, field, value }];
    });

    // Reset auto-save timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveChanges();
    }, AUTO_SAVE_DELAY);
  }, []);

  const saveChanges = useCallback(async () => {
    if (pendingChanges.length === 0) return;

    // Group changes by vehicleId
    const changesByVehicle: Record<string, Partial<FleetVehicleFormData>> = {};
    for (const change of pendingChanges) {
      if (!changesByVehicle[change.vehicleId]) {
        changesByVehicle[change.vehicleId] = {};
      }
      (changesByVehicle[change.vehicleId] as Record<string, unknown>)[change.field] = change.value;
    }

    // Save each vehicle's changes
    const promises = Object.entries(changesByVehicle).map(([vehicleId, data]) =>
      updateMutation.mutateAsync({ vehicleId, data })
    );

    try {
      await Promise.all(promises);
      toast.success('Modifications enregistrées');
      setPendingChanges([]);
      setLocalData({});
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  }, [pendingChanges, updateMutation]);

  const getLocalValue = useCallback((vehicleId: string, field: keyof FleetVehicleFormData, originalValue: unknown) => {
    return localData[vehicleId]?.[field] ?? originalValue;
  }, [localData]);

  // Save on unmount or tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && pendingChanges.length > 0) {
        saveChanges();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        saveChanges();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pendingChanges, saveChanges]);

  // Save on click outside table
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const table = document.querySelector('[data-vehicle-table]');
      if (table && !table.contains(e.target as Node) && pendingChanges.length > 0) {
        saveChanges();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pendingChanges, saveChanges]);

  return {
    handleValueChange,
    getLocalValue,
    saveChanges,
    hasPendingChanges: pendingChanges.length > 0,
  };
}
