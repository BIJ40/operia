import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Récupérer le profil de l'appelant
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role, agence')
      .eq('id', userId)
      .single()

    const callerLevel = getRoleLevel(callerProfile?.global_role)
    const callerAgency = callerProfile?.agence || null

    console.log(`[update-user-email] Appelant: ${userId}, N${callerLevel}`)

    const { userId: targetUserId, newEmail } = await req.json()

    if (!targetUserId || !newEmail) {
      throw new Error('userId et newEmail sont requis')
    }

    // Récupérer le profil de la cible
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role, agence')
      .eq('id', targetUserId)
      .single()

    const targetLevel = getRoleLevel(targetProfile?.global_role)
    const targetAgency = targetProfile?.agence || null

    console.log(`[update-user-email] Cible: ${targetUserId}, N${targetLevel}, agence: ${targetAgency}`)

    // Vérifier les droits
    const updateCheck = canUpdateEmail(callerLevel, targetLevel, callerAgency, targetAgency)
    if (!updateCheck.allowed) {
      console.log(`[update-user-email] MODIFICATION BLOQUÉE: ${updateCheck.reason}`)
      throw new Error(updateCheck.reason || 'Action non autorisée')
    }

    // Mettre à jour l'email dans auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { email: newEmail }
    )

    if (authError) {
      console.error('[update-user-email] Erreur auth:', authError)
      throw authError
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

    console.log(`[update-user-email] Succès: ${targetUserId} -> ${newEmail}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('[update-user-email] Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
