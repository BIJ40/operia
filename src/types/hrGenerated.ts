/**
 * Types pour les documents RH générés - RH-P0-01
 */

export type StampType = 'logo' | 'signature' | 'cachet';

export interface AgencyStamp {
  id: string;
  agency_id: string;
  stamp_type: StampType;
  file_path: string;
  file_name: string;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GeneratedDocumentType = 
  | 'ATTESTATION_EMPLOYEUR' 
  | 'SOLDE_CONGES' 
  | 'CERTIFICAT_TRAVAIL' 
  | 'AUTRE';

export const GENERATED_DOCUMENT_TYPES: { value: GeneratedDocumentType; label: string }[] = [
  { value: 'ATTESTATION_EMPLOYEUR', label: "Attestation employeur" },
  { value: 'SOLDE_CONGES', label: "Solde de congés" },
  { value: 'CERTIFICAT_TRAVAIL', label: "Certificat de travail" },
  { value: 'AUTRE', label: "Autre document" },
];

export interface HRGeneratedDocument {
  id: string;
  request_id: string | null;
  agency_id: string;
  collaborator_id: string;
  document_type: GeneratedDocumentType;
  title: string;
  content: string | null;
  file_path: string;
  generated_by: string;
  generated_at: string;
  metadata: {
    validator_name?: string;
    agency_name?: string;
    employee_name?: string;
    has_stamp?: boolean;
  } | null;
}

export interface GenerateDocumentPayload {
  request_id?: string;
  document_type: GeneratedDocumentType;
  title: string;
  content: string;
  collaborator_id: string;
}

export interface GenerateDocumentResponse {
  success: boolean;
  data?: {
    generated_document_id: string;
    vault_document_id: string;
    file_path: string;
    file_name: string;
  };
  error?: string;
}
