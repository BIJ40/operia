/**
 * Hook spécifique pour l'import des onglets Priorités A et Priorités B
 * Structure identique: ELEMENTS CONCERNES | PRIO | ACTION | Temps mini | Temps maxi | PRISE EN CHARGE | HCA | DESCRIPTIF | IMAGE | APOGEE | COMMENTAIRE APOGÉE | HC | COMMENTAIRE florian
 * 
 * IMPORTANT: L'import Priorités A/B doit être fait EN PREMIER car ces tickets ont 
 * une heat_priority plus élevée (A: 8-10, B: 5-7)
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ImportResult, ApogeeTicketInsert, ApogeeTicketCommentInsert, OwnerSide } from '../types';

export interface PriorityRow {
  rowIndex: number;
  sheetName: string; // 'PRIORITE_A' ou 'PRIORITE_B'
  elementConcerne: string | null;
  prio: string | null;
  action: string | null;
  tempsMin: string | null;
  tempsMax: string | null;
  priseEnCharge: string | null;
  hca: string | null;
  descriptif: string | null;
  apogeeStatus: string | null;
  commentaireApogee: string | null;
  hcStatus: string | null;
  commentaireFlorian: string | null;
}

// Mapping ACTION Excel → kanban_status DB
const ACTION_MAPPING: Record<string, string> = {
  'A FAIRE': 'SPEC_A_FAIRE',
  'À FAIRE': 'SPEC_A_FAIRE',
  'A ECHANGER': 'SPEC_A_FAIRE',
  'À ÉCHANGER': 'SPEC_A_FAIRE',
  'A CLASSIFIER': 'BACKLOG',
  'À CLASSIFIER': 'BACKLOG',
  'DEMANDE INFO': 'SPEC_A_FAIRE',
  'EN COURS': 'EN_DEV_APOGEE',
  'ATT MAJ': 'EN_DEV_APOGEE',
  'A TESTER': 'EN_TEST_HC',
  'À TESTER': 'EN_TEST_HC',
  'OK': 'EN_PROD',
  'RESOLU': 'EN_PROD',
  'RÉSOLU': 'EN_PROD',
};

// Mapping MODULE depuis element_concerne
const MODULE_MAPPING: Record<string, string> = {
  'RDV': 'RDV',
  'DEVIS': 'DEVIS',
  'FACTURES': 'FACTURES',
  'FACTURE': 'FACTURES',
  'PLANNING': 'PLANNING',
  'DOSSIERS': 'DOSSIERS',
  'DOSSIER': 'DOSSIERS',
  'CLIENTS': 'CLIENTS',
  'CLIENT': 'CLIENTS',
  'APPORTEURS': 'APPORTEURS',
  'APPORTEUR': 'APPORTEURS',
  'STATS': 'STATS',
  'STATISTIQUES': 'STATS',
};

function normalizeModule(element: string | null): string | null {
  if (!element) return null;
  const upper = element.toUpperCase().trim();
  // Chercher un module dans le texte
  for (const [key, value] of Object.entries(MODULE_MAPPING)) {
    if (upper.includes(key)) return value;
  }
  return null;
}

function normalizeStatus(action: string | null): string {
  if (!action) return 'BACKLOG';
  const upper = action.toUpperCase().trim();
  return ACTION_MAPPING[upper] || 'BACKLOG';
}

function normalizeOwner(owner: string | null): OwnerSide | null {
  if (!owner) return null;
  const upper = owner.toUpperCase().trim();
  if (upper === 'HC' || upper === '100') return 'HC';
  if (upper === 'APOGEE' || upper === 'APOGÉE' || upper === '0') return 'APOGEE';
  if (upper === '50/50' || upper === '50' || upper === '25/75' || upper.includes('/')) return 'PARTAGE';
  return null;
}

function parseNumber(val: string | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Calcul heat_priority basé sur l'onglet source
 * Priorité A → 8-10 (haute priorité thermique)
 * Priorité B → 5-7 (priorité moyenne)
 */
