/**
 * Hook pour gérer les bons d'intervention
 * Stockage localStorage en Phase 1, Supabase en Phase 2
 */

import { useState, useCallback, useEffect } from 'react';
import { BonIntervention, BonInterventionFormData, createEmptyBI } from '../types';

const STORAGE_KEY = 'helpconfort_bons_intervention';

// Helpers localStorage
const loadFromStorage = (): Record<string, BonIntervention> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveToStorage = (data: Record<string, BonIntervention>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export function useBonIntervention(interventionId?: number) {
  const [bonIntervention, setBonIntervention] = useState<BonIntervention | null>(null);
  const [allBons, setAllBons] = useState<BonIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger tous les BIs
  useEffect(() => {
    const stored = loadFromStorage();
    setAllBons(Object.values(stored));
    setIsLoading(false);
  }, []);

  // Charger un BI spécifique par interventionId
  useEffect(() => {
    if (interventionId) {
      const stored = loadFromStorage();
      const existing = Object.values(stored).find(
        (bi) => bi.interventionId === interventionId
      );
      setBonIntervention(existing || null);
    }
  }, [interventionId]);

  // Créer ou récupérer un BI pour une intervention
  const getOrCreateBI = useCallback((
    interventionId: number,
    projectId: number,
    clientNom: string,
    clientAdresse: string,
    refDossier: string,
    technicienId: number,
    technicienNom: string,
    dateIntervention: string
  ): BonIntervention => {
    const stored = loadFromStorage();
    
    // Chercher un BI existant pour cette intervention
    const existing = Object.values(stored).find(
      (bi) => bi.interventionId === interventionId
    );
    
    if (existing) {
      setBonIntervention(existing);
      return existing;
    }
    
    // Créer un nouveau BI
    const newBI = createEmptyBI(
      interventionId,
      projectId,
      clientNom,
      clientAdresse,
      refDossier,
      technicienId,
      technicienNom,
      dateIntervention
    );
    
    stored[newBI.id] = newBI;
    saveToStorage(stored);
    setBonIntervention(newBI);
    setAllBons(Object.values(stored));
    
    return newBI;
  }, []);

  // Mettre à jour un BI
  const updateBI = useCallback((id: string, updates: Partial<BonIntervention>) => {
    const stored = loadFromStorage();
    
    if (stored[id]) {
      stored[id] = {
        ...stored[id],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveToStorage(stored);
      setBonIntervention(stored[id]);
      setAllBons(Object.values(stored));
      return stored[id];
    }
    
    return null;
  }, []);

  // Mettre à jour les données du formulaire
  const updateFormData = useCallback((id: string, formData: Partial<BonInterventionFormData>) => {
    return updateBI(id, formData);
  }, [updateBI]);

  // Ajouter la signature
  const addSignature = useCallback((id: string, signatureData: string, signataireNom: string) => {
    return updateBI(id, {
      signatureClient: signatureData,
      signataireNom,
      signatureDate: new Date().toISOString(),
      status: 'signed',
    });
  }, [updateBI]);

  // Marquer comme exporté
  const markAsExported = useCallback((id: string) => {
    return updateBI(id, { status: 'exported' });
  }, [updateBI]);

  // Supprimer un BI
  const deleteBI = useCallback((id: string) => {
    const stored = loadFromStorage();
    delete stored[id];
    saveToStorage(stored);
    setBonIntervention(null);
    setAllBons(Object.values(stored));
  }, []);

  // Calculer le temps passé en minutes
  const calculateTempsPasse = useCallback((heureArrivee: string, heureFin: string): number => {
    if (!heureArrivee || !heureFin) return 0;
    
    const [hA, mA] = heureArrivee.split(':').map(Number);
    const [hF, mF] = heureFin.split(':').map(Number);
    
    const minutesArrivee = hA * 60 + mA;
    const minutesFin = hF * 60 + mF;
    
    return Math.max(0, minutesFin - minutesArrivee);
  }, []);

  return {
    bonIntervention,
    allBons,
    isLoading,
    getOrCreateBI,
    updateBI,
    updateFormData,
    addSignature,
    markAsExported,
    deleteBI,
    calculateTempsPasse,
  };
}
