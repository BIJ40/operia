/**
 * Hook spécifique pour l'import de l'onglet BUGS
 * Structure: USER | Date | MODULE | DESCRIPTION DU PROBLEME | SCREEN | SCREEN | COMMENTAIRE APOGÉE | STATUT
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ImportResult, ApogeeTicketInsert, ApogeeTicketCommentInsert } from '../types';

export interface BugsRow {
  rowIndex: number;
  user: string | null;
  date: string | null;
  module: string | null;
  description: string;
  commentaireApogee: string | null;
  statut: string | null;
}

// Mapping STATUT Excel → kanban_status DB
const STATUS_MAPPING: Record<string, string> = {
  'A DEVELOPPER': 'EN_DEV_APOGEE',
  'À DÉVELOPPER': 'EN_DEV_APOGEE',
  'A INVESTIGUER': 'SPEC_A_FAIRE',
  'À INVESTIGUER': 'SPEC_A_FAIRE',
  'ATT MAJ': 'EN_DEV_APOGEE',
  'EN COURS': 'EN_DEV_APOGEE',
  'A TESTER': 'EN_TEST_HC',
  'À TESTER': 'EN_TEST_HC',
  'OK': 'EN_PROD',
  'RESOLU': 'EN_PROD',
  'RÉSOLU': 'EN_PROD',
  'ABANDONNE': 'ABANDONNE',
  'ABANDONNÉ': 'ABANDONNE',
};

// Mapping MODULE Excel → module ID DB
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
  'AUTRE': 'AUTRE',
  'FOURNISSEURS': 'AUTRE',
  'PRODUITS': 'AUTRE',
  'INTERVENANTS': 'AUTRE',
  'COMPTABILITE': 'AUTRE',
  'GENERAL': 'AUTRE',
};

function normalizeModule(module: string | null): string | null {
  if (!module) return null;
  const upper = module.toUpperCase().trim();
  return MODULE_MAPPING[upper] || null; // NULL si pas trouvé (pas de FK violation)
}

function normalizeStatus(statut: string | null): string {
  if (!statut) return 'IMPORT';
  const upper = statut.toUpperCase().trim();
  return STATUS_MAPPING[upper] || 'BACKLOG';
}

export function parseBugsSheet(file: File): Promise<{ rows: BugsRow[], headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Prendre le premier onglet (BUGS)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          resolve({ rows: [], headers: [] });
          return;
        }
        
        // Récupérer les headers
        const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
        
        // Trouver les indices des colonnes
        const findIndex = (names: string[]) => {
          return headers.findIndex(h => 
            names.some(n => h.toUpperCase().includes(n.toUpperCase()))
          );
        };
        
        const userIdx = findIndex(['USER']);
        const dateIdx = findIndex(['DATE']);
        const moduleIdx = findIndex(['MODULE']);
        const descIdx = findIndex(['DESCRIPTION DU PROBLEME', 'DESCRIPTION']);
        const commentIdx = findIndex(['COMMENTAIRE APOGÉE', 'COMMENTAIRE APOGEE']);
        const statutIdx = findIndex(['STATUT']);
        
        const rows: BugsRow[] = [];
        
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
            user: getValue(userIdx),
            date: getValue(dateIdx),
            module: getValue(moduleIdx),
            description,
            commentaireApogee: getValue(commentIdx),
            statut: getValue(statutIdx),
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

function rowToTicket(row: BugsRow): ApogeeTicketInsert {
  // Titre = description (première ligne si multiline)
  const firstLine = row.description.split('\n')[0].split('<br>')[0].substring(0, 255);
  const normalizedModule = normalizeModule(row.module);
  
  // Calcul heat_priority pour BUGS (5 par défaut, ajusté selon statut)
  let heatPriority = 5;
  const statut = (row.statut || '').toLowerCase();
  if (statut.includes('urgent') || statut.includes('bloquant')) heatPriority = 11;
  else if (statut.includes('critique')) heatPriority = 9;
  else if (statut.includes('important')) heatPriority = 7;
  
  return {
    element_concerne: firstLine,
    description: row.description,
    module: normalizedModule,
    module_area: row.module || null,
    priority: null,
    action_type: row.statut || null,
    kanban_status: normalizeStatus(row.statut),
    owner_side: 'HC',
    h_min: null,
    h_max: null,
    hca_code: null,
    apogee_status_raw: row.statut || null,
    hc_status_raw: null,
    source_sheet: 'BUGS',
    source_row_index: row.rowIndex,
    external_key: `BUGS#${row.rowIndex}`,
    created_from: 'IMPORT_BUGS',
    needs_completion: !row.module,
    heat_priority: heatPriority,
    impact_tags: ['BUG'], // Auto-tag avec BUG pour l'import BUGS
  };
}

function extractComments(row: BugsRow, ticketId: string): ApogeeTicketCommentInsert[] {
  const comments: ApogeeTicketCommentInsert[] = [];
  
  // Commentaire Apogée
  if (row.commentaireApogee) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'APOGEE',
      author_name: 'Apogée',
      source_field: 'COMMENTAIRE_APOGEE',
      body: row.commentaireApogee,
    });
  }
  
  // Ajouter l'utilisateur qui a signalé comme info
  if (row.user) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: row.user,
      source_field: 'USER',
      body: `Signalé par ${row.user}${row.date ? ` le ${row.date}` : ''}`,
    });
  }
  
  return comments;
}

export function useApogeeImportBugs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (rows: BugsRow[]): Promise<ImportResult> => {
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
      toast.success(`Import BUGS terminé : ${result.created} créés, ${result.updated} mis à jour.`);
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
    parseBugsSheet,
    importRows: importMutation.mutate,
    isImporting,
    progress,
    result: importMutation.data,
    errors: importMutation.data?.errors || [],
  };
}
