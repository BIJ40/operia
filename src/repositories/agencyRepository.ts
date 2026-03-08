/**
 * AgencyRepository — Typed Supabase queries for agencies.
 */
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { DEFAULT_LIST_LIMIT } from '@/services/BaseQueryService';

const AGENCY_COLUMNS = 'id, label, slug, is_active, adresse, code_postal, ville, contact_email, contact_phone, date_ouverture, date_cloture_bilan, created_at, updated_at' as const;

export interface AgencyRow {
  id: string;
  label: string;
  slug: string;
  is_active: boolean;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  date_ouverture: string | null;
  date_cloture_bilan: string | null;
  created_at: string;
  updated_at: string;
}

export async function listAgencies(options?: {
  activeOnly?: boolean;
  limit?: number;
}): Promise<AgencyRow[]> {
  const { activeOnly = true, limit = DEFAULT_LIST_LIMIT } = options ?? {};

  let query = supabase
    .from('apogee_agencies')
    .select(AGENCY_COLUMNS)
    .order('label', { ascending: true })
    .limit(limit);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    logError('[agencyRepository.listAgencies]', error);
    throw error;
  }
  return (data ?? []) as AgencyRow[];
}

export async function getAgencyById(id: string): Promise<AgencyRow | null> {
  const { data, error } = await supabase
    .from('apogee_agencies')
    .select(AGENCY_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logError('[agencyRepository.getAgencyById]', error);
    throw error;
  }
  return data as AgencyRow | null;
}

export async function getAgencyBySlug(slug: string): Promise<AgencyRow | null> {
  const { data, error } = await supabase
    .from('apogee_agencies')
    .select(AGENCY_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    logError('[agencyRepository.getAgencyBySlug]', error);
    throw error;
  }
  return data as AgencyRow | null;
}
