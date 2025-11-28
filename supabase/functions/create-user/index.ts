import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

// Hiérarchie des rôles V2 (doit correspondre à globalRoles.ts)
const GLOBAL_ROLES: Record<string, number> = {
  base_user: 0,
  franchisee_user: 1,
  franchisee_admin: 2,
  franchisor_user: 3,
  franchisor_admin: 4,
  platform_admin: 5,
  superadmin: 6,
}

const MIN_ROLE_TO_MANAGE_USERS = 3 // N3 (franchisor_user)

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

    // Vérifier que l'utilisateur qui fait la requête est authentifié
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

    // Récupérer le profil de l'appelant (global_role V2)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single()

    // Vérifier le rôle admin (legacy) OU le global_role V2
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    const callerGlobalRoleLevel = callerProfile?.global_role 
      ? GLOBAL_ROLES[callerProfile.global_role] ?? 0 
      : 0

    const isLegacyAdmin = !!roleData
    const canManageUsers = callerGlobalRoleLevel >= MIN_ROLE_TO_MANAGE_USERS || isLegacyAdmin

    if (!canManageUsers) {
      console.log(`[create-user] Accès refusé pour user ${user.id}: global_role=${callerProfile?.global_role}, isLegacyAdmin=${isLegacyAdmin}`)
      throw new Error('Accès refusé - Vous devez être N3+ pour gérer des utilisateurs')
    }

    // Récupérer les données de la requête
    const { email, password, firstName, lastName, agence, roleAgence, globalRole, sendEmail } = await req.json()

    if (!email || !password || !firstName || !lastName) {
      throw new Error('Email, mot de passe, prénom et nom sont requis')
    }

    // Validation du rôle global demandé (plafonnement)
    if (globalRole) {
      const requestedRoleLevel = GLOBAL_ROLES[globalRole] ?? 0
      
      // Un utilisateur ne peut assigner un rôle supérieur au sien (sauf legacy admin qui peut tout)
      if (!isLegacyAdmin && requestedRoleLevel > callerGlobalRoleLevel) {
        console.log(`[create-user] ESCALADE DE PRIVILÈGES BLOQUÉE: user ${user.id} (N${callerGlobalRoleLevel}) a tenté d'assigner ${globalRole} (N${requestedRoleLevel})`)
        throw new Error(`Vous ne pouvez pas assigner un rôle supérieur à votre niveau (N${callerGlobalRoleLevel})`)
      }
      
      console.log(`[create-user] Rôle global validé: ${globalRole} (N${requestedRoleLevel}) par user N${callerGlobalRoleLevel}`)
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('L\'adresse email n\'est pas valide')
    }

    // Validation du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/])[A-Za-z\d!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]{8,100}$/;
    if (!passwordRegex.test(password)) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères avec au moins une majuscule, une minuscule, un chiffre et un symbole (!@#$%^&*(),.?":{}|<>_-+=[]\\\/)')
    }

    // Vérifier si l'email existe déjà
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    if (existingUser?.users?.some(u => u.email === email)) {
      throw new Error('Cet email est déjà utilisé')
    }

    // Créer l'utilisateur avec le service role
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
      console.error('Erreur création utilisateur:', createError)
      throw createError
    }

    if (!newUser.user) {
      throw new Error('Utilisateur non créé')
    }

    // Mettre à jour le profil avec le flag de changement de mot de passe ET le global_role V2
    const profileUpdate: Record<string, any> = { 
      agence: agence || null,
      role_agence: roleAgence || null,
      must_change_password: true 
    }
    
    // Ajouter le global_role V2 si fourni
    if (globalRole) {
      profileUpdate.global_role = globalRole
      console.log(`[create-user] Attribution du global_role V2: ${globalRole} à user ${newUser.user.id}`)
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', newUser.user.id)

    if (updateError) {
      console.error('Erreur mise à jour profil:', updateError)
      throw new Error('Erreur lors de la mise à jour du profil')
    }

    // Auto-créer l'agence si elle n'existe pas déjà
    if (agence) {
      const { data: existingAgency } = await supabaseAdmin
        .from('apogee_agencies')
        .select('id')
        .eq('slug', agence.toLowerCase().replace(/[^a-z0-9]/g, '-'))
        .maybeSingle()

      if (!existingAgency) {
        const agencySlug = agence.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const { error: agencyError } = await supabaseAdmin
          .from('apogee_agencies')
          .insert({
            slug: agencySlug,
            label: agence,
            is_active: true
          })

        if (agencyError) {
          console.error('Erreur création agence:', agencyError)
          // On continue même si la création d'agence échoue
        } else {
          console.log('Agence créée automatiquement:', agencySlug)
        }
      }
    }

    // Envoyer l'email avec le mot de passe temporaire seulement si demandé
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
                  
                  <p><strong>⚠️ Important :</strong> Ce mot de passe est temporaire. Vous devrez le modifier lors de votre première connexion pour des raisons de sécurité.</p>
                  
                  <div style="text-align: center;">
                    <a href="${Deno.env.get('APP_URL') || 'https://www.helpconfort.services'}" class="button">
                      Se connecter à HelpConfort Services
                    </a>
                  </div>
                  
                  <div class="footer">
                    <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.</p>
                    <p>© ${new Date().getFullYear()} HelpConfort Services - Tous droits réservés</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `

        await resend.emails.send({
          from: 'HelpConfort Services <support@helpconfort.services>',
          to: [email],
          subject: '🎉 Bienvenue sur HelpConfort Services - Vos identifiants de connexion',
          html: emailHtml,
        })

        console.log('Email envoyé avec succès à:', email)
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError)
        // On continue même si l'email échoue
      }
    } else {
      console.log('Envoi d\'email désactivé par l\'administrateur')
    }

    console.log('Utilisateur créé avec succès:', email, globalRole ? `avec rôle ${globalRole}` : '')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: email 
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erreur:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})