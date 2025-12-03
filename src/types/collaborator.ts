/**
 * Types pour le module RH & Parc - Collaborateurs
 */

export type CollaboratorType = 
  | 'TECHNICIEN' 
  | 'ASSISTANTE' 
  | 'DIRIGEANT' 
  | 'COMMERCIAL' 
  | 'AUTRE';

export const COLLABORATOR_TYPES: { value: CollaboratorType; label: string }[] = [
  { value: 'TECHNICIEN', label: 'Technicien' },
  { value: 'ASSISTANTE', label: 'Assistante' },
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
  birth_date: string | null;
  address: string | null;
  social_security_number: string | null;
  
  // Contact urgence
  emergency_contact: string | null;
  emergency_phone: string | null;
  
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
  address?: string;
  social_security_number?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  apogee_user_id?: number;
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
  { value: 'documents', label: 'Documents RH', phase: 2 },
  { value: 'contract', label: 'Contrat & Salaire', phase: 2 },
  { value: 'equipment', label: 'Matériel & EPI', phase: 3 },
  { value: 'vehicle', label: 'Véhicule', phase: 4 },
  { value: 'alerts', label: 'Alertes', phase: 5 },
];
