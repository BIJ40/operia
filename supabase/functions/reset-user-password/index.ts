import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { GLOBAL_ROLES, getRoleLevel, canResetPassword } from '../_shared/roles.ts'
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

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

    // Authentification via JWT - Utilisation de l'API Supabase (sécurisé)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Non autorisé')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Validation sécurisée du token via Supabase Auth API
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !authUser) {
      console.error('[reset-user-password] Erreur auth:', authError)
      throw new Error('Token invalide ou expiré')
    }
    
    const userId = authUser.id

    // Récupérer le profil de l'appelant
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role, agence')
      .eq('id', userId)
      .single()

    const callerLevel = getRoleLevel(callerProfile?.global_role)
    const callerAgency = callerProfile?.agence || null

    console.log(`[reset-user-password] Appelant: ${userId}, N${callerLevel}`)

    // Récupérer les données de la requête
    const body = await req.json()
    const targetUserId = body.targetUserId || body.userId
    const newPassword = body.newPassword
    const sendEmail = body.sendEmail

    console.log(`[reset-user-password] Requête reçue pour userId: ${targetUserId}, password length: ${newPassword?.length || 0}`)

    if (!targetUserId || !newPassword) {
      throw new Error('userId et newPassword sont requis')
    }

    // Récupérer le profil de la cible
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role, agence, email, first_name, last_name')
      .eq('id', targetUserId)
      .single()

    const targetLevel = getRoleLevel(targetProfile?.global_role)
    const targetAgency = targetProfile?.agence || null

    console.log(`[reset-user-password] Cible: ${targetUserId}, N${targetLevel}, agence: ${targetAgency}`)

    // Vérifier les droits
    const resetCheck = canResetPassword(callerLevel, targetLevel, callerAgency, targetAgency)
    if (!resetCheck.allowed) {
      console.log(`[reset-user-password] RÉINIT BLOQUÉE: ${resetCheck.reason}`)
      throw new Error(resetCheck.reason || 'Action non autorisée')
    }

    // Validation simplifiée - 8 caractères minimum avec majuscule, minuscule, chiffre et symbole
    const hasLower = /[a-z]/.test(newPassword)
    const hasUpper = /[A-Z]/.test(newPassword)
    const hasDigit = /\d/.test(newPassword)
    const hasSymbol = /[!@#$%&*_+\-]/.test(newPassword)
    const validLength = newPassword.length >= 8 && newPassword.length <= 100

    console.log(`[reset-user-password] Validation: lower=${hasLower}, upper=${hasUpper}, digit=${hasDigit}, symbol=${hasSymbol}, length=${validLength}`)

    if (!hasLower || !hasUpper || !hasDigit || !hasSymbol || !validLength) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule, chiffre et symbole')
    }

    // Réinitialiser le mot de passe
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('[reset-user-password] Erreur update:', updateError)
      throw updateError
    }

    // Forcer le changement de mot de passe
    await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', targetUserId)

    console.log(`[reset-user-password] Succès pour ${targetUserId}`)

    // Envoyer l'email
    if (sendEmail !== false && targetProfile?.email) {
      try {
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
        const userName = targetProfile.first_name 
          ? `${targetProfile.first_name} ${targetProfile.last_name || ''}`
          : targetProfile.email

        await resend.emails.send({
          from: 'HelpConfort Services <onboarding@resend.dev>',
          to: [targetProfile.email],
          subject: 'Votre nouveau mot de passe temporaire',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <div style="background: linear-gradient(135deg, #0EA5E9 0%, #1e40af 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Réinitialisation de mot de passe</h1>
                  </div>
                  <div style="padding: 30px;">
                    <p>Bonjour <strong>${userName}</strong>,</p>
                    <p>Un administrateur a généré un nouveau mot de passe temporaire pour votre compte.</p>
                    <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 3px; border-radius: 12px; margin: 20px 0;">
                      <div style="background: white; padding: 20px; border-radius: 10px;">
                        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Votre mot de passe temporaire</p>
                        <p style="font-size: 24px; font-weight: bold; color: #f97316; margin: 0; font-family: monospace;">${newPassword}</p>
                      </div>
                    </div>
                    <p style="color: #ef4444;"><strong>⚠️ Important :</strong> Vous devrez changer ce mot de passe à votre prochaine connexion.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${Deno.env.get('APP_URL') || 'https://www.helpconfort.services'}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold;">
                        Se connecter
                      </a>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `,
        })
        console.log('[reset-user-password] Email envoyé à:', targetProfile.email)
      } catch (emailError) {
        console.error('[reset-user-password] Erreur email:', emailError)
      }
    }

    return withCors(req, new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    ))
  } catch (error: any) {
    console.error('[reset-user-password] Erreur:', error)
    return withCors(req, new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    ))
  }
})
