/**
 * Hook pour gérer les PV Apporteur
 * Stockage localStorage en Phase 1, Supabase en Phase 2
 */

import { useState, useCallback, useEffect } from 'react';
import { PvApporteur, PvApporteurFormData, createEmptyPV } from '../types';

const STORAGE_KEY = 'helpconfort_pv_apporteur';

// Helpers localStorage
const loadFromStorage = (): Record<string, PvApporteur> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveToStorage = (data: Record<string, PvApporteur>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export function usePvApporteur(dossierId?: number) {
  const [pvApporteur, setPvApporteur] = useState<PvApporteur | null>(null);
  const [allPvs, setAllPvs] = useState<PvApporteur[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger tous les PVs
  useEffect(() => {
    const stored = loadFromStorage();
    setAllPvs(Object.values(stored));
    setIsLoading(false);
  }, []);

  // Charger un PV spécifique par dossierId
  useEffect(() => {
    if (dossierId) {
      const stored = loadFromStorage();
      const existing = Object.values(stored).find(
        (pv) => pv.dossierId === dossierId
      );
      setPvApporteur(existing || null);
    }
  }, [dossierId]);

  // Créer ou récupérer un PV pour un dossier
  const getOrCreatePV = useCallback((
    dossierId: number,
    projectId: number,
    clientNom: string,
    clientAdresse: string,
    refDossier: string,
    technicienId: number,
    technicienNom: string,
    dateReception: string,
    apporteurNom?: string,
    apporteurId?: number
  ): PvApporteur => {
    const stored = loadFromStorage();
    
    // Chercher un PV existant pour ce dossier
    const existing = Object.values(stored).find(
      (pv) => pv.dossierId === dossierId
    );
    
    if (existing) {
      setPvApporteur(existing);
      return existing;
    }
    
    // Créer un nouveau PV
    const newPV = createEmptyPV(
      dossierId,
      projectId,
      clientNom,
      clientAdresse,
      refDossier,
      technicienId,
      technicienNom,
      dateReception,
      apporteurNom,
      apporteurId
    );
    
    stored[newPV.id] = newPV;
    saveToStorage(stored);
    setPvApporteur(newPV);
    setAllPvs(Object.values(stored));
    
    return newPV;
  }, []);

  // Mettre à jour un PV
  const updatePV = useCallback((id: string, updates: Partial<PvApporteur>) => {
    const stored = loadFromStorage();
    
    if (stored[id]) {
      stored[id] = {
        ...stored[id],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveToStorage(stored);
      setPvApporteur(stored[id]);
      setAllPvs(Object.values(stored));
      return stored[id];
    }
    
    return null;
  }, []);

  // Mettre à jour les données du formulaire
  const updateFormData = useCallback((id: string, formData: Partial<PvApporteurFormData>) => {
    return updatePV(id, formData);
  }, [updatePV]);

  // Ajouter la signature client
  const addSignatureClient = useCallback((id: string, signatureData: string, signataireNom: string) => {
    return updatePV(id, {
      signatureClient: signatureData,
      signataireNom,
      signatureDate: new Date().toISOString(),
      status: 'signed',
    });
  }, [updatePV]);

  // Ajouter la signature apporteur (optionnel)
  const addSignatureApporteur = useCallback((id: string, signatureData: string, signataireNom: string) => {
    return updatePV(id, {
      signatureApporteur: signatureData,
      signataireApporteurNom: signataireNom,
      signatureApporteurDate: new Date().toISOString(),
    });
  }, [updatePV]);

  // Marquer comme exporté
  const markAsExported = useCallback((id: string) => {
    return updatePV(id, { status: 'exported' });
  }, [updatePV]);

  // Supprimer un PV
  const deletePV = useCallback((id: string) => {
    const stored = loadFromStorage();
    delete stored[id];
    saveToStorage(stored);
    setPvApporteur(null);
    setAllPvs(Object.values(stored));
  }, []);

  return {
    pvApporteur,
    allPvs,
    isLoading,
    getOrCreatePV,
    updatePV,
    updateFormData,
    addSignatureClient,
    addSignatureApporteur,
    markAsExported,
    deletePV,
  };
}
