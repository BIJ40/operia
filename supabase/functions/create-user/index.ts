import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

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

// N2+ peut accéder à la gestion utilisateurs
const canAccessUsersPage = (roleLevel: number): boolean => {
  return roleLevel >= GLOBAL_ROLES.franchisee_admin // N2+
}

// N3+ peut gérer des utilisateurs (créer/modifier)
const canManageUsers = (roleLevel: number): boolean => {
  return roleLevel >= GLOBAL_ROLES.franchisor_user // N3+
}

// Vérifier si l'appelant peut créer/modifier un utilisateur cible
const canEditTarget = (
  callerLevel: number, 
  targetLevel: number, 
  callerAgency: string | null, 
  targetAgency: string | null
): { allowed: boolean; reason?: string } => {
  // N0-N1: ne peuvent pas modifier d'autres utilisateurs
  if (callerLevel < GLOBAL_ROLES.franchisee_admin) {
    return { allowed: false, reason: 'Niveau insuffisant pour gérer des utilisateurs' }
  }
  
  // N2 (franchisee_admin): uniquement même agence, max N2
  if (callerLevel === GLOBAL_ROLES.franchisee_admin) {
    if (callerAgency !== targetAgency) {
      return { allowed: false, reason: 'Vous ne pouvez gérer que les utilisateurs de votre agence' }
    }
    if (targetLevel > GLOBAL_ROLES.franchisee_admin) {
      return { allowed: false, reason: 'Vous ne pouvez pas attribuer un rôle supérieur à N2 (Admin agence)' }
    }
    return { allowed: true }
  }
  
  // N3+ : accès global, mais plafonnement au niveau de l'appelant
  if (targetLevel > callerLevel) {
    return { allowed: false, reason: `Vous ne pouvez pas attribuer un rôle supérieur à N${callerLevel}` }
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

    console.log(`[create-user] Appelant: ${user.id}, N${callerLevel}, agence: ${callerAgency}`)

    // Vérifier les droits de gestion (N3+ requis pour créer, N2 uniquement sa propre agence)
    if (!canAccessUsersPage(callerLevel)) {
      console.log(`[create-user] Accès refusé: N${callerLevel} < N2`)
      throw new Error('Accès refusé - Niveau N2 minimum requis')
    }

    // Récupérer les données de la requête
    const { email, password, firstName, lastName, agence, globalRole, sendEmail } = await req.json()

    if (!email || !password || !firstName || !lastName) {
      throw new Error('Email, mot de passe, prénom et nom sont requis')
    }

    const targetAgency = agence || null
    const targetRoleLevel = getRoleLevel(globalRole)

    // N2 ne peut créer que dans sa propre agence
    if (callerLevel === GLOBAL_ROLES.franchisee_admin) {
      if (targetAgency !== callerAgency) {
        console.log(`[create-user] N2 tente de créer hors agence: ${targetAgency} != ${callerAgency}`)
        throw new Error('Vous ne pouvez créer des utilisateurs que dans votre propre agence')
      }
    }

    // Validation du rôle cible
    const editCheck = canEditTarget(callerLevel, targetRoleLevel, callerAgency, targetAgency)
    if (!editCheck.allowed) {
      console.log(`[create-user] ESCALADE BLOQUÉE: ${editCheck.reason}`)
      throw new Error(editCheck.reason || 'Action non autorisée')
    }

    console.log(`[create-user] Création autorisée: ${globalRole} (N${targetRoleLevel}) par N${callerLevel}`)

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('L\'adresse email n\'est pas valide')
    }

    // Validation du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/])[A-Za-z\d!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]{8,100}$/;
    if (!passwordRegex.test(password)) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères avec au moins une majuscule, une minuscule, un chiffre et un symbole')
    }

    // Vérifier si l'email existe déjà
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    if (existingUser?.users?.some(u => u.email === email)) {
      throw new Error('Cet email est déjà utilisé')
    }

    // Créer l'utilisateur
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (createError) {
      console.error('[create-user] Erreur création:', createError)
      throw createError
    }

    if (!newUser.user) {
      throw new Error('Utilisateur non créé')
    }

    // Mettre à jour le profil
    const profileUpdate: Record<string, any> = { 
      agence: targetAgency,
      must_change_password: true,
      global_role: globalRole || 'franchisee_user'
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', newUser.user.id)

    if (updateError) {
      console.error('[create-user] Erreur mise à jour profil:', updateError)
      throw new Error('Erreur lors de la mise à jour du profil')
    }

    // Auto-créer l'agence si elle n'existe pas
    if (targetAgency) {
      const { data: existingAgency } = await supabaseAdmin
        .from('apogee_agencies')
        .select('id')
        .eq('slug', targetAgency.toLowerCase().replace(/[^a-z0-9]/g, '-'))
        .maybeSingle()

      if (!existingAgency) {
        const agencySlug = targetAgency.toLowerCase().replace(/[^a-z0-9]/g, '-')
        await supabaseAdmin
          .from('apogee_agencies')
          .insert({
            slug: agencySlug,
            label: targetAgency,
            is_active: true
          })
        console.log('[create-user] Agence créée:', agencySlug)
      }
    }

    // Envoyer l'email
    if (sendEmail !== false) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
                .credential-item { margin: 15px 0; }
                .credential-label { font-weight: bold; color: #666; font-size: 14px; }
                .credential-value { font-size: 18px; color: #2563eb; font-weight: bold; font-family: monospace; }
                .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Bienvenue sur HelpConfort Services</h1>
                </div>
                <div class="content">
                  <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
                  <p>Votre compte a été créé avec succès. Voici vos identifiants de connexion :</p>
                  <div class="credentials">
                    <div class="credential-item">
                      <div class="credential-label">📧 Email de connexion :</div>
                      <div class="credential-value">${email}</div>
                    </div>
                    <div class="credential-item">
                      <div class="credential-label">🔑 Mot de passe temporaire :</div>
                      <div class="credential-value">${password}</div>
                    </div>
                  </div>
                  <p><strong>⚠️ Important :</strong> Ce mot de passe est temporaire. Vous devrez le modifier lors de votre première connexion.</p>
                  <div style="text-align: center;">
                    <a href="${Deno.env.get('APP_URL') || 'https://www.helpconfort.services'}" class="button">
                      Se connecter
                    </a>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} HelpConfort Services</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `

        await resend.emails.send({
          from: 'HelpConfort Services <support@helpconfort.services>',
          to: [email],
          subject: '🎉 Bienvenue sur HelpConfort Services',
          html: emailHtml,
        })
        console.log('[create-user] Email envoyé:', email)
      } catch (emailError) {
        console.error('[create-user] Erreur email:', emailError)
      }
    }

    console.log(`[create-user] Succès: ${email} avec rôle ${globalRole || 'franchisee_user'}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: newUser.user.id, email: email } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[create-user] Erreur:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
