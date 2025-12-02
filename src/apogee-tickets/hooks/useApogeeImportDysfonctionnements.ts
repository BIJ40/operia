/**
 * Hook spécifique pour l'import de l'onglet DYSFONCTIONNEMENTS
 * Structure: Colonne 1 = Description | Colonne 2 = COMMENTAIRE APOGÉE
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ImportResult, ApogeeTicketInsert, ApogeeTicketCommentInsert } from '../types';

export interface DysfonctionnementRow {
  rowIndex: number;
  description: string;
  commentaireApogee: string | null;
}

export function parseDysfonctionnementsSheet(file: File): Promise<{ rows: DysfonctionnementRow[], headers: string[], sheetName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Prendre le premier onglet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          resolve({ rows: [], headers: [], sheetName });
          return;
        }
        
        // Récupérer les headers (première ligne)
        const headers = (jsonData[0] || []).map((h: any) => String(h ?? '').trim());
        
        // Trouver les indices des colonnes
        const findIndex = (names: string[]) => {
          return headers.findIndex((h: string) => {
            const headerUpper = (h || '').toUpperCase();
            return names.some(n => headerUpper.includes(n.toUpperCase()));
          });
        };
        
        // Colonne 1 = Description (première colonne ou colonne avec "description/dysfonctionnement")
        let descIdx = findIndex(['DESCRIPTION', 'DYSFONCTIONNEMENT', 'PROBLEME', 'PROBLÈME']);
        if (descIdx === -1) descIdx = 0; // Par défaut première colonne
        
        // Colonne 2 = Commentaire Apogée
        let commentIdx = findIndex(['COMMENTAIRE APOGÉE', 'COMMENTAIRE APOGEE', 'COMMENTAIRE']);
        if (commentIdx === -1) commentIdx = 1; // Par défaut deuxième colonne
        
        const rows: DysfonctionnementRow[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const rowData = jsonData[i];
          if (!rowData || rowData.length === 0) continue;
          
          const getValue = (idx: number) => {
            if (idx < 0 || idx >= rowData.length) return null;
            const val = rowData[idx];
            if (val === undefined || val === null || val === '') return null;
            return String(val).trim();
          };
          
          const description = getValue(descIdx);
          
          // Skip lignes sans description
          if (!description) continue;
          
          rows.push({
            rowIndex: i + 1, // +1 pour correspondre à Excel (1-indexed + header)
            description,
            commentaireApogee: getValue(commentIdx),
          });
        }
        
        resolve({ rows, headers, sheetName });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function rowToTicket(row: DysfonctionnementRow): ApogeeTicketInsert {
  // Titre = description (première ligne si multiline)
  const cleanDesc = row.description.replace(/<br\/?>/gi, '\n');
  const firstLine = cleanDesc.split('\n')[0].substring(0, 255);
  
  return {
    element_concerne: firstLine,
    description: cleanDesc,
    module: null,
    module_area: null,
    action_type: null,
    kanban_status: 'BACKLOG',
    owner_side: 'HC',
    h_min: null,
    h_max: null,
    hca_code: null,
    source_sheet: 'DYSFONCTIONNEMENTS',
    source_row_index: row.rowIndex,
    external_key: `DYSFONCTIONNEMENTS#${row.rowIndex}`,
    created_from: 'IMPORT_DYSFONCTIONNEMENTS',
    needs_completion: true,
    heat_priority: 5,
    impact_tags: ['BUG'],
  };
}

function extractComments(row: DysfonctionnementRow, ticketId: string): ApogeeTicketCommentInsert[] {
  const comments: ApogeeTicketCommentInsert[] = [];
  
  // Commentaire Apogée
  if (row.commentaireApogee) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'APOGEE',
      author_name: 'Apogée',
      source_field: 'COMMENTAIRE_APOGEE',
      body: row.commentaireApogee.replace(/<br\/?>/gi, '\n'),
    });
  }
  
  return comments;
}

export function useApogeeImportDysfonctionnements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (rows: DysfonctionnementRow[]): Promise<ImportResult> => {
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
              .update(ticketData)
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
          result.errors.push(`Ligne ${row.rowIndex}: ${error.message}`);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      toast.success(`Import DYSFONCTIONNEMENTS terminé : ${result.created} créés, ${result.updated} mis à jour.`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} erreur(s) lors de l'import.`);
      }
      setIsImporting(false);
    },
    onError: (error) => {
      toast.error(`Erreur d'import : ${error.message}`);
      setIsImporting(false);
    },
  });

  return {
    parseDysfonctionnementsSheet,
    importRows: importMutation.mutate,
    isImporting,
    progress,
    result: importMutation.data,
    errors: importMutation.data?.errors || [],
  };
}