function calculateHeatPriority(sheetName: string, action: string | null): number {
  const isA = sheetName.includes('A');
  const baseHeat = isA ? 9 : 6; // A=9 par défaut, B=6 par défaut
  
  // Ajuster selon l'action/statut
  const actionUpper = (action || '').toUpperCase();
  if (actionUpper.includes('URGENT') || actionUpper.includes('BLOQUANT')) {
    return isA ? 12 : 10;
  }
  if (actionUpper.includes('EN COURS') || actionUpper.includes('A FAIRE')) {
    return isA ? 10 : 7;
  }
  if (actionUpper.includes('OK') || actionUpper.includes('RESOLU')) {
    return isA ? 8 : 5;
  }
  
  return baseHeat;
}

export function parsePrioritySheet(file: File): Promise<{ rows: PriorityRow[], headers: string[], sheetName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Chercher l'onglet "Priorités A" ou "Priorités B" ou prendre le premier
        const prioritySheet = workbook.SheetNames.find(n => {
          const upper = n.toUpperCase();
          return upper.includes('PRIORIT') && (upper.includes('A') || upper.includes('B'));
        });
        
        const sheetName = prioritySheet || workbook.SheetNames[0];
        const isA = sheetName.toUpperCase().includes('A');
        const normalizedSheetName = isA ? 'PRIORITE_A' : 'PRIORITE_B';
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          resolve({ rows: [], headers: [], sheetName: normalizedSheetName });
          return;
        }
        
        const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
        
        const findIndex = (names: string[]) => {
          return headers.findIndex(h => 
            names.some(n => h.toUpperCase().includes(n.toUpperCase()))
          );
        };
        
        const elementIdx = findIndex(['ELEMENTS CONCERNES', 'ELEMENT']);
        const prioIdx = findIndex(['PRIO']);
        const actionIdx = findIndex(['ACTION']);
        const tempsMinIdx = findIndex(['TEMPS MINI', 'TEMPS MIN']);
        const tempsMaxIdx = findIndex(['TEMPS MAXI', 'TEMPS MAX']);
        const priseEnChargeIdx = findIndex(['PRISE EN CHARGE']);
        const hcaIdx = findIndex(['HCA']);
        const descriptifIdx = findIndex(['DESCRIPTIF']);
        const apogeeIdx = headers.findIndex(h => h.toUpperCase() === 'APOGEE' || h.toUpperCase() === 'APOGÉE');
        const commentApogeeIdx = findIndex(['COMMENTAIRE APOGÉE', 'COMMENTAIRE APOGEE']);
        const hcIdx = headers.findIndex(h => h.toUpperCase() === 'HC');
        const commentFlorianIdx = findIndex(['COMMENTAIRE FLORIAN']);
        
        console.log(`Priorités ${isA ? 'A' : 'B'} - Colonnes détectées:`, { elementIdx, prioIdx, actionIdx, descriptifIdx });
        console.log('Headers:', headers);
        
        const rows: PriorityRow[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const rowData = jsonData[i];
          if (!rowData || rowData.length === 0) continue;
          
          const getValue = (idx: number) => {
            if (idx < 0 || idx >= rowData.length) return null;
            const val = rowData[idx];
            if (val === undefined || val === null || val === '') return null;
            return String(val).trim();
          };
          
          const elementConcerne = getValue(elementIdx);
          const descriptif = getValue(descriptifIdx);
          
          // Skip lignes sans element_concerne ET sans descriptif
          if (!elementConcerne && !descriptif) continue;
          // Skip lignes RECAP
          if (elementConcerne?.toUpperCase() === 'RECAP') continue;
          
          rows.push({
            rowIndex: i + 1,
            sheetName: normalizedSheetName,
            elementConcerne,
            prio: getValue(prioIdx),
            action: getValue(actionIdx),
            tempsMin: getValue(tempsMinIdx),
            tempsMax: getValue(tempsMaxIdx),
            priseEnCharge: getValue(priseEnChargeIdx),
            hca: getValue(hcaIdx),
            descriptif,
            apogeeStatus: getValue(apogeeIdx),
            commentaireApogee: getValue(commentApogeeIdx),
            hcStatus: getValue(hcIdx),
            commentaireFlorian: getValue(commentFlorianIdx),
          });
        }
        
        resolve({ rows, headers, sheetName: normalizedSheetName });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function rowToTicket(row: PriorityRow): ApogeeTicketInsert {
  const title = row.elementConcerne || row.descriptif?.split('\n')[0].substring(0, 100) || 'Sans titre';
  const heatPriority = calculateHeatPriority(row.sheetName, row.action);
  
  return {
    element_concerne: title,
    description: row.descriptif || null,
    module: normalizeModule(row.elementConcerne),
    module_area: row.elementConcerne || null,
    priority: null, // Plus de priority legacy, uniquement heat_priority
    action_type: row.action || null,
    kanban_status: normalizeStatus(row.action),
    owner_side: normalizeOwner(row.priseEnCharge),
    h_min: parseNumber(row.tempsMin),
    h_max: parseNumber(row.tempsMax),
    hca_code: row.hca || null,
    apogee_status_raw: row.apogeeStatus || null,
    hc_status_raw: row.hcStatus || null,
    source_sheet: row.sheetName,
    source_row_index: row.rowIndex,
    external_key: `${row.sheetName}#${row.rowIndex}`,
    created_from: 'IMPORT',
    needs_completion: !row.elementConcerne,
    heat_priority: heatPriority,
  };
}

