/**
 * useProspectingFollowups - CRUD suivi commercial apporteurs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';

export interface ProspectingFollowup {
  id: string;
  agency_id: string;
  apporteur_id: string;
  apporteur_name: string;
  owner_user_id: string;
  status: 'todo' | 'in_progress' | 'done' | 'dormant';
  next_action: string | null;
  next_action_at: string | null;
  last_meeting_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UseProspectingFollowupsOptions {
  apporteurId?: string | null;
  enabled?: boolean;
}

export function useProspectingFollowups({ apporteurId, enabled = true }: UseProspectingFollowupsOptions = {}) {
  const { agencyId } = useProfile();

  return useQuery({
    queryKey: ['prospecting-followups', agencyId, apporteurId],
    queryFn: async (): Promise<ProspectingFollowup[]> => {
      let query = supabase
        .from('prospecting_followups')
        .select('*')
        .order('updated_at', { ascending: false });

      if (apporteurId) {
        query = query.eq('apporteur_id', apporteurId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ProspectingFollowup[];
    },
    enabled: enabled && !!agencyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateFollowup() {
  const queryClient = useQueryClient();
  const { agencyId, user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      apporteur_id: string;
      apporteur_name: string;
      status?: string;
      next_action?: string;
      next_action_at?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('prospecting_followups')
        .insert({
          agency_id: agencyId!,
          owner_user_id: user!.id,
          apporteur_id: input.apporteur_id,
          apporteur_name: input.apporteur_name,
          status: input.status || 'todo',
          next_action: input.next_action || null,
          next_action_at: input.next_action_at || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-followups'] });
    },
  });
}

export function useUpdateFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ProspectingFollowup>) => {
      const { data, error } = await supabase
        .from('prospecting_followups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospecting-followups'] });
    },
  });
}
