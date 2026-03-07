/**
 * Utilitaires d'export du Kanban Apogée
 * Formats supportés: CSV, Excel (.xlsx), PDF
 */

import type * as XLSXType from 'xlsx';
import jsPDF from 'jspdf';
import type { ApogeeTicket, ApogeeTicketStatus, ApogeeModule, ApogeePriority, ApogeeOwnerSide } from '../types';

// Liste des colonnes à exporter
const EXPORT_COLUMNS = [
  // Identité
  { key: 'ticket_ref', label: 'Réf' },
  { key: 'id', label: 'ID' },
  { key: 'element_concerne', label: 'Titre' },
  { key: 'description', label: 'Description' },
  
  // Classification
  { key: 'kanban_status', label: 'Statut Kanban' },
  { key: 'module', label: 'Module' },
  { key: 'module_area', label: 'Sous-module' },
  { key: 'priority', label: 'Priorité (brute)' },
  { key: 'heat_priority', label: 'Priorité thermique (0-12)' },
  { key: 'severity', label: 'Sévérité' },
  { key: 'action_type', label: 'Type action' },
  
  // PEC / Ownership
  { key: 'owner_side', label: 'PEC (Porté par)' },
  { key: 'reported_by', label: 'Origine / Rapporté par' },
  
  // Estimation temps
  { key: 'h_min', label: 'Heures min' },
  { key: 'h_max', label: 'Heures max' },
  
  // Qualification IA
  { key: 'theme', label: 'Thème (IA)' },
  { key: 'ticket_type', label: 'Type ticket (IA)' },
  { key: 'qualif_status', label: 'Statut qualification' },
  { key: 'is_qualified', label: 'Qualifié IA' },
  { key: 'qualified_at', label: 'Date qualification' },
  { key: 'notes_internes', label: 'Notes internes' },
  
  // Traçabilité import
  { key: 'created_from', label: 'Créé depuis' },
  { key: 'source_sheet', label: 'Feuille source' },
  { key: 'source_row_index', label: 'Ligne source' },
  { key: 'external_key', label: 'Clé externe' },
  { key: 'hca_code', label: 'Code HCA' },
  { key: 'apogee_status_raw', label: 'Statut Apogée (brut)' },
  { key: 'hc_status_raw', label: 'Statut HC (brut)' },
  { key: 'original_title', label: 'Titre original' },
  { key: 'original_description', label: 'Description originale' },
  
  // Méta
  { key: 'needs_completion', label: 'À compléter' },
  { key: 'created_at', label: 'Date création' },
  { key: 'updated_at', label: 'Date modification' },
];

interface ExportOptions {
  tickets: ApogeeTicket[];
  statuses: ApogeeTicketStatus[];
  modules: ApogeeModule[];
  priorities: ApogeePriority[];
  ownerSides: ApogeeOwnerSide[];
}

// Formater une valeur pour l'export
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (value instanceof Date) return value.toLocaleDateString('fr-FR');
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return String(value);
}

// Obtenir le label d'un statut
function getStatusLabel(statusId: string, statuses: ApogeeTicketStatus[]): string {
  return statuses.find(s => s.id === statusId)?.label || statusId;
}

// Obtenir le label d'un module
function getModuleLabel(moduleId: string | null, modules: ApogeeModule[]): string {
  if (!moduleId) return '';
  return modules.find(m => m.id === moduleId)?.label || moduleId;
}

// Obtenir le label d'une priorité
function getPriorityLabel(priorityId: string | null, priorities: ApogeePriority[]): string {
  if (!priorityId) return '';
  return priorities.find(p => p.id === priorityId)?.label || priorityId;
}

// Obtenir le label d'un owner side
function getOwnerSideLabel(ownerSideId: string | null, ownerSides: ApogeeOwnerSide[]): string {
  if (!ownerSideId) return '';
  return ownerSides.find(o => o.id === ownerSideId)?.label || ownerSideId;
}

// Formater la référence ticket
function formatTicketRef(ticketNumber: number): string {
  return `APO-${String(ticketNumber || 0).padStart(3, '0')}`;
}

// Transformer un ticket en ligne exportable
function ticketToRow(
  ticket: ApogeeTicket,
  statuses: ApogeeTicketStatus[],
  modules: ApogeeModule[],
  priorities: ApogeePriority[],
  ownerSides: ApogeeOwnerSide[]
): Record<string, string> {
  const row: Record<string, string> = {};
  const ticketData = ticket as unknown as Record<string, unknown>;
  
  for (const col of EXPORT_COLUMNS) {
    let value: unknown = ticketData[col.key];
    
    // Résoudre la référence ticket
    if (col.key === 'ticket_ref') {
      value = formatTicketRef(ticket.ticket_number);
    }
    // Résoudre les labels pour les clés étrangères
    else if (col.key === 'kanban_status') {
      value = getStatusLabel(ticket.kanban_status, statuses);
    } else if (col.key === 'module') {
      value = getModuleLabel(ticket.module, modules);
    } else if (col.key === 'priority') {
      value = getPriorityLabel(ticket.priority, priorities);
    } else if (col.key === 'owner_side') {
      value = getOwnerSideLabel(ticket.owner_side, ownerSides);
    }
    
    row[col.label] = formatValue(value);
  }
  
  return row;
}

