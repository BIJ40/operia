/**
 * Types pour le module Suivi RH
 */

export interface RHCollaborator {
  id: string;
  agency_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  type: 'TECHNICIEN' | 'ASSISTANTE' | 'DIRIGEANT' | 'COMMERCIAL' | 'AUTRE';
  role: string;
  hiring_date: string | null;
  leaving_date: string | null;
  apogee_user_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  epi_profile?: RHEpiProfile | null;
  competencies?: RHCompetencies | null;
  assets?: RHAssets | null;
  it_access?: RHItAccess | null;
}

export interface RHEpiProfile {
  id: string;
  collaborator_id: string;
  taille_haut: string | null;
  taille_bas: string | null;
  pointure: string | null;
  taille_gants: string | null;
  epi_requis: string[];
  epi_remis: string[];
  date_derniere_remise: string | null;
  date_renouvellement: string | null;
  statut_epi: 'OK' | 'TO_RENEW' | 'MISSING';
  notes_securite: string | null;
  created_at: string;
  updated_at: string;
}

export interface RHCompetencies {
  id: string;
  collaborator_id: string;
  habilitation_electrique_statut: string | null;
  habilitation_electrique_date: string | null;
  caces: CACESEntry[];
  autres_habilitations: HabilitationEntry[];
  derniere_maj: string;
  created_at: string;
  updated_at: string;
}

export interface CACESEntry {
  type: string;
  date: string;
  expiration?: string;
}

export interface HabilitationEntry {
  nom: string;
  date: string;
  expiration?: string;
}

export interface RHAssets {
  id: string;
  collaborator_id: string;
  vehicule_attribue: string | null;
  carte_carburant: boolean;
  numero_carte_carburant: string | null;
  carte_societe: boolean;
  tablette_telephone: string | null;
  imei: string | null;
  autres_equipements: EquipmentEntry[];
  created_at: string;
  updated_at: string;
}

export interface EquipmentEntry {
  nom: string;
  numero_serie?: string;
  date_attribution?: string;
}

export interface RHItAccess {
  id: string;
  collaborator_id: string;
  acces_outils: string[];
  identifiants_encrypted: string | null;
  notes_it: string | null;
  created_at: string;
  updated_at: string;
}

export interface RHTablePrefs {
  id: string;
  user_id: string;
  hidden_columns: string[];
  column_order: string[];
  created_at: string;
  updated_at: string;
}

export interface RHRequest {
  id: string;
  request_type: 'EPI_RENEWAL' | 'LEAVE' | 'DOCUMENT' | 'OTHER';
  employee_user_id: string;
  agency_id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
  payload: Record<string, unknown>;
  generated_letter_path: string | null;
  generated_letter_file_name: string | null;
  employee_can_download: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSignature {
  id: string;
  user_id: string;
  signature_svg: string;
  signature_png_base64: string | null;
  created_at: string;
  updated_at: string;
}

// Column definition for RH table
export interface RHColumnDef {
  id: string;
  label: string;
  category: 'essentiel' | 'rh' | 'securite' | 'competences' | 'parc' | 'it' | 'documents';
  accessor: (row: RHCollaborator) => string | number | boolean | null | undefined;
  sensitive?: boolean; // N2 strict fields
  defaultVisible?: boolean;
}

// Tab definitions
export type RHTabId = 'essentiel' | 'rh' | 'securite' | 'competences' | 'parc' | 'it' | 'documents';

export interface RHTab {
  id: RHTabId;
  label: string;
  icon: string;
}

export const RH_TABS: RHTab[] = [
  { id: 'essentiel', label: 'Essentiel', icon: 'User' },
  { id: 'rh', label: 'RH', icon: 'FileText' },
  { id: 'securite', label: 'Sécurité & EPI', icon: 'Shield' },
  { id: 'competences', label: 'Compétences', icon: 'Award' },
  { id: 'parc', label: 'Parc & Matériel', icon: 'Car' },
  { id: 'it', label: 'IT & Accès', icon: 'Laptop' },
  { id: 'documents', label: 'Documents', icon: 'FolderOpen' },
];
