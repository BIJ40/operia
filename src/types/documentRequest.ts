/**
 * Types pour les demandes de documents RH - Phase 2.2
 */

export type DocumentRequestType =
  | 'ATTESTATION_EMPLOYEUR'
  | 'SOLDE_CONGES'
  | 'DUPLICATA_BULLETIN'
  | 'AUTRE';

export const DOCUMENT_REQUEST_TYPES: { value: DocumentRequestType; label: string }[] = [
  { value: 'ATTESTATION_EMPLOYEUR', label: "Attestation employeur" },
  { value: 'SOLDE_CONGES', label: "Solde de congés" },
  { value: 'DUPLICATA_BULLETIN', label: "Duplicata de bulletin de paie" },
  { value: 'AUTRE', label: "Autre demande" },
];

export type DocumentRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export const DOCUMENT_REQUEST_STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Traité',
  REJECTED: 'Refusé',
};

export interface DocumentRequest {
  id: string;
  collaborator_id: string;
  agency_id: string;
  request_type: DocumentRequestType;
  description: string | null;
  status: DocumentRequestStatus;
  requested_at: string;
  processed_at: string | null;
  response_note: string | null;
  response_document_id: string | null;
  processed_by: string | null;
  employee_seen_at: string | null;
  created_at: string;
}

// Document linked as response - now references media_assets
export interface MediaAssetRef {
  id: string;
  file_name: string;
  file_path: string;
}

export interface DocumentRequestWithUnread extends DocumentRequest {
  is_unread: boolean;
  response_document?: MediaAssetRef | null;
}

export interface DocumentRequestWithDoc extends DocumentRequest {
  response_document?: MediaAssetRef | null;
}
