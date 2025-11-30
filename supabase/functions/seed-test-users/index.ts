import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const testUsers = [
  {
    email: 'test-n1@helpconfort.test',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'N1-FranchiseeUser',
    agence: 'test-agence',
    globalRole: 'franchisee_user',
    systemRole: 'utilisateur'
  },
  {
    email: 'test-n2@helpconfort.test',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'N2-FranchiseeAdmin',
    agence: 'test-agence',
    globalRole: 'franchisee_admin',
    systemRole: 'utilisateur'
  },
  {
    email: 'test-n3@helpconfort.test',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'N3-FranchisorUser',
    agence: 'test-agence',
    globalRole: 'franchisor_user',
    systemRole: 'support'
  },
  {
    email: 'test-n5@helpconfort.test',
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'N5-PlatformAdmin',
    agence: 'test-agence',
    globalRole: 'platform_admin',
    systemRole: 'admin'
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const results: Array<{ email: string; status: string; error?: string }> = []

    for (const user of testUsers) {
      console.log(`Creating test user: ${user.email}`)
      
      // Check if user already exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', user.email)
        .maybeSingle()

      if (existingProfile) {
        console.log(`User ${user.email} already exists, updating global_role...`)
        
        // Update existing user's global_role
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            global_role: user.globalRole,
            system_role: user.systemRole,
            agence: user.agence
          })
          .eq('id', existingProfile.id)

        if (updateError) {
          results.push({ email: user.email, status: 'error', error: updateError.message })
        } else {
          results.push({ email: user.email, status: 'updated' })
        }
        continue
      }

      // Create new auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName
        }
      })

      if (authError) {
        console.error(`Error creating auth user ${user.email}:`, authError)
        results.push({ email: user.email, status: 'error', error: authError.message })
        continue
      }

      // Update profile with global_role and other fields
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: user.firstName,
          last_name: user.lastName,
          agence: user.agence,
          global_role: user.globalRole,
          system_role: user.systemRole
        })
        .eq('id', authUser.user.id)

      if (profileError) {
        console.error(`Error updating profile for ${user.email}:`, profileError)
        results.push({ email: user.email, status: 'partial', error: profileError.message })
      } else {
        console.log(`Successfully created test user: ${user.email}`)
        results.push({ email: user.email, status: 'created' })
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
