import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';

const ROLE_LEVELS: Record<string, number> = {
  base_user: 0, franchisee_user: 1, franchisee_admin: 2,
  franchisor_user: 3, franchisor_admin: 4, platform_admin: 5, superadmin: 6,
};

function getRoleLevel(role: string | null): number {
  return ROLE_LEVELS[role ?? ''] ?? 0;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    // Auth: only N5+ (platform_admin or superadmin) can create dev accounts
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check N5+ role
    const { data: callerProfile } = await supabaseUser
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    const callerLevel = getRoleLevel(callerProfile?.global_role ?? null);

    if (callerLevel < 5) {
      return new Response(JSON.stringify({ error: 'Rôle insuffisant (N5+ requis)' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { email, password, firstName, lastName, globalRole, isReadOnly } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email et mot de passe requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // P2 FIX: Prevent privilege escalation — caller cannot create account with role >= their own level
    // Exception: superadmin (N6) can create other superadmins
    const targetRole = globalRole || 'platform_admin';
    const targetLevel = getRoleLevel(targetRole);

    if (targetLevel >= callerLevel && callerLevel < 6) {
      console.warn(`[create-dev-account] Privilege escalation blocked: user ${user.id} (${callerProfile?.global_role}) tried to create ${targetRole}`);
      return new Response(JSON.stringify({ 
        error: `Vous ne pouvez pas créer un compte de niveau ${targetRole} (niveau égal ou supérieur au vôtre)` 
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use service role to create user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Create auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName || 'Dev', last_name: lastName || 'Account' },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update profile
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        global_role: targetRole,
        is_read_only: isReadOnly === true,
        first_name: firstName || 'Dev',
        last_name: lastName || 'Account',
      })
      .eq('id', newUser.user.id);

    if (profileErr) {
      console.error('Profile update error:', profileErr);
    }

    console.log(`[create-dev-account] Account created by ${user.id} (${callerProfile?.global_role}): ${email} as ${targetRole}`);

    return new Response(JSON.stringify({ 
      success: true, 
      userId: newUser.user.id,
      message: `Compte créé: ${email} (${targetRole}, read_only: ${isReadOnly === true})`,
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
