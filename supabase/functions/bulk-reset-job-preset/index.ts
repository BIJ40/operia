import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

const ROLE_LEVELS: Record<string, number> = {
  base_user: 0,
  franchisee_user: 1,
  franchisee_admin: 2,
  franchisor_user: 3,
  franchisor_admin: 4,
  platform_admin: 5,
  superadmin: 6,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'Missing Authorization header' }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return corsResponse({ error: 'Unauthorized' }, 401);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callerProfile } = await serviceClient
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    const callerLevel = ROLE_LEVELS[callerProfile?.global_role ?? ''] ?? 0;
    if (callerLevel < 4) {
      return corsResponse({ error: 'Insufficient permissions — N4+ required' }, 403);
    }

    const body = await req.json();
    const { user_ids, reason } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return corsResponse({ error: 'user_ids must be a non-empty array' }, 400);
    }
    if (user_ids.length > 200) {
      return corsResponse({ error: 'Maximum 200 user_ids per call' }, 400);
    }

    const { data: allPresets } = await serviceClient
      .from('job_profile_presets')
      .select('role_agence, default_modules');

    const presetMap = new Map(
      (allPresets ?? []).map(p => [p.role_agence, p.default_modules as string[]])
    );

    const skipped: string[] = [];
    let affected = 0;

    for (const userId of user_ids) {
      try {
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('role_agence')
          .eq('id', userId)
          .maybeSingle();

        const roleAgence = profile?.role_agence;

        if (!roleAgence) {
          skipped.push(`${userId}: no role_agence`);
          continue;
        }

        const presetModules = presetMap.get(roleAgence);
        if (!presetModules || presetModules.length === 0) {
          skipped.push(`${userId}: no preset for role_agence=${roleAgence}`);
          continue;
        }

        const { data: oldAccess } = await serviceClient
          .from('user_access')
          .select('module_key, granted, access_level, source')
          .eq('user_id', userId);

        await serviceClient
          .from('user_access')
          .delete()
          .eq('user_id', userId)
          .in('source', ['manual_exception', 'job_preset', 'agency_delegation']);

        const newRows = presetModules.map(moduleKey => ({
          user_id: userId,
          module_key: moduleKey,
          granted: true,
          access_level: 'full',
          source: 'job_preset',
          granted_by: user.id,
          granted_at: new Date().toISOString(),
        }));

        if (newRows.length > 0) {
          const { error: insertError } = await serviceClient
            .from('user_access')
            .upsert(newRows, { onConflict: 'user_id,module_key' });
          if (insertError) throw insertError;
        }

        await serviceClient
          .from('permissions_audit_log')
          .insert({
            scope_type: 'user_access',
            target_type: 'user',
            target_id: userId,
            module_key: null,
            action_type: 'reset_to_preset',
            old_value: { modules: (oldAccess ?? []).map(a => a.module_key) },
            new_value: { modules: presetModules, preset: roleAgence },
            reason: reason ?? null,
            actor_user_id: user.id,
            actor_role: callerProfile?.global_role ?? null,
          });

        affected++;
      } catch (err) {
        skipped.push(`${userId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return corsResponse({ success: true, affected, skipped });
  } catch (err) {
    console.error('[bulk-reset-job-preset] Fatal error:', err);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
