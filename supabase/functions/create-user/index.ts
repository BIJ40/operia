import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { GLOBAL_ROLES, getRoleLevel, canAccessUsersPage, canEditTarget } from '../_shared/roles.ts'
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts'
import { validateString, validateOptionalString, validateOptionalBoolean } from '../_shared/validation.ts'
import { getDefaultModulesForCreation, EnabledModule } from '../_shared/defaultModules.ts'
import { checkRateLimit } from '../_shared/rateLimiter.ts'
import { withSentry } from '../_shared/withSentry.ts'
import { requireAal2 } from '../_shared/mfa.ts'

// Resend initialized lazily inside handler to avoid boot crash on invalid API key chars

serve(withSentry({ functionName: 'create-user' }, async (req) => {
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
      .select('global_role, agence, agency_id')
      .eq('id', user.id)
      .single()

    const callerLevel = getRoleLevel(callerProfile?.global_role)
    const callerAgency = callerProfile?.agence || null
    const callerAgencyId = callerProfile?.agency_id || null

    console.log(`[create-user] Appelant: N${callerLevel}`)

    // Rate limiting: 10 creations per 10 minutes per user
    await checkRateLimit(user.id, { action: 'create-user', maxAttempts: 10, windowSeconds: 600 })

    // Vérifier les droits de gestion (N3+ requis pour créer, N2 uniquement sa propre agence)
    if (!canAccessUsersPage(callerLevel)) {
      console.log(`[create-user] Accès refusé: N${callerLevel} < N2`)
      throw new Error('Accès refusé - Niveau N2 minimum requis')
    }

    // MFA/AAL2 enforcement for user creation
    const mfaCheck = await requireAal2(req, callerLevel, user.id, { functionName: 'create-user' });
    if (!mfaCheck.ok) return mfaCheck.response;

    // Valider les données d'entrée
    const bodyRaw = await req.json()
    
    const email = validateString(bodyRaw.email, 'email', { email: true, maxLength: 255 })
    const firstName = validateString(bodyRaw.firstName || bodyRaw.first_name, 'firstName', { minLength: 1, maxLength: 100 })
    const lastName = validateString(bodyRaw.lastName || bodyRaw.last_name, 'lastName', { minLength: 1, maxLength: 100 })
    const password = validateOptionalString(bodyRaw.password, 'password', 100) || generateSecurePassword()
    const agence = validateOptionalString(bodyRaw.agence, 'agence', 100) || null
    const agencyId = validateOptionalString(bodyRaw.agency_id, 'agency_id', 100) || null
    
    // 🛡️ P0.3: Rôle système OBLIGATOIRE - pas de fallback silencieux
    const globalRole = validateOptionalString(bodyRaw.globalRole || bodyRaw.global_role, 'globalRole', 50)
    if (!globalRole) {
      throw new Error('Le rôle système (global_role) est obligatoire pour créer un utilisateur')
    }
    
    const roleAgence = validateOptionalString(bodyRaw.role_agence || bodyRaw.roleAgence, 'roleAgence', 100) || null
    const sendEmail = validateOptionalBoolean(bodyRaw.sendEmail) !== false
    
    console.log(`[create-user] Params: email=${email}, sendEmail=${sendEmail}, bodyRaw.sendEmail=${bodyRaw.sendEmail}`)

    // Déterminer l'agence cible (UUID ou slug)
    let targetAgency = agence
    let targetAgencyId = agencyId

    // Si on a agency_id mais pas agence, récupérer le slug
    if (targetAgencyId && !targetAgency) {
      const { data: agency } = await supabaseAdmin
        .from('apogee_agencies')
        .select('slug')
        .eq('id', targetAgencyId)
        .single()
      
      if (agency) {
        targetAgency = agency.slug
      }
    }

    // Si on a agence mais pas agency_id, récupérer l'UUID
    if (targetAgency && !targetAgencyId) {
      const { data: agency } = await supabaseAdmin
        .from('apogee_agencies')
        .select('id')
        .eq('slug', targetAgency)
        .maybeSingle()
      
      if (agency) {
        targetAgencyId = agency.id
      }
    }

    const targetRoleLevel = getRoleLevel(globalRole)

    // N2 ne peut créer que dans sa propre agence
    if (callerLevel === GLOBAL_ROLES.franchisee_admin) {
      const sameAgencyBySlug = targetAgency && callerAgency && targetAgency === callerAgency
      const sameAgencyById = targetAgencyId && callerAgencyId && targetAgencyId === callerAgencyId
      
      if (!sameAgencyBySlug && !sameAgencyById) {
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

    // Validation des champs obligatoires
    if (!firstName || !firstName.trim()) {
      throw new Error('Le prénom est obligatoire')
    }
    if (!lastName || !lastName.trim()) {
      throw new Error('Le nom est obligatoire')
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('L\'adresse email n\'est pas valide')
    }

    // Validation du mot de passe si fourni
    // Symboles acceptés alignés avec le générateur frontend: !@#$%&*_+-=
    if (bodyRaw.password) {
      const hasLower = /[a-z]/.test(password)
      const hasUpper = /[A-Z]/.test(password)
      const hasDigit = /\d/.test(password)
      const hasSymbol = /[!@#$%&*_+\-=]/.test(password)
      const validLength = password.length >= 8 && password.length <= 100
      
      if (!hasLower || !hasUpper || !hasDigit || !hasSymbol || !validLength) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères avec au moins une majuscule, une minuscule, un chiffre et un symbole')
      }
    }

    // Vérifier si l'email existe déjà
    // FIX: Remplace listUsers() (non paginé, tronqué à 1000) par createUser
    // qui retourne une erreur spécifique si l'email existe déjà.
    // La vérification est donc déléguée à createUser ci-dessous, qui est atomique.

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
      // Supabase retourne une erreur spécifique si l'email existe déjà
      // (ex: "A user with this email address has already been registered")
      if (createError.message?.toLowerCase().includes('already') || 
          createError.message?.toLowerCase().includes('existe') ||
          createError.message?.toLowerCase().includes('duplicate')) {
        throw new Error('Cet email est déjà utilisé')
      }
      throw createError
    }

    if (!newUser.user) {
      throw new Error('Utilisateur non créé')
    }

    // Attendre que le trigger handle_new_user ait créé le profil
    const maxRetries = 10
    let profileExists = false
    for (let i = 0; i < maxRetries; i++) {
      const { data: checkProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', newUser.user.id)
        .maybeSingle()
      if (checkProfile) {
        profileExists = true
        break
      }
      console.log(`[create-user] Attente profil... tentative ${i + 1}/${maxRetries}`)
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    // Fallback robuste: si le trigger auth->profiles est absent/en erreur,
    // créer le profil manuellement pour éviter un compte auth orphelin.
    if (!profileExists) {
      console.warn('[create-user] Profil non créé par trigger, fallback en création manuelle')
      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          first_name: firstName,
          last_name: lastName,
          email,
        }, { onConflict: 'id' })

      if (insertProfileError) {
        console.error('[create-user] Erreur fallback création profil:', insertProfileError)
        throw new Error('Le profil utilisateur n\'a pas pu être initialisé. Veuillez contacter le support.')
      }

      profileExists = true
      console.log('[create-user] Profil créé manuellement avec succès')
    }

    // Mettre à jour le profil
    const profileUpdate: Record<string, any> = { 
      agence: targetAgency,
      agency_id: targetAgencyId,
      must_change_password: true,
      global_role: globalRole
    }

    // Ajouter role_agence si fourni
    if (roleAgence) {
      profileUpdate.role_agence = roleAgence
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', newUser.user.id)

    if (updateError) {
      console.error('[create-user] Erreur mise à jour profil:', updateError)
      throw new Error('Erreur lors de la mise à jour du profil')
    }

    // VALIDATION: Ne pas auto-créer l'agence - elle doit exister
    if (targetAgency && !targetAgencyId) {
      const { data: existingAgency } = await supabaseAdmin
        .from('apogee_agencies')
        .select('id')
        .eq('slug', targetAgency.toLowerCase().replace(/[^a-z0-9]/g, '-'))
        .maybeSingle()

      if (!existingAgency) {
        throw new Error(`L'agence "${targetAgency}" n'existe pas. Veuillez créer l'agence d'abord dans la section Administration > Gestion Agences.`)
      } else {
        // Mettre à jour l'agency_id du nouveau profil avec l'agence existante
        await supabaseAdmin
          .from('profiles')
          .update({ agency_id: existingAgency.id })
          .eq('id', newUser.user.id)
      }
    }

    // Insérer les modules par défaut dans user_modules (table relationnelle V2)
    const defaultModules = getDefaultModulesForCreation(globalRole, roleAgence)
    const moduleRows = Object.entries(defaultModules)
      .filter(([_, mod]: [string, EnabledModule]) => mod.enabled)
      .map(([moduleKey, mod]: [string, EnabledModule]) => ({
        user_id: newUser.user.id,
        module_key: moduleKey,
        options: mod.options || {},
        enabled_by: user.id
      }))

    if (moduleRows.length > 0) {
      const { error: modulesError } = await supabaseAdmin
        .from('user_modules')
        .insert(moduleRows)

      if (modulesError) {
        console.error('[create-user] Erreur insertion modules:', modulesError)
        // Non-bloquant: l'utilisateur est créé, les modules peuvent être ajoutés manuellement
      } else {
        console.log(`[create-user] ${moduleRows.length} modules par défaut insérés`)
      }

      // V2: enabled_modules JSONB supprimé - user_modules est la seule source de vérité
    }

    // Envoyer l'email
    if (sendEmail) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <body style="margin: 0; padding: 20px; background-color: #f4f4f4; font-family: Arial, sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                <tr>
                  <td style="background-color: #2563eb; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Bienvenue sur HelpConfort Services</h1>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="color: #333333; margin: 0 0 15px 0;">Bonjour <strong>${firstName} ${lastName}</strong>,</p>
                    <p style="color: #333333; margin: 0 0 20px 0;">Votre compte a été créé avec succès. Voici vos identifiants de connexion :</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-left: 4px solid #2563eb; background-color: #f8fafc;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 5px 0; color: #666666; font-size: 14px;">📧 Email de connexion :</p>
                          <p style="font-size: 18px; font-weight: bold; color: #2563eb; margin: 0 0 15px 0;">${email}</p>
                          <p style="margin: 0 0 5px 0; color: #666666; font-size: 14px;">🔑 Mot de passe temporaire :</p>
                          <p style="font-size: 18px; font-weight: bold; color: #f97316; margin: 0; font-family: monospace;">${password}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #ef4444; margin: 20px 0;"><strong>⚠️ Important :</strong> Ce mot de passe est temporaire. Vous devrez le modifier lors de votre première connexion.</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${Deno.env.get('APP_URL') || 'https://www.helpconfort.services'}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">Se connecter à HelpConfort Services</a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #999999; font-size: 12px; text-align: center; margin: 20px 0 0 0;">© ${new Date().getFullYear()} HelpConfort Services</p>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `

        console.log('[create-user] Envoi email à:', email)
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
        const emailResult = await resend.emails.send({
          from: 'HelpConfort Services <noreply@helpconfort.services>',
          to: [email],
          subject: '🎉 Bienvenue sur HelpConfort Services',
          html: emailHtml,
        })
        
        if (emailResult.error) {
          console.error('[create-user] Resend error:', JSON.stringify(emailResult.error))
        } else {
          console.log('[create-user] Email envoyé avec succès, id:', emailResult.data?.id)
        }
      } catch (emailError) {
        console.error('[create-user] Exception email:', emailError instanceof Error ? emailError.message : String(emailError))
      }
    }

    console.log(`[create-user] Succès: utilisateur créé avec rôle ${globalRole}`)

    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: newUser.user.id } 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ))
  } catch (error) {
    console.error('[create-user] Erreur:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    return withCors(req, new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ))
  }
}))

// Génère un mot de passe sécurisé de 18 caractères si non fourni
function generateSecurePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%&*_+-'
  const all = lowercase + uppercase + numbers + symbols
  
  let password = ''
  // Garantir au moins 2 de chaque type pour 18 caractères
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Compléter jusqu'à 18 caractères
  for (let i = 8; i < 18; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }
  
  // Mélanger le mot de passe
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
