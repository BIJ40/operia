import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserAccessEntry {
  id: string;
  user_id: string;
  module_key: string;
  granted: boolean;
  access_level: 'none' | 'read' | 'full';
  source: string;
  delegated_by: string | null;
  granted_by: string | null;
  granted_at: string;
}

export function useUserAccessEntries(userId: string | null) {
  return useQuery({
    queryKey: ['user_access', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserAccessEntry[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_access')
        .select('id,user_id,module_key,granted,access_level,source,delegated_by,granted_by,granted_at')
        .eq('user_id', userId)
        .order('module_key');
      if (error) throw error;
      return (data ?? []).map(e => ({
        ...e,
        access_level: e.access_level as 'none' | 'read' | 'full',
      }));
    },
    staleTime: 60 * 1000,
  });
}

export function useUpsertUserAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user_id,
      module_key,
      granted,
      access_level,
      granted_by,
    }: {
      user_id: string;
      module_key: string;
      granted: boolean;
      access_level: 'none' | 'read' | 'full';
      granted_by?: string;
    }) => {
      // Check if row exists first (PK is UUID, unique constraint on user_id+module_key)
      const { data: existing } = await supabase
        .from('user_access')
        .select('id')
        .eq('user_id', user_id)
        .eq('module_key', module_key)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('user_access')
          .update({ granted, access_level, source: 'manual_exception', granted_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_access')
          .insert({ user_id, module_key, granted, access_level, source: 'manual_exception', granted_by: granted_by ?? null, granted_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user_access', vars.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user_permissions_v2', vars.user_id] });
    },
    onError: (error) => {
      console.error('[useUpsertUserAccess] ERREUR:', error);
    },
  });
}

export function useRemoveUserAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user_id,
      module_key,
    }: {
      user_id: string;
      module_key: string;
    }) => {
      const { error } = await supabase
        .from('user_access')
        .delete()
        .eq('user_id', user_id)
        .eq('module_key', module_key);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['user_access', vars.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user_permissions_v2', vars.user_id] });
    },
  });
}
