/**
 * useModuleOverrides — Charge les user_modules (overrides) groupés par module_key
 * avec les profils utilisateurs pour affichage dans ModulesMasterView
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { toast } from 'sonner';

export interface UserOverride {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  globalRole: string | null;
  agencyTierKey: string | null;
}

export type OverridesMap = Map<string, UserOverride[]>;

const QUERY_KEY = ['module-overrides'];

export function useModuleOverrides() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<OverridesMap> => {
      // Fetch overrides with profile info
      const { data, error } = await supabase
        .from('user_modules')
        .select('module_key, user_id, profiles!user_modules_user_id_fkey(first_name, last_name, email, global_role, agency_id)')
        ;

      if (error) throw error;

      // Collect unique agency_ids to fetch tier_keys
      const agencyIds = new Set<string>();
      for (const row of (data ?? []) as any[]) {
        const agencyId = row.profiles?.agency_id;
        if (agencyId) agencyIds.add(agencyId);
      }

      // Fetch active subscriptions for all agencies
      const tierMap = new Map<string, string>();
      if (agencyIds.size > 0) {
        const { data: subs } = await supabase
          .from('agency_subscription')
          .select('agency_id, tier_key')
          .in('agency_id', [...agencyIds])
          .eq('status', 'active');
        for (const sub of subs ?? []) {
          tierMap.set(sub.agency_id, sub.tier_key?.toUpperCase() ?? 'STARTER');
        }
      }

      const map = new Map<string, UserOverride[]>();
      for (const row of (data ?? []) as any[]) {
        const profile = row.profiles;
        const agencyId = profile?.agency_id;
        const entry: UserOverride = {
          userId: row.user_id,
          firstName: profile?.first_name ?? null,
          lastName: profile?.last_name ?? null,
          email: profile?.email ?? null,
          globalRole: profile?.global_role ?? null,
          agencyTierKey: agencyId ? (tierMap.get(agencyId) ?? 'STARTER') : null,
        };
        const existing = map.get(row.module_key) ?? [];
        existing.push(entry);
        map.set(row.module_key, existing);
      }
      return map;
    },
    staleTime: 60_000,
  });

  return {
    overrides: query.data ?? new Map<string, UserOverride[]>(),
    isLoading: query.isLoading,
  };
}

export function useAddOverride() {
  const qc = useQueryClient();
  const { user } = useAuthCore();

  return useMutation({
    mutationFn: async ({ userId, moduleKey }: { userId: string; moduleKey: string }) => {
      // Auto-insert all ancestor keys so parent modules are also overridden
      const parts = moduleKey.split('.');
      const allKeys = parts.map((_, i) => parts.slice(0, i + 1).join('.'));
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('user_modules')
        .upsert(
          allKeys.map(key => ({
            user_id: userId,
            module_key: key,
            options: null,
            enabled_at: now,
            enabled_by: user?.id || null,
          })),
          { onConflict: 'user_id,module_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Privilège ajouté');
    },
    onError: (err: Error) => toast.error(`Erreur: ${err.message}`),
  });
}

export function useRemoveOverride() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, moduleKey }: { userId: string; moduleKey: string }) => {
      const { error } = await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', userId)
        .eq('module_key', moduleKey);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Privilège retiré');
    },
    onError: (err: Error) => toast.error(`Erreur: ${err.message}`),
  });
}

/**
 * Hook to search profiles for the combobox
 */
export function useSearchProfiles(search: string) {
  return useQuery({
    queryKey: ['profiles-search', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: search.length >= 2,
    staleTime: 30_000,
  });
}