// Organiser les tickets par colonne Kanban
function organizeByKanban(
  tickets: ApogeeTicket[],
  statuses: ApogeeTicketStatus[]
): Map<string, ApogeeTicket[]> {
  const byStatus = new Map<string, ApogeeTicket[]>();
  
  // Initialiser toutes les colonnes
  for (const status of statuses) {
    byStatus.set(status.id, []);
  }
  
  // Distribuer les tickets
  for (const ticket of tickets) {
    const list = byStatus.get(ticket.kanban_status);
    if (list) {
      list.push(ticket);
    }
  }
  
  return byStatus;
}

// ============ EXPORT CSV ============

export function exportToCSV(options: ExportOptions): void {
  const { tickets, statuses, modules, priorities, ownerSides } = options;
  
  // Préparer les données
  const rows = tickets.map(t => ticketToRow(t, statuses, modules, priorities, ownerSides));
  
  if (rows.length === 0) {
    console.warn('Aucun ticket à exporter');
    return;
  }
  
  // Construire le CSV
  const headers = EXPORT_COLUMNS.map(c => c.label);
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(';')),
  ].join('\n');
  
  // Télécharger
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `kanban-apogee-${formatDateForFilename()}.csv`);
}

// ============ EXPORT EXCEL ============

export function exportToExcel(options: ExportOptions): void {
  const { tickets, statuses, modules, priorities, ownerSides } = options;
  
  const workbook = XLSX.utils.book_new();
  
  // Feuille 1: Vue complète (tous les tickets)
  const allRows = tickets.map(t => ticketToRow(t, statuses, modules, priorities, ownerSides));
  if (allRows.length > 0) {
    const wsAll = XLSX.utils.json_to_sheet(allRows);
    XLSX.utils.book_append_sheet(workbook, wsAll, 'Tous les tickets');
  }
  
  // Une feuille par colonne Kanban
  const byKanban = organizeByKanban(tickets, statuses);
  for (const status of statuses) {
    const statusTickets = byKanban.get(status.id) || [];
    if (statusTickets.length > 0) {
      const statusRows = statusTickets.map(t => ticketToRow(t, statuses, modules, priorities, ownerSides));
      const ws = XLSX.utils.json_to_sheet(statusRows);
      // Nom de feuille max 31 chars
      const sheetName = status.label.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    }
  }
  
  // Télécharger
  XLSX.writeFile(workbook, `kanban-apogee-${formatDateForFilename()}.xlsx`);
}

// ============ EXPORT PDF ============

export function exportToPDF(options: ExportOptions): void {
  const { tickets, statuses, modules, priorities, ownerSides } = options;
  
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = margin;
  
  // Titre
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Export Kanban Apogée', margin, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - ${tickets.length} tickets`, margin, y + 6);
  y += 15;
  
  // Organiser par Kanban
  const byKanban = organizeByKanban(tickets, statuses);
  
  // Colonnes principales à afficher dans le PDF
  const pdfColumns = [
    { key: 'ticket_ref', label: 'Réf', width: 20 },
    { key: 'element_concerne', label: 'Titre', width: 55 },
    { key: 'module', label: 'Module', width: 25 },
    { key: 'heat_priority', label: 'Prio', width: 12 },
    { key: 'owner_side', label: 'PEC', width: 18 },
    { key: 'h_min', label: 'H min', width: 12 },
    { key: 'h_max', label: 'H max', width: 12 },
    { key: 'reported_by', label: 'Origine', width: 22 },
  ];
  
  const totalWidth = pdfColumns.reduce((sum, c) => sum + c.width, 0);
  
  for (const status of statuses) {
    const statusTickets = byKanban.get(status.id) || [];
    if (statusTickets.length === 0) continue;
    
    // Nouvelle page si nécessaire
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }
    
    // Titre de la colonne Kanban
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(margin, y, totalWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`${status.label} (${statusTickets.length})`, margin + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 9;
    
    // En-têtes
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, totalWidth, 5, 'F');
    let x = margin;
    for (const col of pdfColumns) {
      doc.text(col.label, x + 1, y + 3.5);
      x += col.width;
    }
    y += 6;
    
    // Lignes
    doc.setFont('helvetica', 'normal');
    for (const ticket of statusTickets) {
      if (y > pageHeight - 15) {
        doc.addPage();
        y = margin;
      }
      
      const row = ticketToRow(ticket, statuses, modules, priorities, ownerSides);
      x = margin;
      
      // Alternance couleurs
      const rowIndex = statusTickets.indexOf(ticket);
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 1, totalWidth, 5, 'F');
      }
      
      for (const col of pdfColumns) {
        let text = row[col.label] || '';
        // Tronquer si trop long
        const maxChars = Math.floor(col.width / 2);
        if (text.length > maxChars) {
          text = text.substring(0, maxChars - 2) + '...';
        }
        doc.text(text, x + 1, y + 2.5);
        x += col.width;
      }
      y += 5;
    }
    
    y += 5; // Espace entre sections
  }
  
  // Télécharger
  doc.save(`kanban-apogee-${formatDateForFilename()}.pdf`);
}

// ============ HELPERS ============

function formatDateForFilename(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
