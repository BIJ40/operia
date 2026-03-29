import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts'
import { validateString, validateUUID } from '../_shared/validation.ts'
import { checkRateLimit } from '../_shared/rateLimiter.ts'
import { requireAal2 } from '../_shared/mfa.ts'

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

// Vérifier si l'appelant peut modifier l'email d'un utilisateur
const canUpdateEmail = (
  callerLevel: number, 
  targetLevel: number, 
  callerAgency: string | null, 
  targetAgency: string | null
): { allowed: boolean; reason?: string } => {
  // N0-N1: ne peuvent pas modifier
  if (callerLevel < GLOBAL_ROLES.franchisee_admin) {
    return { allowed: false, reason: 'Niveau insuffisant pour modifier des utilisateurs' }
  }
  
  // N2 (franchisee_admin): uniquement même agence
  if (callerLevel === GLOBAL_ROLES.franchisee_admin) {
    if (callerAgency !== targetAgency) {
      return { allowed: false, reason: 'Vous ne pouvez modifier que les utilisateurs de votre agence' }
    }
    if (targetLevel > GLOBAL_ROLES.franchisee_admin) {
      return { allowed: false, reason: 'Vous ne pouvez pas modifier un utilisateur de niveau supérieur' }
    }
    return { allowed: true }
  }
  
  // N3+ : peut modifier mais pas un niveau supérieur
  if (targetLevel > callerLevel) {
    return { allowed: false, reason: 'Vous ne pouvez pas modifier un utilisateur de niveau supérieur' }
  }
  
  return { allowed: true }
}

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

    // CRITIQUE: Authentifier via Supabase au lieu de décoder JWT manuellement
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Non autorisé')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    )

    const { data: { user }, error: userAuthError } = await supabaseClient.auth.getUser()
    if (userAuthError || !user) {
      throw new Error('Token invalide ou expiré')
    }

    const userId = user.id

    // Rate limiting: 5 attempts per 5 minutes per user
    await checkRateLimit(userId, { action: 'update-email', maxAttempts: 5, windowSeconds: 300 })

    // Valider les paramètres d'entrée
    const bodyRaw = await req.json()
    const targetUserId = validateUUID(bodyRaw.targetUserId, 'targetUserId')
    const newEmail = validateString(bodyRaw.newEmail, 'newEmail', { email: true, maxLength: 255 })

    // Récupérer le profil de l'appelant
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role, agency_id')
      .eq('id', userId)
      .single()

    const callerLevel = getRoleLevel(callerProfile?.global_role)
    const callerAgency = callerProfile?.agency_id || null

    console.log(`[update-user-email] Appelant: N${callerLevel}`)

    // Récupérer le profil de la cible
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role, agency_id')
      .eq('id', targetUserId)
      .single()

    const targetLevel = getRoleLevel(targetProfile?.global_role)
    const targetAgency = targetProfile?.agency_id || null

    console.log(`[update-user-email] Cible: N${targetLevel}`)

    // Vérifier les droits
    const updateCheck = canUpdateEmail(callerLevel, targetLevel, callerAgency, targetAgency)
    if (!updateCheck.allowed) {
      console.log(`[update-user-email] MODIFICATION BLOQUÉE: ${updateCheck.reason}`)
      throw new Error(updateCheck.reason || 'Action non autorisée')
    }

    // MFA/AAL2 enforcement for email update
    const mfaCheck = await requireAal2(req, callerLevel, userId, { functionName: 'update-user-email' });
    if (!mfaCheck.ok) return mfaCheck.response;

    // Mettre à jour l'email dans auth.users
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { email: newEmail }
    )

    if (updateAuthError) {
      console.error('[update-user-email] Erreur auth:', updateAuthError)
      throw updateAuthError
    }

    // Mettre à jour l'email dans profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', targetUserId)

    if (profileError) {
      console.error('[update-user-email] Erreur profile:', profileError)
      throw profileError
    }

    console.log(`[update-user-email] Succès: email mis à jour`)

    return withCors(req, new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    ))
  } catch (error: any) {
    console.error('[update-user-email] Erreur:', error)
    return withCors(req, new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    ))
  }
})
