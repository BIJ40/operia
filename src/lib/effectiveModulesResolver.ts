/**
 * Resolve effective modules for a user.
 *
 * Goal: avoid "all tabs greyed out" when the RPC `get_user_effective_modules`
 * is missing / temporarily failing in a given environment.
 *
 * Strategy:
 * 1) Try RPC get_user_effective_modules(user)
 * 2) Fallback: get_agency_enabled_modules(agency) + user_modules(user) merge
 * 3) Last resort: profile.enabled_modules (legacy cache)
 */

import { supabase } from '@/integrations/supabase/client';
import type { EnabledModules, ModuleKey, ModuleOptionsState } from '@/types/modules';

type RpcRow = {
  module_key: string;
  enabled: boolean;
  options: unknown;
};

function normalizeOptions(raw: unknown): Record<string, any> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, any>;
}

function upsertModule(
  acc: EnabledModules,
  moduleKey: string,
  enabled: boolean,
  options: unknown
) {
  const key = moduleKey as ModuleKey;
  acc[key] = {
    enabled: enabled === true,
    options: normalizeOptions(options),
  } as ModuleOptionsState as any;
}

function mergeModuleOptions(base: unknown, override: unknown): Record<string, any> {
  return {
    ...normalizeOptions(base),
    ...normalizeOptions(override),
  };
}

export type EffectiveModulesSource =
  | 'rpc_get_user_effective_modules'
  | 'fallback_plan_plus_user_modules'
  | 'fallback_profile_enabled_modules'
  | 'empty';

export async function resolveEffectiveModulesFromBackend(params: {
  userId: string;
  agencyId?: string | null;
  profileEnabledModules?: EnabledModules | null;
  debugLabel?: string;
}): Promise<{ modules: EnabledModules; source: EffectiveModulesSource }>{
  const { userId, agencyId, profileEnabledModules, debugLabel } = params;

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
      console.warn(
        '[effectiveModulesResolver] RPC get_user_effective_modules failed',
        debugLabel ? { debugLabel } : undefined,
        error
      );
    }
  } catch (e) {
    console.warn(
      '[effectiveModulesResolver] RPC get_user_effective_modules threw',
      debugLabel ? { debugLabel } : undefined,
      e
    );
  }

  // 2) Fallback: plan modules + user_modules merge
  try {
    const planModules: EnabledModules = {};

    if (agencyId) {
      const { data: agencyData, error: agencyError } = await supabase.rpc('get_agency_enabled_modules', {
        p_agency_id: agencyId,
      });

      if (agencyError) {
        console.warn(
          '[effectiveModulesResolver] RPC get_agency_enabled_modules failed',
          debugLabel ? { debugLabel, agencyId } : undefined,
          agencyError
        );
      } else if (Array.isArray(agencyData) && agencyData.length > 0) {
        for (const row of agencyData as RpcRow[]) {
          upsertModule(planModules, row.module_key, row.enabled, row.options);
        }
      }
    }

    const { data: userRows, error: userModulesError } = await supabase
      .from('user_modules')
      .select('module_key, options')
      .eq('user_id', userId);

    if (userModulesError) {
      console.warn(
        '[effectiveModulesResolver] SELECT user_modules failed',
        debugLabel ? { debugLabel } : undefined,
        userModulesError
      );
    }

    const merged: EnabledModules = { ...planModules };

    if (Array.isArray(userRows)) {
      for (const row of userRows as Array<{ module_key: string; options: unknown }>) {
        const key = row.module_key as ModuleKey;
        const base = merged[key];
        const baseOptions =
          typeof base === 'object' && base !== null && 'options' in base ? (base as any).options : undefined;

        const options = mergeModuleOptions(baseOptions, row.options);
        merged[key] = { enabled: true, options } as any;
      }
    }

    if (Object.keys(merged).length > 0) {
      return { modules: merged, source: 'fallback_plan_plus_user_modules' };
    }
  } catch (e) {
    console.warn(
      '[effectiveModulesResolver] fallback plan+user_modules threw',
      debugLabel ? { debugLabel } : undefined,
      e
    );
  }

  // 3) Last resort: profile.enabled_modules (legacy cache)
  if (profileEnabledModules && Object.keys(profileEnabledModules).length > 0) {
    return { modules: profileEnabledModules, source: 'fallback_profile_enabled_modules' };
  }

  return { modules: {}, source: 'empty' };
}
