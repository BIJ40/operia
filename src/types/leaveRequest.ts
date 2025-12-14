// Types pour les demandes de congés/absences

export type LeaveType = 'CP' | 'SANS_SOLDE' | 'EVENT' | 'MALADIE';
export type EventSubtype = 'MARIAGE' | 'NAISSANCE' | 'DECES';
export type LeaveStatus = 
  | 'DRAFT'
  | 'PENDING_MANAGER'
  | 'PENDING_JUSTIFICATIVE'
  | 'ACKNOWLEDGED'
  | 'APPROVED'
  | 'REFUSED'
  | 'CANCELLED'
  | 'CLOSED';

export interface LeaveRequest {
  id: string;
  collaborator_id: string;
  agency_id: string;
  type: LeaveType;
  event_subtype?: EventSubtype | null;
  start_date: string;
  end_date?: string | null;
  days_count?: number | null;
  status: LeaveStatus;
  requires_justification: boolean;
  justification_document_id?: string | null;
  manager_comment?: string | null;
  refusal_reason?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  CP: 'Congés Payés',
  SANS_SOLDE: 'Congés Sans Solde',
  EVENT: 'Événement Familial',
  MALADIE: 'Maladie',
};

export const EVENT_SUBTYPE_LABELS: Record<EventSubtype, string> = {
  MARIAGE: 'Mariage',
  NAISSANCE: 'Naissance',
  DECES: 'Décès',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_MANAGER: 'En attente de validation',
  PENDING_JUSTIFICATIVE: 'Justificatif requis',
  ACKNOWLEDGED: 'Pris en connaissance',
  APPROVED: 'Acceptée',
  REFUSED: 'Refusée',
  CANCELLED: 'Annulée',
  CLOSED: 'Clôturée',
};

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_MANAGER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PENDING_JUSTIFICATIVE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REFUSED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// Sous-dossiers pour le coffre-fort
export const LEAVE_SUBFOLDER_MAP: Record<LeaveType, string> = {
  CP: 'Congés payés',
  SANS_SOLDE: 'Congés sans solde',
  EVENT: 'Événements familiaux',
  MALADIE: 'Maladie',
};
