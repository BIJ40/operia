import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';

export interface Agency {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
  date_ouverture: string | null;
  date_cloture_bilan: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_AGENCIES: Agency[] = [];

export function useAgencies() {
  return useQuery({
    queryKey: ['franchiseur-agencies'],
    queryFn: async (): Promise<Agency[]> => {
      const agenciesResult = await safeQuery<Agency[]>(
        supabase
          .from('apogee_agencies')
          .select('id, label, slug, is_active, contact_email, contact_phone, adresse, ville, code_postal, date_ouverture, date_cloture_bilan, created_at, updated_at')
          .order('label')
          .limit(500),
        'FRANCHISEUR_AGENCIES_LOAD'
      );

      if (!agenciesResult.success || !agenciesResult.data) {
        logError('useAgencies', 'Failed to load agencies', agenciesResult.error);
        return DEFAULT_AGENCIES;
      }

      return agenciesResult.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAgency(agencyId: string | null) {
  return useQuery({
    queryKey: ['franchiseur-agency', agencyId],
    queryFn: async (): Promise<Agency | null> => {
      if (!agencyId) return null;
      
      const agencyResult = await safeQuery<Agency>(
        supabase
          .from('apogee_agencies')
          .select('id, label, slug, is_active, contact_email, contact_phone, adresse, ville, code_postal, date_ouverture, date_cloture_bilan, created_at, updated_at')
          .eq('id', agencyId)
          .maybeSingle(),
        'FRANCHISEUR_AGENCY_LOAD'
      );

      if (!agencyResult.success || !agencyResult.data) {
        logError('useAgency', 'Failed to load agency', agencyResult.error);
        return null;
      }

      return agencyResult.data;
    },
    enabled: !!agencyId,
  });
}
