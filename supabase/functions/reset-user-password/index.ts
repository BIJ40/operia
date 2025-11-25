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
    // Créer un client admin
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

    // IMPORTANT: Comme verify_jwt = true dans config.toml, 
    // Supabase a déjà vérifié le JWT et le user est dans le header
    // On peut récupérer le user_id depuis le JWT décodé
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Non autorisé')
    }

    // Décoder le JWT pour extraire le user_id (le JWT a déjà été vérifié par Supabase)
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

    // Récupérer les données de la requête
    const { userId: targetUserId, newPassword } = await req.json()

    if (!targetUserId || !newPassword) {
      throw new Error('userId et newPassword sont requis')
    }

    console.log('Resetting password for user:', targetUserId)

    // Réinitialiser le mot de passe
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      throw updateError
    }

    console.log('Password updated successfully')

    // Forcer le changement de mot de passe
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', targetUserId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      throw profileError
    }

    console.log('Profile updated - must_change_password set to true')

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in reset-user-password:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
