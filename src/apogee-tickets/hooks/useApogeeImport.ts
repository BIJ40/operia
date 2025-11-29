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
  // Élément concerné (titre principal)
  element_concerne: [
    'ELEMENTS CONCERNES', 'ELEMENT CONCERNE', 'ÉLÉMENT CONCERNÉ', 'ÉLÉMENTS CONCERNÉS', 
    'Élément concerné', 'Éléments concernés', 'MODULE', 'Module'
  ],
  // Description du problème / demande
  description: [
    'DESCRIPTIF', 'Descriptif', 'DESCRIPTION', 'Description',
    'DESCRIPTION DU PROBLEME', 'DESCRIPTION DU PROBLÈME', 'Description du problème',
  ],
  // Priorité
  priority: ['PRIO', 'Prio', 'PRIORITE', 'PRIORITÉ', 'Priorité', '1', '2', '3'],
  // Type d'action / statut workflow
  action_type: ['ACTION', 'Action', 'TYPE ACTION', 'STATUT', 'Statut'],
  // Heures min/max estimées
  h_min: ['Temps mini', 'TEMPS MINI', 'H Min', 'H MIN', 'H_MIN', 'Min', 'Hmin'],
  h_max: ['Temps maxi', 'TEMPS MAXI', 'H Max', 'H MAX', 'H_MAX', 'Max', 'Hmax'],
  // Prise en charge (HC / Apogée / Partagé)
  owner_side: [
    'PRISE EN CHARGE', 'Prise en charge', 'PEC', 'OWNER',
    '% Pris en charge Dynoco', '% Pris en charge', 'Dynoco'
  ],
  // Code HCA (plan de charge)
  hca_code: ['HCA', 'CODE HCA', 'Code HCA', 'CODE HCA (plan de charge)', 'code HCA'],
  // Statut côté Apogée
  apogee_status: [
    'APOGEE', 'Apogee', 'APOGÉE', 'Apogée', 
    'STATUT APOGEE', 'STATUT APOGÉE', 'ACTION APOGEE', 'ACTION APOGÉE'
  ],
  // Statut côté HC
  hc_status: ['HC', 'STATUT HC', 'Statut HC'],
  // Module concerné
  module: ['MODULE', 'Module', 'RUBRIQUE', 'USER', 'User'],
  // Commentaires importés
  comment_apogee: [
    'COMMENTAIRE APOGÉE', 'COMMENTAIRE APOGEE', 'Commentaire Apogée', 'Commentaire Apogee'
  ],
  comment_florian: [
    'COMMENTAIRE florian', 'COMMENTAIRE Florian', 'COMMENTAIRE FLORIAN', 
    'Florian', 'florian'
  ],
  comment_jerome: [
    'COMMENTAIRE Jérome', 'COMMENTAIRE Jérôme', 'COMMENTAIRE Jerome', 
    'COMMENTAIRE JEROME', 'Jérôme', 'Jerome', 'jérôme'
  ],
  comment_hc: ['HC', 'COMMENTAIRE HC', 'Commentaire HC'],
  // Utilisateur / demandeur
  user: ['USER', 'User', 'UTILISATEUR', 'Utilisateur', 'DEMANDEUR', 'Demandeur'],
  // Image / Screenshot
  image: ['SCREEN', 'IMAGE', 'Image', 'Screen', 'SCREENSHOT'],
};

// Mapping des priorités Excel vers les IDs en base
const PRIORITY_MAPPING: Record<string, string> = {
  'A': 'A',
  'B': 'B',
  'C': 'B',  // Pas de C, on mappe vers B
  '1': 'A',
  '2': 'B',
  '3': 'V1',
  'PRIO 1': 'A',
  'PRIO 2': 'B',
  'PRIO 3': 'V1',
  'V1': 'V1',
  '-': 'PLUS_TARD',
  'NON': 'PLUS_TARD',
  'PLUS TARD': 'PLUS_TARD',
};

