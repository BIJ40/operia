import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CollaboratorWithProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  agency_id: string;
  user_id: string;
  apogee_user_id: number | null;
  work_profile: {
    id: string;
    weekly_contract_minutes: number;
    break_minutes_default: number;
    work_week_starts_on: number;
  } | null;
}

export function useTechnicianProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['technician-profile', user?.id],
    queryFn: async (): Promise<CollaboratorWithProfile | null> => {
      if (!user?.id) return null;

      const { data: collaborator, error: collabError } = await supabase
        .from('collaborators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (collabError || !collaborator) return null;

      // Source of truth fallback: some admin screens link Apogée at user profile level.
      // We keep collaborator as primary (RH), but fallback to profiles.apogee_user_id.
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('apogee_user_id')
        .eq('id', user.id)
        .maybeSingle();

      const effectiveApogeeUserId =
        collaborator.apogee_user_id ?? profileRow?.apogee_user_id ?? null;

      const { data: workProfile } = await supabase
        .from('collaborator_work_profiles')
        .select('*')
        .eq('collaborator_id', collaborator.id)
        .single();

      return {
        id: collaborator.id,
        first_name: collaborator.first_name,
        last_name: collaborator.last_name,
        email: collaborator.email || '',
        phone: collaborator.phone,
        agency_id: collaborator.agency_id,
        user_id: collaborator.user_id!,
        apogee_user_id: effectiveApogeeUserId,
        work_profile: workProfile
          ? {
              id: workProfile.id,
              weekly_contract_minutes: workProfile.weekly_contract_minutes,
              break_minutes_default: workProfile.break_minutes_default,
              work_week_starts_on: workProfile.work_week_starts_on,
            }
          : null,
      };
    },
    enabled: !!user?.id,
  });
}
