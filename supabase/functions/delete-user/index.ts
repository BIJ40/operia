import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GLOBAL_ROLES, getRoleLevel } from '../_shared/roles.ts'
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts'
import { requireAal2 } from '../_shared/mfa.ts'

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
      .select('global_role, agency_id')
      .eq('id', user.id)
      .single()

    const callerLevel = getRoleLevel(callerProfile?.global_role)
    const callerAgency = callerProfile?.agency_id || null

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
      .select('global_role, agency_id, email')
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

    // MFA/AAL2 enforcement for user deletion
    const mfaCheck = await requireAal2(req, callerLevel, user.id, { functionName: 'delete-user' });
    if (!mfaCheck.ok) return mfaCheck.response;

    // Supprimer toutes les dépendances avant de supprimer l'utilisateur
    console.log(`[delete-user] Suppression des dépendances pour ${userId}`)
    
    // === TABLES AVEC FK SANS CASCADE ===
    
    // 1. conversations (created_by → auth.users, NO ACTION)
    await supabaseAdmin.from('conversations').update({ created_by: null }).eq('created_by', userId)
    
    // 2. statia_widgets (created_by → auth.users, NO ACTION)
    await supabaseAdmin.from('statia_widgets').delete().eq('created_by', userId)
    
    // 3. statia_custom_metrics (created_by → auth.users)
    await supabaseAdmin.from('statia_custom_metrics').delete().eq('created_by', userId)
    
    // 4. leave_requests (created_by + validated_by → profiles, NO ACTION)
    await supabaseAdmin.from('leave_requests').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('leave_requests').update({ validated_by: null }).eq('validated_by', userId)
    
    // 5. collaborator_document_folders (created_by → profiles, NO ACTION)
    await supabaseAdmin.from('collaborator_document_folders').update({ created_by: null }).eq('created_by', userId)
    
    
    // 7. user_presence (user_id → auth.users)
    await supabaseAdmin.from('user_presence').delete().eq('user_id', userId)
    
    // 8. apogee_ticket_tags (created_by)
    await supabaseAdmin.from('apogee_ticket_tags').update({ created_by: null }).eq('created_by', userId)
    
    // 9. user_modules (user_id → profiles)
    await supabaseAdmin.from('user_modules').delete().eq('user_id', userId)
    
    // 10. user_consents (user_id)
    await supabaseAdmin.from('user_consents').delete().eq('user_id', userId)
    
    // 11. sensitive_data_access_logs (user_id)
    await supabaseAdmin.from('sensitive_data_access_logs').delete().eq('user_id', userId)
    
    // 12. agency_rh_roles (granted_by sans CASCADE)
    await supabaseAdmin.from('agency_rh_roles').update({ granted_by: null }).eq('granted_by', userId)
    await supabaseAdmin.from('agency_rh_roles').delete().eq('user_id', userId)
    
    
    // 14. Supprimer les rôles franchiseur
    await supabaseAdmin.from('franchiseur_roles').delete().eq('user_id', userId)
    
    // 15. Collaborators - SET NULL sur user_id et created_by
    await supabaseAdmin.from('collaborators').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('collaborators').update({ user_id: null }).eq('user_id', userId)
    
    // 16. collaborator_documents (uploaded_by sans CASCADE)
    await supabaseAdmin.from('collaborator_documents').update({ uploaded_by: null }).eq('uploaded_by', userId)
    
    // 17. collaborator_sensitive_data (last_accessed_by)
    await supabaseAdmin.from('collaborator_sensitive_data').update({ last_accessed_by: null }).eq('last_accessed_by', userId)
    
    // 18. document_requests (processed_by + locked_by sans CASCADE)
    await supabaseAdmin.from('document_requests').update({ processed_by: null }).eq('processed_by', userId)
    await supabaseAdmin.from('document_requests').update({ locked_by: null }).eq('locked_by', userId)
    
    // 19. document_access_logs (accessed_by)
    await supabaseAdmin.from('document_access_logs').delete().eq('accessed_by', userId)
    
    // 20. employment_contracts (created_by sans CASCADE)
    await supabaseAdmin.from('employment_contracts').update({ created_by: null }).eq('created_by', userId)
    
    // 21. salary_history (decided_by sans CASCADE)
    await supabaseAdmin.from('salary_history').update({ decided_by: null }).eq('decided_by', userId)
    
    // 22. Messages (sender_id sans CASCADE)
    await supabaseAdmin.from('messages').delete().eq('sender_id', userId)
    
    // 23. ticket_duplicate_suggestions (reviewed_by sans CASCADE)
    await supabaseAdmin.from('ticket_duplicate_suggestions').update({ reviewed_by: null }).eq('reviewed_by', userId)
    
    // 24. Supprimer les tickets support et dépendances
    const { data: supportTickets } = await supabaseAdmin
      .from('support_tickets')
      .select('id')
      .eq('user_id', userId)
    
    if (supportTickets && supportTickets.length > 0) {
      const ticketIds = supportTickets.map(t => t.id)
      await supabaseAdmin.from('support_messages').delete().in('ticket_id', ticketIds)
      await supabaseAdmin.from('support_attachments').delete().in('ticket_id', ticketIds)
    }
    
    await supabaseAdmin.from('support_tickets').delete().eq('user_id', userId)
    await supabaseAdmin.from('support_tickets').update({ assigned_to: null }).eq('assigned_to', userId)
    
    // 25. Supprimer les tickets Apogée (FK sans CASCADE)
    await supabaseAdmin.from('apogee_ticket_comments').update({ created_by_user_id: null }).eq('created_by_user_id', userId)
    await supabaseAdmin.from('apogee_ticket_history').delete().eq('user_id', userId)
    await supabaseAdmin.from('apogee_ticket_attachments').update({ uploaded_by: null }).eq('uploaded_by', userId)
    await supabaseAdmin.from('apogee_ticket_views').delete().eq('user_id', userId)
    await supabaseAdmin.from('apogee_ticket_user_roles').delete().eq('user_id', userId)
    await supabaseAdmin.from('apogee_tickets').update({ 
      created_by_user_id: null,
      last_modified_by_user_id: null,
      qualified_by: null
    }).or(`created_by_user_id.eq.${userId},last_modified_by_user_id.eq.${userId},qualified_by.eq.${userId}`)
    
    // 26. Supprimer les autres données
    await supabaseAdmin.from('chatbot_queries').delete().eq('user_id', userId)
    await supabaseAdmin.from('favorites').delete().eq('user_id', userId)
    await supabaseAdmin.from('announcement_reads').delete().eq('user_id', userId)
    
    await supabaseAdmin.from('expense_requests').update({ 
      requester_id: null,
      approver_id: null 
    }).or(`requester_id.eq.${userId},approver_id.eq.${userId}`)
    await supabaseAdmin.from('planning_signatures').update({ signed_by_user_id: null }).eq('signed_by_user_id', userId)
    
    // 27. agency_stamps (uploaded_by)
    await supabaseAdmin.from('agency_stamps').update({ uploaded_by: null }).eq('uploaded_by', userId)
    
    // 28. rh_audit_log (user_id)
    await supabaseAdmin.from('rh_audit_log').delete().eq('user_id', userId)
    
    // 29. Conversation members et typing status
    await supabaseAdmin.from('typing_status').delete().eq('user_id', userId)
    
    // 30. rh_requests (archived_by, processed_by → profiles)
    await supabaseAdmin.from('rh_requests').update({ archived_by: null }).eq('archived_by', userId)
    await supabaseAdmin.from('rh_requests').update({ processed_by: null }).eq('processed_by', userId)
    await supabaseAdmin.from('conversation_members').delete().eq('user_id', userId)
    
    // 31. FK directes vers auth.users sans CASCADE ni SET NULL
    await supabaseAdmin.from('pending_registrations').update({ reviewed_by: null }).eq('reviewed_by', userId)
    await supabaseAdmin.from('realisations').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('employee_cost_profiles').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('employee_salary_documents').update({ validated_by: null }).eq('validated_by', userId)
    await supabaseAdmin.from('employee_salary_documents').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('project_costs').update({ validated_by: null }).eq('validated_by', userId)
    await supabaseAdmin.from('project_costs').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('project_cost_documents').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('agency_overhead_rules').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('project_profitability_snapshots').update({ created_by: null }).eq('created_by', userId)
    await supabaseAdmin.from('project_profitability_snapshots').update({ validated_by: null }).eq('validated_by', userId)
    await supabaseAdmin.from('agency_financial_months').update({ locked_by: null }).eq('locked_by', userId)
    await supabaseAdmin.from('agency_performance_config').update({ updated_by: null }).eq('updated_by', userId)
    await supabaseAdmin.from('data_source_flags').update({ updated_by: null }).eq('updated_by', userId)
    
    // 15. Supprimer le profil
    console.log(`[delete-user] Suppression du profil`)
    const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
    
    if (profileDeleteError) {
      console.error('[delete-user] Erreur suppression profil:', profileDeleteError)
      throw new Error(`Erreur suppression profil: ${profileDeleteError.message}`)
    }

    console.log(`[delete-user] Profil supprimé, suppression de l'utilisateur auth`)

    // 16. Supprimer l'utilisateur de auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('[delete-user] Erreur suppression auth:', deleteError)
      throw deleteError
    }

    console.log(`[delete-user] Succès: ${userId} supprimé par N${callerLevel}`)

    return withCors(req, new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    ))
  } catch (error) {
    console.error('[delete-user] Erreur:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return withCors(req, new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ))
  }
})