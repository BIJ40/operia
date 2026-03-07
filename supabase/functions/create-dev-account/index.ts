import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    // Auth: only N6 (superadmin) can create dev accounts
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

    const callerLevel = {
      superadmin: 6, platform_admin: 5, franchisor_admin: 4, franchisor_user: 3,
      franchisee_admin: 2, franchisee_user: 1, base_user: 0,
    }[callerProfile?.global_role ?? 'base_user'] ?? 0;

    if (callerLevel < 5) {
      return new Response(JSON.stringify({ error: 'Rôle insuffisant (N5+ requis)' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { email, password, firstName, lastName, globalRole, isReadOnly } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email et mot de passe requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
        global_role: globalRole || 'platform_admin',
        is_read_only: isReadOnly === true,
        first_name: firstName || 'Dev',
        last_name: lastName || 'Account',
      })
      .eq('id', newUser.user.id);

    if (profileErr) {
      console.error('Profile update error:', profileErr);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      userId: newUser.user.id,
      message: `Compte créé: ${email} (${globalRole || 'platform_admin'}, read_only: ${isReadOnly === true})`,
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
