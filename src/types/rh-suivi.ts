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
  type: 'TECHNICIEN' | 'ADMINISTRATIF' | 'DIRIGEANT' | 'COMMERCIAL' | 'AUTRE';
  role: string;
  hiring_date: string | null;
  leaving_date: string | null;
  apogee_user_id: number | null;
  notes: string | null;
  permis?: string | null;
  cni?: string | null;
  // Personal info fields
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  birth_place?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  epi_profile?: RHEpiProfile | null;
  competencies?: RHCompetencies | null;
  assets?: RHAssets | null;
  it_access?: RHItAccess | null;
  sensitive_data?: RHSensitiveData | null;
}

export interface RHSensitiveData {
  birth_date_encrypted?: string | null;
  emergency_contact_encrypted?: string | null;
  emergency_phone_encrypted?: string | null;
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
  competences_techniques: string[];
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
  vehicule_attribue: string | null; // JSON: { marque, modele, immatriculation, autre }
  carte_carburant: boolean;
  numero_carte_carburant: string | null;
  fournisseur_carte_carburant: string | null;
  carte_bancaire: boolean;
  numero_carte_bancaire: string | null;
  fournisseur_carte_bancaire: string | null;
  carte_autre_nom: string | null;
  carte_autre_numero: string | null;
  carte_autre_fournisseur: string | null;
  tablette_telephone: string | null;
  imei: string | null;
  autres_equipements: EquipmentEntry[];
  created_at: string;
  updated_at: string;
}

export type EquipmentCategory = 'informatique' | 'outils';

export interface EquipmentEntry {
  id?: string;
  nom: string;
  categorie: EquipmentCategory;
  numero_serie?: string;
  imei?: string;
  notes?: string;
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
  category: 'general' | 'infos_perso' | 'securite' | 'competences' | 'parc' | 'documents';
  accessor: (row: RHCollaborator) => string | number | boolean | null | undefined;
  sensitive?: boolean; // N2 strict fields
  defaultVisible?: boolean;
}

// Tab definitions
export type RHTabId = 'general' | 'infos_perso' | 'securite' | 'competences' | 'parc' | 'documents';

export interface RHTab {
  id: RHTabId;
  label: string;
  icon: string;
}

export const RH_TABS: RHTab[] = [
  { id: 'general', label: 'Général', icon: 'User' },
  { id: 'infos_perso', label: 'Infos perso', icon: 'UserCircle' },
  { id: 'securite', label: 'Sécurité', icon: 'Shield' },
  { id: 'competences', label: 'Compétences', icon: 'Award' },
  { id: 'parc', label: 'Parc & Matériel', icon: 'Car' },
  { id: 'documents', label: 'Documents', icon: 'FolderOpen' },
];
