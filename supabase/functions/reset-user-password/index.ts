import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// SYSTÈME DE PERMISSIONS V2.0 - Helpers centralisés
// ============================================================================

const GLOBAL_ROLES: Record<string, number> = {
  base_user: 0,        // N0
  franchisee_user: 1,  // N1
  franchisee_admin: 2, // N2
  franchisor_user: 3,  // N3
  franchisor_admin: 4, // N4
  platform_admin: 5,   // N5
  superadmin: 6,       // N6
}

const getRoleLevel = (role: string | null): number => {
  if (!role) return 0
  return GLOBAL_ROLES[role] ?? 0
}

// Vérifier si l'appelant peut réinitialiser le mot de passe d'un utilisateur
const canResetPassword = (
  callerLevel: number, 
  targetLevel: number, 
  callerAgency: string | null, 
  targetAgency: string | null
): { allowed: boolean; reason?: string } => {
  // N0-N1: ne peuvent pas réinitialiser
  if (callerLevel < GLOBAL_ROLES.franchisee_admin) {
    return { allowed: false, reason: 'Niveau insuffisant pour réinitialiser des mots de passe' }
  }
  
  // N2 (franchisee_admin): uniquement même agence
  if (callerLevel === GLOBAL_ROLES.franchisee_admin) {
    if (callerAgency !== targetAgency) {
      return { allowed: false, reason: 'Vous ne pouvez réinitialiser que les mots de passe de votre agence' }
    }
    if (targetLevel > GLOBAL_ROLES.franchisee_admin) {
      return { allowed: false, reason: 'Vous ne pouvez pas réinitialiser le mot de passe d\'un utilisateur de niveau supérieur' }
    }
    return { allowed: true }
  }
  
  // N3+ : peut réinitialiser mais pas pour un niveau supérieur
  if (targetLevel > callerLevel) {
    return { allowed: false, reason: 'Vous ne pouvez pas réinitialiser le mot de passe d\'un utilisateur de niveau supérieur' }
  }
  
  return { allowed: true }
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

    // Authentification via JWT
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
    const { userId: targetUserId, newPassword, sendEmail } = await req.json()

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

    // Validation du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/])[A-Za-z\d!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]{8,100}$/;
    if (!passwordRegex.test(newPassword)) {
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
          from: 'HelpConfort Services <support@helpconfort.services>',
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

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('[reset-user-password] Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
