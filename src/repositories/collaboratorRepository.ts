/**
 * CollaboratorRepository — Typed Supabase queries for collaborators.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { DEFAULT_LIST_LIMIT } from '@/services/BaseQueryService';

const COLLABORATOR_COLUMNS = 'id, agency_id, user_id, first_name, last_name, email, phone, type, role, hiring_date, leaving_date, is_registered_user, apogee_user_id, notes, street, postal_code, city, created_at, updated_at' as const;

export interface CollaboratorRow {
  id: string;
  agency_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  type: string;
  role: string | null;
  hiring_date: string | null;
  leaving_date: string | null;
  status?: string;
  is_registered_user: boolean;
  apogee_user_id: number | null;
  notes: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export async function listCollaborators(agencyId: string, options?: {
  limit?: number;
}): Promise<CollaboratorRow[]> {
  const { limit = DEFAULT_LIST_LIMIT } = options ?? {};

  let query = supabase
    .from('collaborators')
    .select(COLLABORATOR_COLUMNS)
    .eq('agency_id', agencyId)
    .order('last_name', { ascending: true })
    .limit(limit);

  const { data, error } = await query;
  if (error) {
    logError('[collaboratorRepository.listCollaborators]', error);
    throw error;
  }
  return (data ?? []) as CollaboratorRow[];
}

export async function getCollaboratorById(id: string): Promise<CollaboratorRow | null> {
  const { data, error } = await supabase
    .from('collaborators')
    .select(COLLABORATOR_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logError('[collaboratorRepository.getCollaboratorById]', error);
    throw error;
  }
  return data as CollaboratorRow | null;
}

export async function getCollaboratorByUserId(userId: string): Promise<CollaboratorRow | null> {
  const { data, error } = await supabase
    .from('collaborators')
    .select(COLLABORATOR_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logError('[collaboratorRepository.getCollaboratorByUserId]', error);
    throw error;
  }
  return data as CollaboratorRow | null;
}
