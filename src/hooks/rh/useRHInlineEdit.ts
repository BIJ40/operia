import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';
import { RHCollaborator } from '@/types/rh-suivi';

interface PendingChange {
  collaboratorId: string;
  field: string;
  value: string;
  timestamp: number;
}

// Date columns that need ISO format conversion
const DATE_COLUMNS = ['hiring_date', 'leaving_date', 'hab_elec_date', 'date_renouvellement'];

// Convert DD/MM/YYYY to YYYY-MM-DD (ISO format)
function convertToISODate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Check if already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convert DD/MM/YYYY to YYYY-MM-DD
  const match = dateStr.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try parsing as Date object
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

// Map column IDs to database fields
const COLUMN_TO_FIELD_MAP: Record<string, { table: string; field: string }> = {
  // Collaborator base fields
  email: { table: 'collaborators', field: 'email' },
  phone: { table: 'collaborators', field: 'phone' },
  role: { table: 'collaborators', field: 'role' },
  notes: { table: 'collaborators', field: 'notes' },
  hiring_date: { table: 'collaborators', field: 'hiring_date' },
  leaving_date: { table: 'collaborators', field: 'leaving_date' },
  // EPI profile
  taille_haut: { table: 'rh_epi_profiles', field: 'taille_haut' },
  taille_bas: { table: 'rh_epi_profiles', field: 'taille_bas' },
  pointure: { table: 'rh_epi_profiles', field: 'pointure' },
  taille_gants: { table: 'rh_epi_profiles', field: 'taille_gants' },
  // Competencies
  hab_elec_statut: { table: 'rh_competencies', field: 'habilitation_electrique_statut' },
  hab_elec_date: { table: 'rh_competencies', field: 'habilitation_electrique_date' },
  // Assets
  vehicule_attribue: { table: 'rh_assets', field: 'vehicule_attribue' },
  tablette_telephone: { table: 'rh_assets', field: 'tablette_telephone' },
  imei: { table: 'rh_assets', field: 'imei' },
  numero_carte_carburant: { table: 'rh_assets', field: 'numero_carte_carburant' },
  // IT Access
  notes_it: { table: 'rh_it_access', field: 'notes_it' },
};

// Non-editable columns (handled via popup or not editable)
const NON_EDITABLE_COLUMNS = [
  'last_name', 
  'first_name', 
  'type', 
  'docs_icons',
  'carte_carburant',
  'carte_bancaire',
  'carte_autre',
  'statut_epi',
  'date_renouvellement',
  'caces_count',
  'acces_outils',
];

