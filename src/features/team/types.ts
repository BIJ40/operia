/**
 * Types pour la gestion des collaborateurs d'agence
 */

export const COLLABORATOR_ROLES = [
  'dirigeant',
  'assistant',
  'technicien',
  'commercial',
  'associe',
  'tete_de_reseau',
  'externe',
  'autre',
] as const;

export type CollaboratorRole = typeof COLLABORATOR_ROLES[number];

export const COLLABORATOR_ROLE_LABELS: Record<CollaboratorRole, string> = {
  dirigeant: 'Dirigeant',
  assistant: 'Assistant(e)',
  technicien: 'Technicien',
  commercial: 'Commercial',
  associe: 'Associé',
  tete_de_reseau: 'Tête de réseau',
  externe: 'Externe',
  autre: 'Autre',
};

export interface AgencyCollaborator {
  id: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: CollaboratorRole;
  is_registered_user: boolean;
  user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface CreateCollaboratorPayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: CollaboratorRole;
  notes?: string;
}

export interface UpdateCollaboratorPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  role?: CollaboratorRole;
  notes?: string | null;
}
