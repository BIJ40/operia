import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PermissionEntry } from '@/types/permissions-v2';

export function useUserPermissionsV2(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['user_permissions_v2', userId],
    queryFn: async (): Promise<PermissionEntry[]> => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: userId,
      });
      if (error) {
        console.error('[PermissionsV2] RPC error:', error);
        // Fail-closed : 0 module si le RPC échoue
        return [];
      }
      return (data as PermissionEntry[]) ?? [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
