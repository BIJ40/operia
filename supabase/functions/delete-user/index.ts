import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GLOBAL_ROLES, getRoleLevel } from '../_shared/roles.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// N5+ (platform_admin) peut supprimer des utilisateurs
const canDeleteUsers = (roleLevel: number): boolean => {
  return roleLevel >= GLOBAL_ROLES.platform_admin // N5+
}

// Vérifier si l'appelant peut supprimer un utilisateur cible
const canDeleteTarget = (
  callerLevel: number, 
  targetLevel: number
): { allowed: boolean; reason?: string } => {
  // Seuls N5+ peuvent supprimer
  if (!canDeleteUsers(callerLevel)) {
    return { allowed: false, reason: 'Niveau N5 minimum requis pour supprimer des utilisateurs' }
  }
  
  // Ne peut pas supprimer quelqu'un de niveau supérieur
  if (targetLevel > callerLevel) {
    return { allowed: false, reason: 'Vous ne pouvez pas supprimer un utilisateur de niveau supérieur' }
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

    // Vérifier l'authentification
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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Non authentifié')
    }

    // Récupérer le profil de l'appelant
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role, agence')
      .eq('id', user.id)
      .single()

    const callerLevel = getRoleLevel(callerProfile?.global_role)
    const callerAgency = callerProfile?.agence || null

    console.log(`[delete-user] Appelant: ${user.id}, N${callerLevel}`)

    // Récupérer l'ID de l'utilisateur à supprimer
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('ID utilisateur requis')
    }

    // Ne pas permettre la suppression de son propre compte
    if (userId === user.id) {
      throw new Error('Impossible de supprimer votre propre compte')
    }

    // Récupérer le profil de la cible
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role, agence, email')
      .eq('id', userId)
      .single()

    const targetLevel = getRoleLevel(targetProfile?.global_role)

    console.log(`[delete-user] Cible: ${userId}, N${targetLevel}`)

    // Vérifier les droits de suppression
    const deleteCheck = canDeleteTarget(callerLevel, targetLevel)
    if (!deleteCheck.allowed) {
      console.log(`[delete-user] SUPPRESSION BLOQUÉE: ${deleteCheck.reason}`)
      throw new Error(deleteCheck.reason || 'Action non autorisée')
    }

    // Supprimer l'utilisateur
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('[delete-user] Erreur suppression:', deleteError)
      throw deleteError
    }

    console.log(`[delete-user] Succès: ${userId} supprimé par N${callerLevel}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[delete-user] Erreur:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
