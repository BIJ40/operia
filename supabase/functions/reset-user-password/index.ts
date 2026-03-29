import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { GLOBAL_ROLES, getRoleLevel, canResetPassword } from '../_shared/roles.ts'
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rateLimiter.ts'
import { requireAal2 } from '../_shared/mfa.ts'

serve(async (req) => {
  console.log(`[reset-user-password] === FUNCTION CALLED === Method: ${req.method}, Origin: ${req.headers.get('origin')}`)
  
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) {
    console.log(`[reset-user-password] CORS rejected or OPTIONS handled`)
    return corsResult;
  }
  
  console.log(`[reset-user-password] CORS passed, processing request...`)

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
      .select('global_role, agency_id')
      .eq('id', userId)
      .single()

    const callerLevel = getRoleLevel(callerProfile?.global_role)
    const callerAgency = callerProfile?.agency_id || null

    console.log(`[reset-user-password] Appelant: ${userId}, N${callerLevel}`)

    // Rate limiting: 5 resets per 5 minutes per user
    await checkRateLimit(userId, { action: 'reset-password', maxAttempts: 5, windowSeconds: 300 })

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
      .select('global_role, agency_id, email, first_name, last_name')
      .eq('id', targetUserId)
      .single()

    const targetLevel = getRoleLevel(targetProfile?.global_role)
    const targetAgency = targetProfile?.agency_id || null

    console.log(`[reset-user-password] Cible: ${targetUserId}, N${targetLevel}, agency_id: ${targetAgency}`)

    // Vérifier les droits
    const resetCheck = canResetPassword(callerLevel, targetLevel, callerAgency, targetAgency)
    if (!resetCheck.allowed) {
      console.log(`[reset-user-password] RÉINIT BLOQUÉE: ${resetCheck.reason}`)
      throw new Error(resetCheck.reason || 'Action non autorisée')
    }

    // MFA/AAL2 enforcement for password reset
    const mfaCheck = await requireAal2(req, callerLevel, userId, { functionName: 'reset-user-password' });
    if (!mfaCheck.ok) return mfaCheck.response;

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
      
      // Gestion spécifique de l'erreur "pwned password"
      if (updateError.code === 'weak_password' || updateError.message?.includes('weak')) {
        throw new Error('Ce mot de passe est trop courant ou a été compromis dans une fuite de données. Utilisez le bouton "Générer" pour créer un mot de passe sécurisé.')
      }
      
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
          from: 'HelpConfort Services <noreply@helpconfort.services>',
          to: [targetProfile.email],
          subject: 'Votre nouveau mot de passe temporaire',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: Arial, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                  <tr>
                    <td style="background-color: #0EA5E9; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Réinitialisation de mot de passe</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                      <p style="color: #333333; margin: 0 0 15px 0;">Bonjour <strong>${userName}</strong>,</p>
                      <p style="color: #333333; margin: 0 0 20px 0;">Un administrateur a généré un nouveau mot de passe temporaire pour votre compte.</p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #FFF7ED; border: 2px solid #f97316; border-radius: 10px; padding: 20px;">
                            <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">Votre mot de passe temporaire</p>
                            <p style="font-size: 22px; font-weight: bold; color: #f97316; margin: 0; font-family: monospace; letter-spacing: 1px;">${newPassword}</p>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #ef4444; margin: 20px 0;"><strong>⚠️ Important :</strong> Vous devrez changer ce mot de passe à votre prochaine connexion.</p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${Deno.env.get('APP_URL') || 'https://www.helpconfort.services'}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">Se connecter</a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #999999; font-size: 12px; text-align: center; margin: 20px 0 0 0;">© ${new Date().getFullYear()} HelpConfort Services</p>
                    </td>
                  </tr>
                </table>
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
