/**
 * Types pour le module RH & Maintenance - Collaborateurs
 * RGPD: Les données sensibles (birth_date, SSN, contacts urgence) sont dans collaborator_sensitive_data
 */

export type CollaboratorType = 
  | 'TECHNICIEN' 
  | 'ADMINISTRATIF' 
  | 'DIRIGEANT' 
  | 'COMMERCIAL' 
  | 'AUTRE';

export const COLLABORATOR_TYPES: { value: CollaboratorType; label: string }[] = [
  { value: 'TECHNICIEN', label: 'Technicien' },
  { value: 'ADMINISTRATIF', label: 'Administratif' },
  { value: 'DIRIGEANT', label: 'Dirigeant' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'AUTRE', label: 'Autre' },
];

export interface Collaborator {
  id: string;
  agency_id: string;
  user_id: string | null;
  is_registered_user: boolean;
  
  // Identité
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  
  // Infos RH
  type: CollaboratorType;
  role: string;
  notes: string | null;
  hiring_date: string | null;
  leaving_date: string | null;
  // RGPD: birth_date déplacé vers collaborator_sensitive_data
  address: string | null; // Legacy - conserver pour compatibilité
  street: string | null;
  postal_code: string | null;
  city: string | null;
  // RGPD: social_security_number déplacé vers collaborator_sensitive_data
  birth_place: string | null;
  
  // RGPD: emergency_contact et emergency_phone déplacés vers collaborator_sensitive_data
  
  // Lien Apogée
  apogee_user_id: number | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CollaboratorFormData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  type: CollaboratorType;
  role: string;
  notes?: string;
  hiring_date?: string;
  leaving_date?: string;
  birth_date?: string;
  address?: string; // Legacy
  street?: string;
  postal_code?: string;
  city?: string;
  social_security_number?: string;
  birth_place?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  apogee_user_id?: number;
  competences?: string[];
}

// Tabs for 360° profile
export type CollaboratorTab = 
  | 'identity' 
  | 'documents' 
  | 'contract' 
  | 'equipment' 
  | 'vehicle' 
  | 'alerts';

export const COLLABORATOR_TABS: { value: CollaboratorTab; label: string; phase: number }[] = [
  { value: 'identity', label: 'Identité', phase: 1 },
  { value: 'documents', label: 'Documents RH', phase: 1 }, // Phase 2.1 implemented
  { value: 'contract', label: 'Contrat & Salaire', phase: 1 }, // Phase 2 implemented
  { value: 'equipment', label: 'Matériel & EPI', phase: 3 },
  { value: 'vehicle', label: 'Véhicule', phase: 4 },
  { value: 'alerts', label: 'Alertes', phase: 5 },
];

// Phase 2: Contrats & Salaires

export type ContractType =
  | 'CDI'
  | 'CDD'
  | 'APPRENTISSAGE'
  | 'STAGE'
  | 'INTERIM';

export const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'APPRENTISSAGE', label: 'Apprentissage' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'INTERIM', label: 'Intérim' },
];

export type JobCategory =
  | 'TECHNICIEN'
  | 'ASSISTANTE'
  | 'DIRIGEANT'
  | 'COMMERCIAL'
  | 'AUTRE';

export const JOB_CATEGORIES: { value: JobCategory; label: string }[] = [
  { value: 'TECHNICIEN', label: 'Technicien' },
  { value: 'ASSISTANTE', label: 'Assistante' },
  { value: 'DIRIGEANT', label: 'Dirigeant' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'AUTRE', label: 'Autre' },
];

export type SalaryReasonType =
  | 'EMBAUCHE'
  | 'AUGMENTATION'
  | 'AVENANT'
  | 'PRIME';

export const SALARY_REASON_TYPES: { value: SalaryReasonType; label: string }[] = [
  { value: 'EMBAUCHE', label: 'Embauche' },
  { value: 'AUGMENTATION', label: 'Augmentation' },
  { value: 'AVENANT', label: 'Avenant' },
  { value: 'PRIME', label: 'Prime' },
];

export interface EmploymentContract {
  id: string;
  collaborator_id: string;
  agency_id: string;
  contract_type: ContractType;
  start_date: string;
  end_date: string | null;
  weekly_hours: number | null;
  job_title: string | null;
  job_category: JobCategory | null;
  is_current: boolean;
  created_at: string;
  created_by: string | null;
}

export interface SalaryHistory {
  id: string;
  contract_id: string;
  effective_date: string;
  hourly_rate: number | null;
  monthly_salary: number | null;
  reason_type: SalaryReasonType | null;
  comment: string | null;
  decided_by: string | null;
  created_at: string;
}
