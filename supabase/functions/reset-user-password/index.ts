import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

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

    // Récupérer l'email de l'utilisateur
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', targetUserId)
      .single()

    // Envoyer l'email avec le mot de passe provisoire
    if (profileData?.email) {
      try {
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
        const userName = profileData.first_name 
          ? `${profileData.first_name} ${profileData.last_name || ''}`
          : profileData.email

        await resend.emails.send({
          from: 'HelpConfort <support@helpconfort.services>',
          to: [profileData.email],
          subject: 'Votre nouveau mot de passe temporaire',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Réinitialisation de votre mot de passe</h2>
              <p>Bonjour ${userName},</p>
              <p>Un administrateur a généré un nouveau mot de passe temporaire pour votre compte.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">Votre mot de passe temporaire :</p>
                <p style="font-size: 20px; font-weight: bold; color: #333; margin: 10px 0; font-family: monospace;">
                  ${newPassword}
                </p>
              </div>

              <p style="color: #d9534f; font-weight: bold;">
                ⚠️ Important : Vous devrez changer ce mot de passe lors de votre prochaine connexion.
              </p>

              <p>Pour vous connecter :</p>
              <ol>
                <li>Rendez-vous sur la page de connexion</li>
                <li>Utilisez votre email : <strong>${profileData.email}</strong></li>
                <li>Entrez le mot de passe temporaire ci-dessus</li>
                <li>Suivez les instructions pour définir votre nouveau mot de passe</li>
              </ol>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px;">
                Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement votre administrateur.
              </p>
            </div>
          `,
        })

        console.log('Password reset email sent successfully to:', profileData.email)
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Ne pas bloquer la réponse si l'email échoue
      }
    }

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
