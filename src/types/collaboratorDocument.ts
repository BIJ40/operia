/**
 * Types pour les documents RH collaborateurs
 * NOTE: Portail salarié désactivé v0.8.3 - documents stockés en interne uniquement
 */

export type DocumentType =
  | 'PAYSLIP'
  | 'CONTRACT'
  | 'AVENANT'
  | 'ATTESTATION'
  | 'MEDICAL_VISIT'
  | 'SANCTION'
  | 'HR_NOTE'
  | 'OTHER';

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'PAYSLIP', label: 'Bulletin de paie' },
  { value: 'CONTRACT', label: 'Contrat de travail' },
  { value: 'AVENANT', label: 'Avenant' },
  { value: 'ATTESTATION', label: 'Attestation' },
  { value: 'MEDICAL_VISIT', label: 'Visite médicale' },
  { value: 'SANCTION', label: 'Sanction' },
  { value: 'HR_NOTE', label: 'Note RH' },
  { value: 'OTHER', label: 'Autre' },
];

// Legacy: conservé pour compatibilité DB, mais seul ADMIN_ONLY est utilisé
export type DocumentVisibility = 'ADMIN_ONLY' | 'EMPLOYEE_VISIBLE';

export interface CollaboratorDocument {
  id: string;
  collaborator_id: string;
  agency_id: string;
  doc_type: DocumentType;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  period_month: number | null;
  period_year: number | null;
  visibility: DocumentVisibility;
  subfolder: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollaboratorDocumentFormData {
  doc_type: DocumentType;
  title: string;
  description?: string;
  period_month?: number;
  period_year?: number;
  visibility: DocumentVisibility;
  subfolder?: string | null;
  file: File;
}
