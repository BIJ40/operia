/**
 * Hook pour l'import XLSX des tickets Apogée
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ImportedRow, ImportResult, ApogeeTicketInsert, ApogeeTicketCommentInsert } from '../types';

// Mapping des colonnes Excel vers les champs de la base
const COLUMN_MAPPING: Record<string, keyof ApogeeTicketInsert | 'comments'> = {
  'ELEMENTS CONCERNES': 'element_concerne',
  'PRIO': 'priority',
  'ACTION': 'action_type',
  'Temps mini': 'h_min',
  'H Min': 'h_min',
  'Temps maxi': 'h_max',
  'H Max': 'h_max',
  'PRISE EN CHARGE': 'owner_side',
  'HCA': 'hca_code',
  'CODE HCA': 'hca_code',
  'DESCRIPTIF': 'description',
  'APOGEE': 'apogee_status_raw',
  'HC': 'hc_status_raw',
};

// Mapping des priorités Excel vers les IDs en base
const PRIORITY_MAPPING: Record<string, string> = {
  'A': 'A',
  'B': 'B',
  'V1': 'V1',
  'PLUS TARD': 'PLUS_TARD',
  'Plus tard': 'PLUS_TARD',
};

// Mapping des owner_side
const OWNER_MAPPING: Record<string, 'HC' | 'APOGEE' | 'PARTAGE'> = {
  'HC': 'HC',
  'APOGEE': 'APOGEE',
  'APOGÉE': 'APOGEE',
  '%': 'PARTAGE',
  'PARTAGE': 'PARTAGE',
};

// Déterminer le statut Kanban initial
function determineInitialStatus(row: Record<string, any>): string {
  const action = String(row['ACTION'] || '').toUpperCase();
  const apogee = String(row['APOGEE'] || '').toUpperCase();
  const hc = String(row['HC'] || '').toUpperCase();

  if (action.includes('ATT MAJ')) return 'EN_DEV_APOGEE';
  if (apogee.includes('ATT MAJ') || apogee.includes('QUESTION')) return 'SPEC_A_FAIRE';
  if (hc.includes('A FAIRE')) return 'BACKLOG';
  if (hc.includes('A TESTER')) return 'EN_TEST_HC';
  if (hc.includes('OK') || apogee.includes('OK')) return 'EN_PROD';
  
  return 'BACKLOG';
}

// Parser le fichier XLSX
export function parseXlsxFile(file: File): Promise<ImportedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const rows: ImportedRow[] = [];
        const sheetsToProcess = ['LISTE V1', 'LISTE EVALUEE A PRIORISER', 'RESTE A EVALUER EN H'];
        
        workbook.SheetNames.forEach((sheetName) => {
          // Filtrer les feuilles pertinentes
          const matchedSheet = sheetsToProcess.find(s => 
            sheetName.toUpperCase().includes(s.toUpperCase()) ||
            s.toUpperCase().includes(sheetName.toUpperCase())
          );
          
          if (!matchedSheet && !sheetsToProcess.some(s => sheetName.includes(s))) {
            // Traiter quand même si pas de filtre strict
          }
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) return;
          
          const headers = jsonData[0] as string[];
          
          for (let i = 1; i < jsonData.length; i++) {
            const rowData = jsonData[i];
            if (!rowData || rowData.length === 0) continue;
            
            const record: Record<string, string | number | null> = {};
            headers.forEach((header, idx) => {
              if (header && rowData[idx] !== undefined && rowData[idx] !== null && rowData[idx] !== '') {
                record[header] = rowData[idx];
              }
            });
            
            // Ignorer les lignes sans DESCRIPTIF ou ELEMENTS CONCERNES
            if (!record['DESCRIPTIF'] && !record['ELEMENTS CONCERNES']) continue;
            
            rows.push({
              sheetName,
              rowIndex: i + 1, // +1 car Excel commence à 1
              data: record,
            });
          }
        });
        
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Transformer une ligne en ticket
function rowToTicket(row: ImportedRow): ApogeeTicketInsert {
  const data = row.data;
  
  // Déterminer owner_side
  let ownerSide: 'HC' | 'APOGEE' | 'PARTAGE' | null = null;
  const priseEnCharge = String(data['PRISE EN CHARGE'] || '').toUpperCase();
  if (OWNER_MAPPING[priseEnCharge]) {
    ownerSide = OWNER_MAPPING[priseEnCharge];
  } else if (priseEnCharge.includes('DYNOCO') || priseEnCharge.includes('%')) {
    ownerSide = 'PARTAGE';
  }

  // Déterminer priorité
  const prioRaw = String(data['PRIO'] || '').toUpperCase().trim();
  const priority = PRIORITY_MAPPING[prioRaw] || null;

  return {
    element_concerne: String(data['ELEMENTS CONCERNES'] || data['DESCRIPTIF'] || 'Sans titre').substring(0, 255),
    description: data['DESCRIPTIF'] ? String(data['DESCRIPTIF']) : null,
    priority,
    action_type: data['ACTION'] ? String(data['ACTION']) : null,
    kanban_status: determineInitialStatus(data),
    owner_side: ownerSide,
    h_min: data['Temps mini'] || data['H Min'] ? Number(data['Temps mini'] || data['H Min']) : null,
    h_max: data['Temps maxi'] || data['H Max'] ? Number(data['Temps maxi'] || data['H Max']) : null,
    hca_code: data['HCA'] || data['CODE HCA'] ? String(data['HCA'] || data['CODE HCA']) : null,
    apogee_status_raw: data['APOGEE'] ? String(data['APOGEE']) : null,
    hc_status_raw: data['HC'] ? String(data['HC']) : null,
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
  if (data['COMMENTAIRE APOGÉE'] || data['COMMENTAIRE APOGEE']) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'APOGEE',
      author_name: 'Apogée',
      source_field: 'COMMENTAIRE_APOGEE',
      body: String(data['COMMENTAIRE APOGÉE'] || data['COMMENTAIRE APOGEE']),
    });
  }

  // Commentaire Florian
  if (data['COMMENTAIRE florian'] || data['COMMENTAIRE Florian'] || data['COMMENTAIRE FLORIAN']) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Florian',
      source_field: 'COMMENTAIRE_FLORIAN',
      body: String(data['COMMENTAIRE florian'] || data['COMMENTAIRE Florian'] || data['COMMENTAIRE FLORIAN']),
    });
  }

  // Commentaire Jérôme
  if (data['COMMENTAIRE Jérome'] || data['COMMENTAIRE Jérôme'] || data['COMMENTAIRE JEROME']) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Jérôme',
      source_field: 'COMMENTAIRE_JEROME',
      body: String(data['COMMENTAIRE Jérome'] || data['COMMENTAIRE Jérôme'] || data['COMMENTAIRE JEROME']),
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