function extractComments(row: PriorityRow, ticketId: string): ApogeeTicketCommentInsert[] {
  const comments: ApogeeTicketCommentInsert[] = [];
  
  if (row.commentaireApogee) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'APOGEE',
      author_name: 'Apogée',
      source_field: 'COMMENTAIRE_APOGEE',
      body: row.commentaireApogee,
    });
  }
  
  if (row.commentaireFlorian) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Florian',
      source_field: 'COMMENTAIRE_FLORIAN',
      body: row.commentaireFlorian,
    });
  }
  
  return comments;
}

export function useApogeeImportPriorities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (rows: PriorityRow[]): Promise<ImportResult> => {
      setIsImporting(true);
      setProgress(0);
      
      const result: ImportResult = { created: 0, updated: 0, errors: [] };
      const total = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const ticketData = rowToTicket(row);
          
          const { data: existing } = await supabase
            .from('apogee_tickets')
            .select('id')
            .eq('external_key', ticketData.external_key)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from('apogee_tickets')
              .update(ticketData)
              .eq('id', existing.id);
            
            if (error) throw error;
            result.updated++;
          } else {
            const { data: newTicket, error } = await supabase
              .from('apogee_tickets')
              .insert({
                ...ticketData,
                created_by_user_id: user?.id,
              })
              .select('id')
              .single();
            
            if (error) throw error;

            const comments = extractComments(row, newTicket.id);
            if (comments.length > 0) {
              await supabase
                .from('apogee_ticket_comments')
                .insert(comments.map(c => ({ ...c, created_by_user_id: user?.id })));
            }
            
            result.created++;
          }
        } catch (error: any) {
          result.errors.push(`Ligne ${row.rowIndex}: ${error.message}`);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      toast.success(`Import Priorités terminé: ${result.created} créés, ${result.updated} mis à jour`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} erreur(s) lors de l'import`);
      }
      setIsImporting(false);
    },
    onError: (error) => {
      toast.error(`Erreur d'import: ${error.message}`);
      setIsImporting(false);
    },
  });

  return {
    parsePrioritySheet,
    importRows: importMutation.mutate,
    isImporting,
    progress,
    result: importMutation.data,
    errors: importMutation.data?.errors || [],
  };
}
