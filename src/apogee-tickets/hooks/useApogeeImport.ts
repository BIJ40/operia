/**
 * Hook pour l'import XLSX des tickets Apogée
 * Version améliorée avec détection flexible des colonnes
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ImportedRow, ImportResult, ApogeeTicketInsert, ApogeeTicketCommentInsert } from '../types';

// Mapping flexible des colonnes - cherche parmi ces variations
const COLUMN_VARIANTS: Record<string, string[]> = {
  element_concerne: ['ELEMENTS CONCERNES', 'ELEMENT CONCERNE', 'ÉLÉMENT CONCERNÉ', 'ÉLÉMENTS CONCERNÉS', 'Élément concerné'],
  description: ['DESCRIPTIF', 'Descriptif', 'DESCRIPTION', 'Description'],
  priority: ['PRIO', 'Prio', 'PRIORITE', 'PRIORITÉ', 'Priorité'],
  action_type: ['ACTION', 'Action', 'TYPE ACTION'],
  h_min: ['Temps mini', 'TEMPS MINI', 'H Min', 'H MIN', 'H_MIN', 'Min'],
  h_max: ['Temps maxi', 'TEMPS MAXI', 'H Max', 'H MAX', 'H_MAX', 'Max'],
  owner_side: ['PRISE EN CHARGE', 'Prise en charge', 'PEC', 'OWNER'],
  hca_code: ['HCA', 'CODE HCA', 'Code HCA'],
  apogee_status: ['APOGEE', 'Apogee', 'APOGÉE', 'Apogée', 'STATUT APOGEE', 'STATUT APOGÉE'],
  hc_status: ['HC', 'STATUT HC', 'Statut HC'],
  module: ['MODULE', 'Module', 'RUBRIQUE'],
  comment_apogee: ['COMMENTAIRE APOGÉE', 'COMMENTAIRE APOGEE', 'Commentaire Apogée', 'Commentaire Apogee'],
  comment_florian: ['COMMENTAIRE florian', 'COMMENTAIRE Florian', 'COMMENTAIRE FLORIAN', 'Florian'],
  comment_jerome: ['COMMENTAIRE Jérome', 'COMMENTAIRE Jérôme', 'COMMENTAIRE Jerome', 'COMMENTAIRE JEROME', 'Jérôme'],
};

// Mapping des priorités Excel vers les IDs en base
const PRIORITY_MAPPING: Record<string, string> = {
  'A': 'A',
  'B': 'B',
  'V1': 'V1',
  'PLUS TARD': 'PLUS_TARD',
  'Plus tard': 'PLUS_TARD',
  'C': 'C',
};

// Mapping des owner_side
const OWNER_MAPPING: Record<string, 'HC' | 'APOGEE' | 'PARTAGE'> = {
  'HC': 'HC',
  'APOGEE': 'APOGEE',
  'APOGÉE': 'APOGEE',
  '%': 'PARTAGE',
  'PARTAGE': 'PARTAGE',
  'DYNOCO': 'PARTAGE',
};

// Trouve la valeur d'une colonne en utilisant les variantes
function findColumnValue(data: Record<string, any>, columnKey: string): any {
  const variants = COLUMN_VARIANTS[columnKey] || [columnKey];
  for (const variant of variants) {
    if (data[variant] !== undefined && data[variant] !== null && data[variant] !== '') {
      return data[variant];
    }
  }
  return null;
}

// Déterminer le statut Kanban initial
function determineInitialStatus(data: Record<string, any>): string {
  const action = String(findColumnValue(data, 'action_type') || '').toUpperCase();
  const apogee = String(findColumnValue(data, 'apogee_status') || '').toUpperCase();
  const hc = String(findColumnValue(data, 'hc_status') || '').toUpperCase();

  if (action.includes('ATT MAJ')) return 'EN_DEV_APOGEE';
  if (apogee.includes('ATT MAJ') || apogee.includes('QUESTION')) return 'SPEC_A_FAIRE';
  if (hc.includes('A FAIRE')) return 'BACKLOG';
  if (hc.includes('A TESTER')) return 'EN_TEST_HC';
  if (hc.includes('OK') || apogee.includes('OK')) return 'EN_PROD';
  
  return 'BACKLOG';
}

// Parser le fichier XLSX avec debug des colonnes
export function parseXlsxFile(file: File): Promise<{ rows: ImportedRow[], debug: SheetDebugInfo[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const rows: ImportedRow[] = [];
        const debug: SheetDebugInfo[] = [];
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) return;
          
          const headers = (jsonData[0] as string[]).filter(h => h);
          
          // Debug: colonnes détectées par feuille
          const detectedColumns: Record<string, string | null> = {};
          Object.keys(COLUMN_VARIANTS).forEach(key => {
            const variants = COLUMN_VARIANTS[key];
            const found = variants.find(v => headers.includes(v));
            detectedColumns[key] = found || null;
          });
          
          debug.push({
            sheetName,
            totalRows: jsonData.length - 1,
            headers,
            detectedColumns,
          });
          
          for (let i = 1; i < jsonData.length; i++) {
            const rowData = jsonData[i];
            if (!rowData || rowData.length === 0) continue;
            
            const record: Record<string, string | number | null> = {};
            headers.forEach((header, idx) => {
              if (header && rowData[idx] !== undefined && rowData[idx] !== null && rowData[idx] !== '') {
                record[header] = rowData[idx];
              }
            });
            
            // Check si on a au moins un descriptif ou element
            const hasDescription = findColumnValue(record, 'description');
            const hasElement = findColumnValue(record, 'element_concerne');
            
            if (!hasDescription && !hasElement) continue;
            
            rows.push({
              sheetName,
              rowIndex: i + 1,
              data: record,
            });
          }
        });
        
        resolve({ rows, debug });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export interface SheetDebugInfo {
  sheetName: string;
  totalRows: number;
  headers: string[];
  detectedColumns: Record<string, string | null>;
}

// Transformer une ligne en ticket (version flexible)
function rowToTicket(row: ImportedRow): ApogeeTicketInsert {
  const data = row.data;
  
  // Récupérer les valeurs avec la détection flexible
  const elementConcerne = findColumnValue(data, 'element_concerne');
  const description = findColumnValue(data, 'description');
  const prioRaw = String(findColumnValue(data, 'priority') || '').toUpperCase().trim();
  const actionType = findColumnValue(data, 'action_type');
  const hMin = findColumnValue(data, 'h_min');
  const hMax = findColumnValue(data, 'h_max');
  const hcaCode = findColumnValue(data, 'hca_code');
  const apogeeStatus = findColumnValue(data, 'apogee_status');
  const hcStatus = findColumnValue(data, 'hc_status');
  
  // Déterminer owner_side
  let ownerSide: 'HC' | 'APOGEE' | 'PARTAGE' | null = null;
  const priseEnCharge = String(findColumnValue(data, 'owner_side') || '').toUpperCase();
  if (OWNER_MAPPING[priseEnCharge]) {
    ownerSide = OWNER_MAPPING[priseEnCharge];
  } else if (priseEnCharge.includes('DYNOCO') || priseEnCharge.includes('%')) {
    ownerSide = 'PARTAGE';
  }

  // Déterminer priorité
  const priority = PRIORITY_MAPPING[prioRaw] || null;

  // Construire le titre: prendre element_concerne ou description tronqué
  const title = elementConcerne 
    ? String(elementConcerne).substring(0, 255)
    : description 
      ? String(description).substring(0, 255)
      : 'Sans titre';

  return {
    element_concerne: title,
    description: description ? String(description) : null,
    priority,
    action_type: actionType ? String(actionType) : null,
    kanban_status: determineInitialStatus(data),
    owner_side: ownerSide,
    h_min: hMin ? Number(hMin) : null,
    h_max: hMax ? Number(hMax) : null,
    hca_code: hcaCode ? String(hcaCode) : null,
    apogee_status_raw: apogeeStatus ? String(apogeeStatus) : null,
    hc_status_raw: hcStatus ? String(hcStatus) : null,
    source_sheet: row.sheetName,
    source_row_index: row.rowIndex,
    external_key: `${row.sheetName}#${row.rowIndex}`,
    created_from: 'IMPORT',
  };
}

// Extraire les commentaires d'une ligne
function extractComments(row: ImportedRow, ticketId: string): ApogeeTicketCommentInsert[] {
  const comments: ApogeeTicketCommentInsert[] = [];
  const data = row.data;

  // Commentaire Apogée
  const commentApogee = findColumnValue(data, 'comment_apogee');
  if (commentApogee) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'APOGEE',
      author_name: 'Apogée',
      source_field: 'COMMENTAIRE_APOGEE',
      body: String(commentApogee),
    });
  }

  // Commentaire Florian
  const commentFlorian = findColumnValue(data, 'comment_florian');
  if (commentFlorian) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Florian',
      source_field: 'COMMENTAIRE_FLORIAN',
      body: String(commentFlorian),
    });
  }

  // Commentaire Jérôme
  const commentJerome = findColumnValue(data, 'comment_jerome');
  if (commentJerome) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Jérôme',
      source_field: 'COMMENTAIRE_JEROME',
      body: String(commentJerome),
    });
  }

  return comments;
}

export function useApogeeImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (rows: ImportedRow[]): Promise<ImportResult> => {
      setIsImporting(true);
      setProgress(0);
      
      const result: ImportResult = { created: 0, updated: 0, errors: [] };
      const total = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const ticketData = rowToTicket(row);
          
          // Check if ticket exists by external_key
          const { data: existing } = await supabase
            .from('apogee_tickets')
            .select('id')
            .eq('external_key', ticketData.external_key)
            .maybeSingle();

          if (existing) {
            // Update existing ticket
            const { error } = await supabase
              .from('apogee_tickets')
              .update({
                ...ticketData,
                needs_completion: !ticketData.module || !ticketData.priority || !ticketData.owner_side,
              })
              .eq('id', existing.id);
            
            if (error) throw error;
            result.updated++;
          } else {
            // Create new ticket
            const { data: newTicket, error } = await supabase
              .from('apogee_tickets')
              .insert({
                ...ticketData,
                created_by_user_id: user?.id,
                needs_completion: !ticketData.module || !ticketData.priority || !ticketData.owner_side,
              })
              .select('id')
              .single();
            
            if (error) throw error;

            // Add comments
            const comments = extractComments(row, newTicket.id);
            if (comments.length > 0) {
              await supabase
                .from('apogee_ticket_comments')
                .insert(comments.map(c => ({ ...c, created_by_user_id: user?.id })));
            }
            
            result.created++;
          }
        } catch (error: any) {
          result.errors.push(`Ligne ${row.rowIndex} (${row.sheetName}): ${error.message}`);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      toast.success(`Import terminé: ${result.created} créés, ${result.updated} mis à jour`);
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
    parseXlsxFile,
    importRows: importMutation.mutate,
    isImporting,
    progress,
    result: importMutation.data,
    errors: importMutation.data?.errors || [],
  };
}
