/**
 * useProspectingMeetings - CRUD meetings/RDV commerciaux
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';

export interface ProspectingMeeting {
  id: string;
  agency_id: string;
  apporteur_id: string;
  apporteur_name: string;
  owner_user_id: string;
  meeting_at: string;
  meeting_type: 'call' | 'onsite' | 'visio';
  summary: string | null;
  outcomes: string | null;
  followup_id: string | null;
  created_at: string;
}

interface UseProspectingMeetingsOptions {
  apporteurId?: string | null;
  enabled?: boolean;
}

export function useProspectingMeetings({ apporteurId, enabled = true }: UseProspectingMeetingsOptions = {}) {
  const { agencyId } = useProfile();

  return useQuery({
    queryKey: ['prospecting-meetings', agencyId, apporteurId],
    queryFn: async (): Promise<ProspectingMeeting[]> => {
      let query = supabase
        .from('prospecting_meetings')
        .select('*')
        .order('meeting_at', { ascending: false })
        .limit(200);

      if (apporteurId) {
        query = query.eq('apporteur_id', apporteurId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ProspectingMeeting[];
    },
    enabled: enabled && !!agencyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();
  const { user } = useAuthCore();

  return useMutation({
    mutationFn: async (input: {
      apporteur_id: string;
      apporteur_name: string;
      meeting_at: string;
      meeting_type: 'call' | 'onsite' | 'visio';
      summary?: string;
      outcomes?: string;
      followup_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('prospecting_meetings')
        .insert({
          agency_id: agencyId!,
          owner_user_id: user!.id,
          apporteur_id: input.apporteur_id,
          apporteur_name: input.apporteur_name,
          meeting_at: input.meeting_at,
          meeting_type: input.meeting_type,
          summary: input.summary || null,
          outcomes: input.outcomes || null,
          followup_id: input.followup_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['prospecting-followups'] });
    },
  });
}
