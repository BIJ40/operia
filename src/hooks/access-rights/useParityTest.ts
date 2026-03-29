import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Mapping des legacy keys V1 vers les clés V2
const LEGACY_REMAP: Record<string, string> = {
  agence:  'pilotage.statistiques',
  aide:    'support.aide_en_ligne',
  guides:  'support.guides',
  parc:    'pilotage.parc',
  rh:      'organisation.salaries',
};

export interface ParityResult {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  totalV1: number;
  totalV2: number;
  matches: number;
  v1Only: string[];
  v2Only: string[];
  pass: boolean;
}

export interface ParityTestState {
  isRunning: boolean;
  progress: number;
  total: number;
  results: ParityResult[];
  error: string | null;
}

export function useParityTest() {
  const [state, setState] = useState<ParityTestState>({
    isRunning: false,
    progress: 0,
    total: 0,
    results: [],
    error: null,
  });

  const run = async (agencyId: string | null) => {
    setState({ isRunning: true, progress: 0, total: 0, results: [], error: null });

    try {
      // Charger les utilisateurs
      let usersQuery = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, global_role')
        .order('email');

      if (agencyId) {
        usersQuery = usersQuery.eq('agency_id', agencyId);
      } else {
        // En mode "toutes les agences", exclure les users sans agence
        usersQuery = usersQuery.not('agency_id', 'is', null);
      }

      const { data: users, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      const userList = users ?? [];
      setState(s => ({ ...s, total: userList.length }));

      const results: ParityResult[] = [];

      for (let i = 0; i < userList.length; i++) {
        const user = userList[i];

        try {
          // V1 : lire user_modules
          const { data: v1Modules } = await (supabase
            .from('user_modules' as any) as any)
            .select('module_key')
            .eq('user_id', user.id);

          const remappedV1 = (v1Modules ?? []).map(m => LEGACY_REMAP[m.module_key] ?? m.module_key);

          const { data: catalogEntries } = await supabase
            .from('module_catalog')
            .select('key, node_type')
            .in('key', remappedV1);

          const sectionKeys = new Set(
            (catalogEntries ?? []).filter(e => e.node_type === 'section').map(e => e.key)
          );

          const v1Keys = new Set(
            remappedV1.filter(k => k !== 'unified_search' && !sectionKeys.has(k))
          );

          // V2 : appeler le RPC
          const { data: v2Perms } = await supabase.rpc('get_user_permissions', {
            p_user_id: user.id,
          });

          const v2Keys = new Set(
            (v2Perms ?? [])
              .filter((p: { granted: boolean; node_type: string }) =>
                p.granted && p.node_type !== 'section')
              .map((p: { module_key: string }) => p.module_key)
          );

          // Écarts
          const v1Only = ([...v1Keys] as string[]).filter(k => !v2Keys.has(k));
          const v2Only = ([...v2Keys] as string[]).filter(k => !v1Keys.has(k));
          const matches = ([...v1Keys] as string[]).filter(k => v2Keys.has(k)).length;

          results.push({
            userId: user.id,
            email: user.email ?? '',
            fullName: [user.first_name, user.last_name].filter(Boolean).join(' '),
            role: user.global_role ?? '',
            totalV1: v1Keys.size,
            totalV2: v2Keys.size,
            matches,
            v1Only: v1Only as string[],
            v2Only: v2Only as string[],
            // pass = aucune régression (v1Only vide)
            pass: v1Only.length === 0,
          });
        } catch {
          results.push({
            userId: user.id,
            email: user.email ?? '',
            fullName: [user.first_name, user.last_name].filter(Boolean).join(' '),
            role: user.global_role ?? '',
            totalV1: 0,
            totalV2: 0,
            matches: 0,
            v1Only: [],
            v2Only: [],
            pass: false,
          });
        }

        setState(s => ({ ...s, progress: i + 1, results: [...results] }));
      }

      setState(s => ({ ...s, isRunning: false }));
    } catch (err) {
      setState(s => ({
        ...s,
        isRunning: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      }));
    }
  };

  const reset = () =>
    setState({ isRunning: false, progress: 0, total: 0, results: [], error: null });

  return { state, run, reset };
}
