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
    const { action, module_key, user_ids, access_level, reason } = body;

    if (!['grant', 'deny', 'remove'].includes(action)) {
      return corsResponse({ error: 'Invalid action — must be grant, deny or remove' }, 400);
    }
    if (!module_key || typeof module_key !== 'string') {
      return corsResponse({ error: 'module_key is required' }, 400);
    }
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return corsResponse({ error: 'user_ids must be a non-empty array' }, 400);
    }
    if (user_ids.length > 200) {
      return corsResponse({ error: 'Maximum 200 user_ids per call' }, 400);
    }
    if (action === 'grant' && !['full', 'read'].includes(access_level)) {
      return corsResponse({ error: 'access_level (full or read) is required for grant action' }, 400);
    }

    const { data: moduleExists } = await serviceClient
      .from('module_catalog')
      .select('key')
      .eq('key', module_key)
      .single();

    if (!moduleExists) {
      return corsResponse({ error: `Module ${module_key} not found in module_catalog` }, 400);
    }

    const errors: string[] = [];
    let affected = 0;

    for (const userId of user_ids) {
      try {
        const { data: existing } = await serviceClient
          .from('user_access')
          .select('granted, access_level, source')
          .eq('user_id', userId)
          .eq('module_key', module_key)
          .maybeSingle();

        const oldValue = existing ?? null;

        if (action === 'grant') {
          const { error } = await serviceClient
            .from('user_access')
            .upsert(
              {
                user_id: userId,
                module_key,
                granted: true,
                access_level,
                source: 'manual_exception',
                granted_by: user.id,
                granted_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,module_key' }
            );
          if (error) throw error;
        } else if (action === 'deny') {
          const { error } = await serviceClient
            .from('user_access')
            .upsert(
              {
                user_id: userId,
                module_key,
                granted: false,
                access_level: 'none',
                source: 'manual_exception',
                granted_by: user.id,
                granted_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,module_key' }
            );
          if (error) throw error;
        } else if (action === 'remove') {
          const { error } = await serviceClient
            .from('user_access')
            .delete()
            .eq('user_id', userId)
            .eq('module_key', module_key);
          if (error) throw error;
        }

        await serviceClient
          .from('permissions_audit_log')
          .insert({
            scope_type: 'user_access',
            target_type: 'user',
            target_id: userId,
            module_key,
            action_type: action === 'grant' ? 'grant' : action === 'deny' ? 'deny' : 'remove',
            old_value: oldValue,
            new_value: action !== 'remove'
              ? { granted: action === 'grant', access_level: action === 'grant' ? access_level : 'none' }
              : null,
            reason: reason ?? null,
            actor_user_id: user.id,
            actor_role: callerProfile?.global_role ?? null,
          });

        affected++;
      } catch (err) {
        errors.push(`${userId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return corsResponse({ success: true, affected, errors });
  } catch (err) {
    console.error('[bulk-apply-user-access] Fatal error:', err);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
