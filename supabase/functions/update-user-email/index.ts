import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Non autorisé')
    }

    const token = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(token.split('.')[1]))
    const userId = payload.sub

    if (!userId) {
      throw new Error('Token invalide')
    }

    console.log('Authenticated user from JWT:', userId)

    // Vérifier le rôle admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      console.error('User is not admin:', userId)
      throw new Error('Accès refusé - Réservé aux administrateurs')
    }

    console.log('Admin verified:', userId)

    const { userId: targetUserId, newEmail } = await req.json()

    if (!targetUserId || !newEmail) {
      throw new Error('userId et newEmail sont requis')
    }

    console.log('Updating email for user:', targetUserId, 'to:', newEmail)

    // Mettre à jour l'email dans auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { email: newEmail }
    )

    if (authError) {
      console.error('Error updating auth email:', authError)
      throw authError
    }

    console.log('Auth email updated successfully')

    // Mettre à jour l'email dans profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', targetUserId)

    if (profileError) {
      console.error('Error updating profile email:', profileError)
      throw profileError
    }

    console.log('Profile email updated successfully')

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in update-user-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