export function useRHInlineEdit(
  collaborators: RHCollaborator[],
  onRefresh: () => void
) {
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [localData, setLocalData] = useState<Map<string, Record<string, string>>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const lastSaveRef = useRef<number>(Date.now());
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if a column is editable
  const isEditable = useCallback((columnId: string): boolean => {
    return !NON_EDITABLE_COLUMNS.includes(columnId) && !!COLUMN_TO_FIELD_MAP[columnId];
  }, []);

  // Handle value change
  const handleValueChange = useCallback((collaboratorId: string, columnId: string, value: string) => {
    const key = `${collaboratorId}:${columnId}`;
    
    // Update local data immediately for responsive UI
    setLocalData(prev => {
      const newMap = new Map(prev);
      const collabData = newMap.get(collaboratorId) || {};
      newMap.set(collaboratorId, { ...collabData, [columnId]: value });
      return newMap;
    });

    // Add to pending changes
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.set(key, {
        collaboratorId,
        field: columnId,
        value,
        timestamp: Date.now(),
      });
      return newMap;
    });
  }, []);

  // Get local value for a cell (prioritize pending changes)
  const getLocalValue = useCallback((collaboratorId: string, columnId: string, originalValue: unknown) => {
    const collabData = localData.get(collaboratorId);
    if (collabData && columnId in collabData) {
      return collabData[columnId];
    }
    return originalValue;
  }, [localData]);

  // Save all pending changes
  const saveChanges = useCallback(async () => {
    if (pendingChanges.size === 0 || isSaving) return;

    setIsSaving(true);
    const changesToSave = new Map(pendingChanges);
    
    try {
      // Group changes by table
      const changesByTable: Record<string, Record<string, Record<string, string>>> = {};
      
      for (const [, change] of changesToSave) {
        const mapping = COLUMN_TO_FIELD_MAP[change.field];
        if (!mapping) continue;
        
        const { table, field } = mapping;
        if (!changesByTable[table]) {
          changesByTable[table] = {};
        }
        if (!changesByTable[table][change.collaboratorId]) {
          changesByTable[table][change.collaboratorId] = {};
        }
        
        // Convert date values to ISO format
        let valueToSave: string | null = change.value;
        if (DATE_COLUMNS.includes(change.field)) {
          valueToSave = convertToISODate(change.value);
        }
        
        changesByTable[table][change.collaboratorId][field] = valueToSave as string;
      }

      // Execute updates
      for (const [table, collabChanges] of Object.entries(changesByTable)) {
        for (const [collaboratorId, fields] of Object.entries(collabChanges)) {
          if (table === 'collaborators') {
            const { error } = await supabase
              .from('collaborators')
              .update(fields)
              .eq('id', collaboratorId);
            
            if (error) throw error;
          } else {
            // For related tables, we need to upsert
            const { error } = await supabase
              .from(table as 'rh_epi_profiles' | 'rh_competencies' | 'rh_assets' | 'rh_it_access')
              .upsert({ 
                collaborator_id: collaboratorId, 
                ...fields,
              }, { 
                onConflict: 'collaborator_id' 
              });
            
            if (error) throw error;
          }
        }
      }

      // Clear saved changes
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        for (const key of changesToSave.keys()) {
          newMap.delete(key);
        }
        return newMap;
      });

      lastSaveRef.current = Date.now();
      toast.success('Modifications enregistrées', { duration: 2000 });
      
      // Refresh data
      onRefresh();
    } catch (error) {
      logError(error, 'useRHInlineEdit.saveChanges');
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, isSaving, onRefresh]);

  // Auto-save every 10 seconds
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      if (pendingChanges.size > 0) {
        saveChanges();
      }
    }, 10000);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [saveChanges, pendingChanges.size]);

  // Save on blur (when clicking outside)
  useEffect(() => {
    const handleClick = () => {
      // Small delay to allow blur event to complete
      setTimeout(() => {
        if (pendingChanges.size > 0) {
          saveChanges();
        }
      }, 100);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [saveChanges, pendingChanges.size]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingChanges.size]);

  // Handle assets update (for popup-based fields like cartes)
  const handleAssetsUpdate = useCallback(async (collaboratorId: string, field: string, value: unknown) => {
    try {
      let updateData: Record<string, unknown> = {};
      
      if (field === 'carte_carburant_data') {
        const data = value as { active: boolean; numero: string; fournisseur: string };
        updateData = {
          carte_carburant: data.active,
          numero_carte_carburant: data.numero || null,
          fournisseur_carte_carburant: data.fournisseur || null,
        };
      } else if (field === 'carte_bancaire_data') {
        const data = value as { active: boolean; numero: string; fournisseur: string };
        updateData = {
          carte_bancaire: data.active,
          numero_carte_bancaire: data.numero || null,
          fournisseur_carte_bancaire: data.fournisseur || null,
        };
      } else if (field === 'carte_autre_data') {
        const data = value as { active: boolean; numero: string; fournisseur: string; nom?: string };
        updateData = {
          carte_autre_nom: data.active ? (data.nom || 'Autre') : null,
          carte_autre_numero: data.numero || null,
          carte_autre_fournisseur: data.fournisseur || null,
        };
      } else {
        return;
      }

      const { error } = await supabase
        .from('rh_assets')
        .upsert({ 
          collaborator_id: collaboratorId, 
          ...updateData,
        }, { 
          onConflict: 'collaborator_id' 
        });

      if (error) throw error;
      
      toast.success('Modifications enregistrées', { duration: 2000 });
      onRefresh();
    } catch (error) {
      logError(error, 'useRHInlineEdit.handleAssetsUpdate');
      toast.error('Erreur lors de la sauvegarde');
    }
  }, [onRefresh]);

  return {
    pendingChanges,
    isSaving,
    isEditable,
    handleValueChange,
    getLocalValue,
    saveChanges,
    handleAssetsUpdate,
    hasPendingChanges: pendingChanges.size > 0,
  };
}
