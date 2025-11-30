/**
 * Hook spécifique pour l'import de l'onglet LISTE V1
 * Colonnes: ELEMENTS CONCERNES | PRIO | ACTION | Temps mini | Temps maxi | PRISE EN CHARGE | HCA | DESCRIPTIF | IMAGE | APOGEE | COMMENTAIRE APOGÉE | HC | COMMENTAIRE florian | COMMENTAIRE Jérome
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ImportResult, ApogeeTicketInsert, ApogeeTicketCommentInsert, OwnerSide } from '../types';

export interface V1Row {
  rowIndex: number;
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
  commentaireJerome: string | null;
}

// Mapping PRIO Excel → priority ID DB
const PRIORITY_MAPPING: Record<string, string> = {
  'A': 'A',
  '1': 'A',
  'B': 'B',
  '2': 'B',
  'V1': 'V1',
  '3': 'V1',
  'PLUS TARD': 'PLUS_TARD',
  '-': 'PLUS_TARD',
};

// Mapping ACTION Excel → kanban_status DB
const ACTION_MAPPING: Record<string, string> = {
  'A FAIRE': 'SPEC_A_FAIRE',
  'À FAIRE': 'SPEC_A_FAIRE',
  'A ECHANGER': 'SPEC_A_FAIRE',
  'À ÉCHANGER': 'SPEC_A_FAIRE',
  'A CLASSIFIER': 'IMPORT',
  'À CLASSIFIER': 'IMPORT',
  'DEMANDE INFO': 'SPEC_A_FAIRE',
  'EN COURS': 'EN_DEV_APOGEE',
  'ATT MAJ': 'EN_DEV_APOGEE',
  'PRIO 1': 'SPEC_A_FAIRE',
  'PRIO 2': 'SPEC_A_FAIRE',
  'PLUS TARD': 'IMPORT',
};

// Mapping PRISE EN CHARGE → owner_side
const OWNER_MAPPING: Record<string, string> = {
  'HC': 'HC',
  '100': 'HC',
  'APOGEE': 'APOGEE',
  'APOGÉE': 'APOGEE',
  '0': 'APOGEE',
  '50/50': 'PARTAGE',
  '50': 'PARTAGE',
  '25/75': 'PARTAGE',
  '?': null,
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
  'GENERAL': 'AUTRE',
  'GÉNÉRAL': 'AUTRE',
  'COMMANDES': 'AUTRE',
  'REGLEMENT': 'AUTRE',
  'RÈGLEMENT': 'AUTRE',
  'NOTIFICATION': 'AUTRE',
  'WORKFLOW': 'AUTRE',
  'APPLI TECH': 'AUTRE',
  'OCR': 'AUTRE',
  'BASE ARTICLE': 'AUTRE',
  'COMPTA': 'AUTRE',
  'TABLEAU D\'ACTIVITE': 'AUTRE',
  'SAV': 'AUTRE',
};

function normalizeModule(module: string | null): string | null {
  if (!module) return null;
  const upper = module.toUpperCase().trim();
  return MODULE_MAPPING[upper] || null;
}

function normalizePriority(prio: string | null): string | null {
  if (!prio) return null;
  const upper = prio.toUpperCase().trim();
  return PRIORITY_MAPPING[upper] || null;
}

function normalizeStatus(action: string | null): string {
  if (!action) return 'IMPORT';
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

export function parseV1Sheet(file: File): Promise<{ rows: V1Row[], headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Chercher l'onglet "LISTE V1"
        const sheetName = workbook.SheetNames.find(n => 
          n.toUpperCase().includes('V1') || n.toUpperCase().includes('LISTE V1')
        ) || workbook.SheetNames[0];
        
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
        const commentJeromeIdx = findIndex(['COMMENTAIRE JÉROME', 'COMMENTAIRE JEROME']);
        
        const rows: V1Row[] = [];
        
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
            commentaireJerome: getValue(commentJeromeIdx),
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

function rowToTicket(row: V1Row): ApogeeTicketInsert {
  const title = row.elementConcerne || row.descriptif?.split('\n')[0].substring(0, 100) || 'Sans titre';
  
  return {
    element_concerne: title,
    description: row.descriptif || null,
    module: normalizeModule(row.elementConcerne),
    module_area: row.elementConcerne || null,
    priority: normalizePriority(row.prio),
    action_type: row.action || null,
    kanban_status: normalizeStatus(row.action),
    owner_side: normalizeOwner(row.priseEnCharge),
    h_min: parseNumber(row.tempsMin),
    h_max: parseNumber(row.tempsMax),
    hca_code: row.hca || null,
    apogee_status_raw: row.apogeeStatus || null,
    hc_status_raw: row.hcStatus || null,
    source_sheet: 'LISTE_V1',
    source_row_index: row.rowIndex,
    external_key: `LISTE_V1#${row.rowIndex}`,
    created_from: 'IMPORT',
    needs_completion: !row.elementConcerne || !row.prio,
  };
}

function extractComments(row: V1Row, ticketId: string): ApogeeTicketCommentInsert[] {
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
  
  if (row.commentaireJerome) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Jérôme',
      source_field: 'COMMENTAIRE_JEROME',
      body: row.commentaireJerome,
    });
  }
  
  return comments;
}

export function useApogeeImportV1() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (rows: V1Row[]): Promise<ImportResult> => {
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
      toast.success(`Import V1 terminé: ${result.created} créés, ${result.updated} mis à jour`);
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
    parseV1Sheet,
    importRows: importMutation.mutate,
    isImporting,
    progress,
    result: importMutation.data,
    errors: importMutation.data?.errors || [],
  };
}
