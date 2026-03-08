import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const testUsers = [
  {
    email: 'test-n1@helpconfort.test',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'N1-FranchiseeUser',
    agence: 'test-agence',
    globalRole: 'franchisee_user'
  },
  {
    email: 'test-n2@helpconfort.test',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'N2-FranchiseeAdmin',
    agence: 'test-agence',
    globalRole: 'franchisee_admin'
  },
  {
    email: 'test-n3@helpconfort.test',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'N3-FranchisorUser',
    agence: 'test-agence',
    globalRole: 'franchisor_user'
  },
  {
    email: 'test-n5@helpconfort.test',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'N5-PlatformAdmin',
    agence: 'test-agence',
    globalRole: 'platform_admin'
  }
]

Deno.serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  // ⚠️ Production guard: block this function in production
  const env = Deno.env.get('DENO_ENV') || Deno.env.get('ENVIRONMENT') || 'production';
  if (env !== 'development' && env !== 'local') {
    console.warn(`[SEED-TEST-USERS] Blocked: ENV=${env} is not development`);
    return withCors(req, new Response(
      JSON.stringify({ error: 'This function is disabled in production' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // P2 FIX: Role guard — require N6 (superadmin) even in dev environments
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return withCors(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify caller identity and role
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authErr || !user) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    const callerRole = callerProfile?.global_role ?? 'base_user';
    if (callerRole !== 'superadmin') {
      console.warn(`[SEED-TEST-USERS] Role blocked: user ${user.id} has role ${callerRole}, superadmin required`);
      return withCors(req, new Response(
        JSON.stringify({ error: 'Superadmin role required to seed test users' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const results: Array<{ email: string; status: string; error?: string }> = []

    for (const testUser of testUsers) {
      console.log(`Creating test user: ${testUser.email}`)
      
      // Check if user already exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', testUser.email)
        .maybeSingle()

      if (existingProfile) {
        console.log(`User ${testUser.email} already exists, updating global_role...`)
        
        // Update existing user's global_role
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            global_role: testUser.globalRole,
            agence: testUser.agence
          })
          .eq('id', existingProfile.id)

        if (updateError) {
          results.push({ email: testUser.email, status: 'error', error: updateError.message })
        } else {
          results.push({ email: testUser.email, status: 'updated' })
        }
        continue
      }

      // Create new auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        user_metadata: {
          first_name: testUser.firstName,
          last_name: testUser.lastName
        }
      })

      if (authError) {
        console.error(`Error creating auth user ${testUser.email}:`, authError)
        results.push({ email: testUser.email, status: 'error', error: authError.message })
        continue
      }

      // Update profile with global_role and other fields
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          agence: testUser.agence,
          global_role: testUser.globalRole
        })
        .eq('id', authUser.user.id)

      if (profileError) {
        console.error(`Error updating profile for ${testUser.email}:`, profileError)
        results.push({ email: testUser.email, status: 'partial', error: profileError.message })
      } else {
        console.log(`Successfully created test user: ${testUser.email}`)
        results.push({ email: testUser.email, status: 'created' })
      }
    }

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        results,
        credentials: {
          password: 'Test1234!',
          note: 'Tous les utilisateurs de test utilisent ce mot de passe'
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ))

  } catch (error) {
    console.error('Seed test users error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ))
  }
})
