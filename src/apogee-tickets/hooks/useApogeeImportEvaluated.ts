/**
 * Hook pour l'import des onglets:
 * - LISTE EVALUEE A PRIORISER
 * - RESTE A EVALUER EN H
 * 
 * Structure: ELEMENTS CONCERNES | PRIO | H Min | H Max | % Pris en charge Dynoco | CODE HCA | DESCRIPTIF | IMAGE | APOGEE | COMMENTAIRE APOGÉE | HC | COMMENTAIRE florian | COMMENTAIRE Jérome
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { ImportResult, ApogeeTicketInsert, ApogeeTicketCommentInsert, OwnerSide } from '../types';

export interface EvaluatedRow {
  rowIndex: number;
  sheetName: string; // 'LISTE_EVALUEE' ou 'RESTE_A_EVALUER'
  elementConcerne: string | null;
  prio: string | null; // A, B, C, NON, -
  hMin: string | null;
  hMax: string | null;
  priseEnChargeDynoco: string | null; // % pris en charge
  codeHCA: string | null;
  descriptif: string | null;
  image: string | null;
  apogeeStatus: string | null;
  commentaireApogee: string | null;
  hcStatus: string | null;
  commentaireFlorian: string | null;
  commentaireJerome: string | null;
}

// Mapping MODULE depuis element_concerne
const MODULE_MAPPING: Record<string, string> = {
  'RDV': 'RDV',
  'DEVIS': 'DEVIS',
  'FACTURES': 'FACTURES',
  'FACTURE': 'FACTURES',
  'DEVIS / FACTURE': 'DEVIS',
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
  'APPLI TECH': 'APPLI_TECH',
  'APPLICATION TECH': 'APPLI_TECH',
  'APPLICATION TECK': 'APPLI_TECH',
  'REGLEMENT': 'REGLEMENTS',
  'GENERAL': 'GENERAL',
  'COMMANDE': 'COMMANDES',
  'COMMANDES': 'COMMANDES',
  'BI': 'BI',
  'BASE ARTICLE': 'BASE_ARTICLE',
  'WORKFLOW': 'WORKFLOW',
  'MEDIATEQUE': 'MEDIATHEQUE',
  'TABLEAU D\'ACTIVITE': 'TABLEAU_ACTIVITE',
};

// Mapping statut APOGEE vers kanban_status
const STATUS_MAPPING: Record<string, string> = {
  'QUESTION': 'SPEC_A_FAIRE',
  'REPONDU JEROME': 'SPEC_A_FAIRE',
  'REPONDU FLORIAN': 'SPEC_A_FAIRE',
  'EN COURS': 'EN_DEV_APOGEE',
  'A DEVELOPPER': 'SPEC_A_FAIRE',
  'A TESTER': 'EN_TEST_HC',
  'OK': 'EN_PROD',
  'RESOLU': 'EN_PROD',
  'REPONSE': 'SPEC_A_FAIRE',
};

function normalizeModule(element: string | null): string | null {
  if (!element) return null;
  const upper = element.toUpperCase().trim();
  // Match exact d'abord
  if (MODULE_MAPPING[upper]) return MODULE_MAPPING[upper];
  // Chercher un module dans le texte
  for (const [key, value] of Object.entries(MODULE_MAPPING)) {
    if (upper.includes(key)) return value;
  }
  return null;
}

function normalizeStatus(apogeeStatus: string | null): string {
  if (!apogeeStatus) return 'IMPORT';
  const upper = apogeeStatus.toUpperCase().trim();
  return STATUS_MAPPING[upper] || 'BACKLOG';
}

function parseOwnerSide(percentage: string | null): OwnerSide | null {
  if (!percentage) return null;
  const cleaned = percentage.replace('%', '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    // Gestion des cas textuels
    const upper = cleaned.toUpperCase();
    if (upper === 'HC' || upper === '100') return 'HC';
    if (upper === 'APOGEE' || upper === 'APOGÉE' || upper === '0') return 'APOGEE';
    if (upper.includes('/')) return 'PARTAGE';
    return null;
  }
  if (num >= 100) return 'HC';
  if (num <= 0) return 'APOGEE';
  if (num === 50) return 'PARTAGE';
  if (num > 50) return 'HC'; // Majorité HC
  return 'APOGEE'; // Majorité Apogée
}

function parseNumber(val: string | null): number | null {
  if (!val) return null;
  // Gestion de "?" ou "infini"
  if (val === '?' || val.toLowerCase() === 'infini') return null;
  const cleaned = val.replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Calcul heat_priority basé sur PRIO (A, B, C, NON, -)
 * LISTE EVALUEE = tickets déjà évalués, priorité moyenne
 * RESTE A EVALUER = tickets non encore évalués, priorité basse
 */
function calculateHeatPriority(sheetName: string, prio: string | null): number {
  const isEvaluated = sheetName.includes('EVALUEE');
  const baseHeat = isEvaluated ? 4 : 2; // Évalué=4, Reste=2
  
  if (!prio) return baseHeat;
  const upper = prio.toUpperCase().trim();
  
  switch (upper) {
    case 'A': return isEvaluated ? 7 : 5;
    case 'B': return isEvaluated ? 5 : 4;
    case 'C': return isEvaluated ? 3 : 2;
    case 'NON': return 1; // Non prioritaire
    case '-': return baseHeat; // Non déterminé
    default: return baseHeat;
  }
}

