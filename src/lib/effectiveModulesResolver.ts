/**
 * Resolve effective modules for a user.
 *
 * Strategy:
 * 1) Try RPC get_user_permissions(user)
 * 2) Fallback: user_access table
 */

import { supabase } from '@/integrations/supabase/client';
import { logWarn, logDebug } from '@/lib/logger';
import type { EnabledModules, ModuleKey, ModuleOptionsState } from '@/types/modules';

type RpcRow = {
  module_key: string;
  granted: boolean;
  access_level: string;
  options: unknown;
};

function normalizeOptions(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    result[k] = v === true;
  }
  return result;
}

function upsertModule(
  acc: EnabledModules,
  moduleKey: string,
  enabled: boolean,
  options: unknown
) {
  const value: ModuleOptionsState = {
    enabled: enabled === true,
    options: normalizeOptions(options),
  };
  acc[moduleKey] = value;
}

export type EffectiveModulesSource =
  | 'rpc_get_user_permissions'
  | 'fallback_user_access'
  | 'empty';

export async function resolveEffectiveModulesFromBackend(params: {
  userId: string;
  agencyId?: string | null;
  profileEnabledModules?: EnabledModules | null;
  debugLabel?: string;
}): Promise<{ modules: EnabledModules; source: EffectiveModulesSource }>{
  const { userId, debugLabel } = params;

  // 1) Primary: RPC
  try {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      const modules: EnabledModules = {};
      for (const row of data as RpcRow[]) {
        if (row.granted && row.access_level !== 'none') {
          upsertModule(modules, row.module_key, true, row.options);
        }
      }
      return { modules, source: 'rpc_get_user_permissions' };
    }

    if (error) {
      logWarn(
        '[effectiveModulesResolver] RPC get_user_permissions failed',
        debugLabel ? { debugLabel } : undefined,
        error
      );
    }
  } catch (e) {
    logWarn(
      '[effectiveModulesResolver] RPC get_user_permissions threw',
      debugLabel ? { debugLabel } : undefined,
      e
    );
  }

  // 2) Fallback: user_access table
  try {
    const { data: userRows, error: userAccessError } = await supabase
      .from('user_access')
      .select('module_key, options')
      .eq('user_id', userId)
      .eq('granted', true);

    if (userAccessError) {
      logWarn(
        '[effectiveModulesResolver] SELECT user_access failed',
        debugLabel ? { debugLabel } : undefined,
        userAccessError
      );
    }

    const merged: EnabledModules = {};

    if (Array.isArray(userRows)) {
      for (const row of userRows as Array<{ module_key: string; options: unknown }>) {
        upsertModule(merged, row.module_key, true, row.options);
      }
    }

    if (Object.keys(merged).length > 0) {
      return { modules: merged, source: 'fallback_user_access' };
    }
  } catch (e) {
    logWarn(
      '[effectiveModulesResolver] fallback user_access threw',
      debugLabel ? { debugLabel } : undefined,
      e
    );
  }

  return { modules: {}, source: 'empty' };
}
