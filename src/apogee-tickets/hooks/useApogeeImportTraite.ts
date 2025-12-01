/**
 * Hook pour l'import de l'onglet TRAITÉ
 * Structure: origine | module | objet | description | commentaires | commentaires/échanges
 * Les tickets sont importés directement en statut EN_PROD (DONE)
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ImportResult, ApogeeTicketInsert, ApogeeTicketCommentInsert } from '../types';

export interface TraiteRow {
  rowIndex: number;
  origine: string | null;
  module: string | null;
  objet: string | null;
  description: string | null;
  commentaires: string | null;
  commentairesEchanges: string | null;
}

// Mapping MODULE vers IDs valides dans apogee_modules
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
  'FICHE CLIENT': 'CLIENTS',
  'APPORTEURS': 'APPORTEURS',
  'APPORTEUR': 'APPORTEURS',
  'STATS': 'STATS',
  'STATISTIQUES': 'STATS',
  'APPLI TECH': 'APP_TECH',
  'APPLICATION TECH': 'APP_TECH',
  'REGLEMENT': 'REGLEMENT',
  'REGLEMENTS': 'REGLEMENT',
  'GENERAL': 'ALL',
  'COMMANDE': 'ORDER',
  'COMMANDES': 'ORDER',
  'BI': 'STATS',
  'BASE ARTICLE': 'ARTICLES',
  'ARTICLES': 'ARTICLES',
  'COMPTABILITE': 'COMPTA',
  'COMPTA': 'COMPTA',
  'DOMUS': 'DOSSIERS',
  'MEDIATÈQUE': 'ARTICLES',
  'V3': 'ALL',
};

function normalizeModule(module: string | null): string | null {
  if (!module) return null;
  const upper = module.toUpperCase().trim();
  // Match exact d'abord
  if (MODULE_MAPPING[upper]) return MODULE_MAPPING[upper];
  // Chercher un module dans le texte
  for (const [key, value] of Object.entries(MODULE_MAPPING)) {
    if (upper.includes(key)) return value;
  }
  return null;
}

export function parseTraiteSheet(file: File): Promise<{ rows: TraiteRow[], headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          resolve({ rows: [], headers: [] });
          return;
        }
        
        const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
        
        const findIndex = (names: string[]) => {
          return headers.findIndex(h => 
            names.some(n => h.toUpperCase().includes(n.toUpperCase()))
          );
        };
        
        // Colonnes selon structure détectée
        const origineIdx = findIndex(['ORIGINE']);
        const moduleIdx = findIndex(['MODUE', 'MODULE']); // Attention à la faute "modue"
        const objetIdx = findIndex(['OBJET']);
        const descriptionIdx = findIndex(['DESCRIPTION']);
        const commentairesIdx = findIndex(['COMMENTAIRES']) !== -1 ? 
          headers.findIndex((h, i) => h.toUpperCase().includes('COMMENTAIRES') && i < 10) : -1;
        const echangesIdx = findIndex(['ÉCHANGES', 'ECHANGES']);
        
        const rows: TraiteRow[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const rowData = jsonData[i];
          if (!rowData || rowData.length === 0) continue;
          
          const getValue = (idx: number) => {
            if (idx < 0 || idx >= rowData.length) return null;
            const val = rowData[idx];
            if (val === undefined || val === null || val === '') return null;
            return String(val).trim();
          };
          
          const objet = getValue(objetIdx);
          const description = getValue(descriptionIdx);
          
          // Skip lignes vides ou sans contenu significatif
          if (!objet && !description) continue;
          
          rows.push({
            rowIndex: i + 1,
            origine: getValue(origineIdx),
            module: getValue(moduleIdx),
            objet,
            description,
            commentaires: getValue(commentairesIdx),
            commentairesEchanges: getValue(echangesIdx),
          });
        }
        
        resolve({ rows, headers });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function rowToTicket(row: TraiteRow): ApogeeTicketInsert {
  const title = row.objet || row.description?.split('\n')[0].substring(0, 100) || 'Sans titre';
  
  return {
    element_concerne: title,
    description: row.description || null,
    module: normalizeModule(row.module),
    module_area: row.module || null,
    kanban_status: 'EN_PROD', // DONE - Tickets déjà traités
    is_qualified: true, // Tickets déjà traités sont qualifiés
    reported_by: row.origine || null,
    source_sheet: 'TRAITE',
    source_row_index: row.rowIndex,
    external_key: `TRAITE#${row.rowIndex}`,
    created_from: 'IMPORT_TRAITE',
    needs_completion: !row.objet || !row.description,
    heat_priority: 3, // Priorité basse pour tickets déjà traités
  };
}

function extractComments(row: TraiteRow, ticketId: string): ApogeeTicketCommentInsert[] {
  const comments: ApogeeTicketCommentInsert[] = [];
  
  if (row.commentaires) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Import',
      source_field: 'COMMENTAIRES',
      body: row.commentaires,
    });
  }
  
  if (row.commentairesEchanges) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Import',
      source_field: 'COMMENTAIRES_ECHANGES',
      body: row.commentairesEchanges,
    });
  }
  
  return comments;
}

export function useApogeeImportTraite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (rows: TraiteRow[]): Promise<ImportResult> => {
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
    parseTraiteSheet,
    importRows: importMutation.mutate,
    isImporting,
    progress,
    result: importMutation.data,
    errors: importMutation.data?.errors || [],
  };
}
