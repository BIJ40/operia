/**
 * ProfileRepository — Typed Supabase queries for profiles.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { DEFAULT_LIST_LIMIT } from '@/services/BaseQueryService';

const PROFILE_COLUMNS = 'id, email, first_name, last_name, agence, agency_id, global_role, role_agence, apogee_user_id, phone, avatar_url, support_level, created_at, updated_at' as const;

export interface ProfileRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  
  agence: string | null;
  agency_id: string | null;
  global_role: string | null;
  role_agence: string | null;
  apogee_user_id: number | null;
  phone: string | null;
  avatar_url: string | null;
  support_level: number | null;
  created_at: string;
  updated_at: string;
}

export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logError('[profileRepository.getProfileById]', error);
    throw error;
  }
  return data as ProfileRow | null;
}

export async function listProfilesByAgency(agencyId: string, options?: {
  limit?: number;
}): Promise<ProfileRow[]> {
  const { limit = DEFAULT_LIST_LIMIT } = options ?? {};

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('agency_id', agencyId)
    .order('last_name', { ascending: true })
    .limit(limit);

  if (error) {
    logError('[profileRepository.listProfilesByAgency]', error);
    throw error;
  }
  return (data ?? []) as ProfileRow[];
}

export async function updateProfile(
  id: string,
  updates: Partial<Pick<ProfileRow, 'first_name' | 'last_name' | 'phone' | 'role_agence' | 'avatar_url'>>
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    logError('[profileRepository.updateProfile]', error);
    throw error;
  }
  return data as ProfileRow;
}