// Mapping des owner_side
const OWNER_MAPPING: Record<string, 'HC' | 'APOGEE' | 'PARTAGE'> = {
  'HC': 'HC',
  '0': 'HC',
  '100': 'HC',
  'APOGEE': 'APOGEE',
  'APOGÉE': 'APOGEE',
  '%': 'PARTAGE',
  'PARTAGE': 'PARTAGE',
  'DYNOCO': 'PARTAGE',
  '50/50': 'PARTAGE',
  '50': 'PARTAGE',
  '25/75': 'PARTAGE',
  '75/25': 'PARTAGE',
  '?': null,
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
  const moduleValue = findColumnValue(data, 'module');
  const userValue = findColumnValue(data, 'user');
  
  // Déterminer owner_side
  let ownerSide: 'HC' | 'APOGEE' | 'PARTAGE' | null = null;
  const priseEnCharge = String(findColumnValue(data, 'owner_side') || '').toUpperCase().trim();
  if (priseEnCharge && OWNER_MAPPING[priseEnCharge] !== undefined) {
    ownerSide = OWNER_MAPPING[priseEnCharge];
  } else if (priseEnCharge.includes('DYNOCO') || priseEnCharge.includes('%') || priseEnCharge.includes('/')) {
    ownerSide = 'PARTAGE';
  } else if (priseEnCharge === '100' || priseEnCharge === '0') {
    ownerSide = 'HC';
  }

  // Déterminer priorité (normaliser les valeurs)
  let priority: string | null = null;
  if (prioRaw) {
    priority = PRIORITY_MAPPING[prioRaw] || prioRaw;
  }

  // Calculer heat_priority basé sur source_sheet et priority
  const heatPriority = calculateHeatPriorityFromRow(row.sheetName, prioRaw);

  // Construire le titre: element_concerne > module > description
  let title = 'Sans titre';
  if (elementConcerne && elementConcerne !== moduleValue) {
    title = String(elementConcerne).substring(0, 255);
  } else if (description) {
    // Prendre le premier segment significatif de la description
    const descStr = String(description);
    const firstLine = descStr.split('\n')[0].split('<br>')[0];
    title = firstLine.substring(0, 255);
  } else if (moduleValue) {
    title = String(moduleValue).substring(0, 255);
  }

  // Module/area: utiliser module s'il existe, sinon element_concerne pour certaines feuilles
  const moduleArea = moduleValue ? String(moduleValue) : null;

  return {
    element_concerne: title,
    description: description ? String(description) : null,
    priority,
    action_type: actionType ? String(actionType) : null,
    kanban_status: determineInitialStatus(data),
    owner_side: ownerSide,
    h_min: hMin ? parseFloat(String(hMin).replace(',', '.')) : null,
    h_max: hMax ? parseFloat(String(hMax).replace(',', '.')) : null,
    hca_code: hcaCode ? String(hcaCode) : null,
    apogee_status_raw: apogeeStatus ? String(apogeeStatus) : null,
    hc_status_raw: hcStatus ? String(hcStatus) : null,
    module_area: moduleArea,
    source_sheet: row.sheetName,
    source_row_index: row.rowIndex,
    external_key: `${row.sheetName}#${row.rowIndex}`,
    created_from: 'IMPORT',
    heat_priority: heatPriority,
  };
}

/**
 * Calcule la priorité thermique (0-12) basée sur l'onglet source et la priorité
 * Règles:
 * - Priorités A: x1=10, x2=9, x3=8
 * - Priorités B: x1=7, x2=6, x3=5
 * - Liste évaluée: C=4, sans prio=3
 * - LISTE V1: 3
 */
function calculateHeatPriorityFromRow(sourceSheet: string, priority: string): number {
  const sheet = (sourceSheet || '').toLowerCase();
  const prio = (priority || '').toLowerCase();

  // Priorités A
  if (sheet.includes('priorit') && sheet.includes('a')) {
    if (prio.includes('x1') || prio === '1' || prio === 'a') return 10;
    if (prio.includes('x2') || prio === '2') return 9;
    if (prio.includes('x3') || prio === '3') return 8;
    return 9; // Défaut A
  }

  // Priorités B
  if (sheet.includes('priorit') && sheet.includes('b')) {
    if (prio.includes('x1') || prio === '1' || prio === 'b') return 7;
    if (prio.includes('x2') || prio === '2') return 6;
    if (prio.includes('x3') || prio === '3') return 5;
    return 6; // Défaut B
  }

  // Liste évaluée à prioriser
  if (sheet.includes('évalué') || sheet.includes('evalué') || sheet.includes('prioriser')) {
    if (prio.includes('c')) return 4;
    return 3;
  }

  // LISTE V1 
  if (sheet.includes('v1')) return 3;

  // Défaut
  return 3;
}

// Extraire les commentaires d'une ligne
function extractComments(row: ImportedRow, ticketId: string): ApogeeTicketCommentInsert[] {
  const comments: ApogeeTicketCommentInsert[] = [];
  const data = row.data;

  // Commentaire Apogée
  const commentApogee = findColumnValue(data, 'comment_apogee');
  if (commentApogee && String(commentApogee).trim()) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'APOGEE',
      author_name: 'Apogée',
      source_field: 'COMMENTAIRE_APOGEE',
      body: String(commentApogee),
    });
  }

  // Commentaire HC (colonne HC des feuilles)
  const commentHC = findColumnValue(data, 'comment_hc');
  if (commentHC && String(commentHC).trim() && commentHC !== commentApogee) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'HelpConfort',
      source_field: 'COMMENTAIRE_HC',
      body: String(commentHC),
    });
  }

  // Commentaire Florian
  const commentFlorian = findColumnValue(data, 'comment_florian');
  if (commentFlorian && String(commentFlorian).trim()) {
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
  if (commentJerome && String(commentJerome).trim()) {
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
