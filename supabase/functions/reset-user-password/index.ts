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
          from: 'HelpConfort Services <support@helpconfort.services>',
          to: [profileData.email],
          subject: 'Votre nouveau mot de passe temporaire',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
                  <tr>
                    <td align="center" style="padding: 40px 0;">
                      <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header avec gradient bleu -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #0EA5E9 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                            <img src="https://uxcovgqhgjsuibgdvcof.supabase.co/storage/v1/object/public/category-icons/logo_helpogee.png" alt="HelpConfort Services" style="height: 60px; margin-bottom: 20px;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Réinitialisation de mot de passe</h1>
                          </td>
                        </tr>

                        <!-- Contenu principal -->
                        <tr>
                          <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                              Bonjour <strong>${userName}</strong>,
                            </p>
                            
                            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                              Un administrateur a généré un nouveau mot de passe temporaire pour votre compte HelpConfort Services.
                            </p>
                            
                            <!-- Boîte mot de passe avec accent orange -->
                            <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 3px; border-radius: 12px; margin: 30px 0;">
                              <div style="background-color: #ffffff; padding: 25px; border-radius: 10px;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                  Votre mot de passe temporaire
                                </p>
                                <p style="font-size: 24px; font-weight: bold; color: #f97316; margin: 0; font-family: 'Courier New', monospace; letter-spacing: 2px;">
                                  ${newPassword}
                                </p>
                              </div>
                            </div>

                            <!-- Avertissement important -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; border-radius: 8px; margin: 30px 0;">
                              <p style="color: #991b1b; font-weight: 600; margin: 0; font-size: 15px;">
                                ⚠️ Important
                              </p>
                              <p style="color: #991b1b; margin: 10px 0 0 0; font-size: 14px; line-height: 1.5;">
                                Vous devrez obligatoirement changer ce mot de passe lors de votre prochaine connexion.
                              </p>
                            </div>

                            <!-- Instructions de connexion -->
                            <div style="background-color: #f0f9ff; padding: 25px; border-radius: 12px; margin: 30px 0;">
                              <p style="color: #0369a1; font-weight: 600; margin: 0 0 15px 0; font-size: 16px;">
                                📋 Instructions de connexion
                              </p>
                              <ol style="color: #0c4a6e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                                <li>Cliquez sur le bouton ci-dessous pour accéder à la page de connexion</li>
                                <li>Utilisez votre email : <strong>${profileData.email}</strong></li>
                                <li>Entrez le mot de passe temporaire ci-dessus</li>
                                <li>Suivez les instructions pour définir votre nouveau mot de passe</li>
                              </ol>
                            </div>

                            <!-- Bouton CTA -->
                            <div style="text-align: center; margin: 35px 0;">
                              <a href="${Deno.env.get('APP_URL') || 'https://www.helpconfort.services'}" 
                                 style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3); transition: all 0.3s ease;">
                                🔐 Se connecter maintenant
                              </a>
                            </div>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                              Cordialement,<br>
                              <strong style="color: #0EA5E9;">L'équipe HelpConfort Services</strong>
                            </p>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px 0; line-height: 1.5;">
                              Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement votre administrateur.
                            </p>
                            <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
                              © 2025 HelpConfort Services. Tous droits réservés.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
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