export function parseEvaluatedSheet(file: File): Promise<{ rows: EvaluatedRow[], headers: string[], sheetName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Chercher l'onglet approprié
        const targetSheet = workbook.SheetNames.find(n => {
          const upper = n.toUpperCase();
          return upper.includes('LISTE') && upper.includes('EVALUEE') ||
                 upper.includes('RESTE') && upper.includes('EVALUER');
        });
        
        const sheetName = targetSheet || workbook.SheetNames[0];
        const isListeEvaluee = sheetName.toUpperCase().includes('LISTE');
        const normalizedSheetName = isListeEvaluee ? 'LISTE_EVALUEE' : 'RESTE_A_EVALUER';
        
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
        
        // Colonnes selon structure détectée
        const elementIdx = findIndex(['ELEMENTS CONCERNES', 'ELEMENT']);
        const prioIdx = findIndex(['PRIO']);
        const hMinIdx = findIndex(['H MIN', 'H Min']);
        const hMaxIdx = findIndex(['H MAX', 'H Max']);
        const priseEnChargeIdx = findIndex(['PRIS EN CHARGE', 'DYNOCO', '% PRIS']);
        const hcaIdx = findIndex(['CODE HCA', 'HCA']);
        const descriptifIdx = findIndex(['DESCRIPTIF']);
        const imageIdx = findIndex(['IMAGE']);
        const apogeeIdx = headers.findIndex(h => h.toUpperCase() === 'APOGEE' || h.toUpperCase() === 'APOGÉE');
        const commentApogeeIdx = findIndex(['COMMENTAIRE APOGÉE', 'COMMENTAIRE APOGEE']);
        const hcIdx = headers.findIndex(h => h.toUpperCase() === 'HC');
        const commentFlorianIdx = findIndex(['COMMENTAIRE FLORIAN', 'florian']);
        const commentJeromeIdx = findIndex(['COMMENTAIRE JÉROME', 'COMMENTAIRE JEROME', 'Jérome', 'Jerome']);
        
        console.log(`${normalizedSheetName} - Colonnes détectées:`, { 
          elementIdx, prioIdx, hMinIdx, hMaxIdx, descriptifIdx, commentApogeeIdx, commentFlorianIdx, commentJeromeIdx 
        });
        console.log('Headers:', headers);
        
        const rows: EvaluatedRow[] = [];
        
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
          
          // Skip lignes vides
          if (!elementConcerne && !descriptif) continue;
          // Skip lignes RECAP
          if (elementConcerne?.toUpperCase() === 'RECAP') continue;
          
          rows.push({
            rowIndex: i + 1,
            sheetName: normalizedSheetName,
            elementConcerne,
            prio: getValue(prioIdx),
            hMin: getValue(hMinIdx),
            hMax: getValue(hMaxIdx),
            priseEnChargeDynoco: getValue(priseEnChargeIdx),
            codeHCA: getValue(hcaIdx),
            descriptif,
            image: getValue(imageIdx),
            apogeeStatus: getValue(apogeeIdx),
            commentaireApogee: getValue(commentApogeeIdx),
            hcStatus: getValue(hcIdx),
            commentaireFlorian: getValue(commentFlorianIdx),
            commentaireJerome: getValue(commentJeromeIdx),
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

function rowToTicket(row: EvaluatedRow): ApogeeTicketInsert {
  const title = row.elementConcerne || row.descriptif?.split('\n')[0].substring(0, 100) || 'Sans titre';
  const heatPriority = calculateHeatPriority(row.sheetName, row.prio);
  
  return {
    element_concerne: title,
    description: row.descriptif || null,
    module: normalizeModule(row.elementConcerne),
    module_area: row.elementConcerne || null,
    priority: row.prio || null, // Stocker la prio originale (A, B, C, NON, -)
    action_type: row.apogeeStatus || null,
    kanban_status: normalizeStatus(row.apogeeStatus),
    owner_side: parseOwnerSide(row.priseEnChargeDynoco),
    h_min: parseNumber(row.hMin),
    h_max: parseNumber(row.hMax),
    hca_code: row.codeHCA || null,
    apogee_status_raw: row.apogeeStatus || null,
    hc_status_raw: row.hcStatus || null,
    source_sheet: row.sheetName,
    source_row_index: row.rowIndex,
    external_key: `${row.sheetName}#${row.rowIndex}`,
    created_from: 'IMPORT',
    needs_completion: !row.elementConcerne || !row.descriptif,
    heat_priority: heatPriority,
  };
}

function extractComments(row: EvaluatedRow, ticketId: string): ApogeeTicketCommentInsert[] {
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
      author_name: 'Florian d\'Haillecourt',
      source_field: 'COMMENTAIRE_FLORIAN',
      body: row.commentaireFlorian,
    });
  }
  
  if (row.commentaireJerome) {
    comments.push({
      ticket_id: ticketId,
      author_type: 'HC',
      author_name: 'Jérome Ducourneau',
      source_field: 'COMMENTAIRE_JEROME',
      body: row.commentaireJerome,
    });
  }
  
  return comments;
}

export function useApogeeImportEvaluated() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (rows: EvaluatedRow[]): Promise<ImportResult> => {
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
    parseEvaluatedSheet,
    importRows: importMutation.mutate,
    isImporting,
    progress,
    result: importMutation.data,
    errors: importMutation.data?.errors || [],
  };
}
