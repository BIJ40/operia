/**
 * Resolve effective modules for a user.
 *
 * Strategy:
 * 1) Try RPC get_user_effective_modules(user)
 * 2) Fallback: user_modules table
 */

import { supabase } from '@/integrations/supabase/client';
import { logWarn, logDebug } from '@/lib/logger';
import type { EnabledModules, ModuleKey, ModuleOptionsState } from '@/types/modules';

type RpcRow = {
  module_key: string;
  enabled: boolean;
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
  | 'rpc_get_user_effective_modules'
  | 'fallback_user_modules'
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
    const { data, error } = await supabase.rpc('get_user_effective_modules', {
      p_user_id: userId,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      const modules: EnabledModules = {};
      for (const row of data as RpcRow[]) {
        upsertModule(modules, row.module_key, row.enabled, row.options);
      }
      return { modules, source: 'rpc_get_user_effective_modules' };
    }

    if (error) {
      logWarn(
        '[effectiveModulesResolver] RPC get_user_effective_modules failed',
        debugLabel ? { debugLabel } : undefined,
        error
      );
    }
  } catch (e) {
    logWarn(
      '[effectiveModulesResolver] RPC get_user_effective_modules threw',
      debugLabel ? { debugLabel } : undefined,
      e
    );
  }

  // 2) Fallback: user_modules table
  try {
    const { data: userRows, error: userModulesError } = await (supabase
      .from('user_modules' as any) as any)
      .select('module_key, options')
      .eq('user_id', userId);

    if (userModulesError) {
      logWarn(
        '[effectiveModulesResolver] SELECT user_modules failed',
        debugLabel ? { debugLabel } : undefined,
        userModulesError
      );
    }

    const merged: EnabledModules = {};

    if (Array.isArray(userRows)) {
      for (const row of userRows as Array<{ module_key: string; options: unknown }>) {
        upsertModule(merged, row.module_key, true, row.options);
      }
    }

    if (Object.keys(merged).length > 0) {
      return { modules: merged, source: 'fallback_user_modules' };
    }
  } catch (e) {
    logWarn(
      '[effectiveModulesResolver] fallback user_modules threw',
      debugLabel ? { debugLabel } : undefined,
      e
    );
  }

  return { modules: {}, source: 'empty' };
}
