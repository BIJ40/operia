import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

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

    // Vérifier que l'utilisateur qui fait la requête est admin
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

    // Vérifier le rôle admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      throw new Error('Accès refusé - Réservé aux administrateurs')
    }

    // Récupérer les données de la requête
    const { email, password, firstName, lastName, agence, roleAgence } = await req.json()

    if (!email || !password || !firstName || !lastName) {
      throw new Error('Email, mot de passe, prénom et nom sont requis')
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('L\'adresse email n\'est pas valide')
    }

    // Validation du mot de passe
    if (password.length < 8 || password.length > 100) {
      throw new Error('Le mot de passe doit contenir entre 8 et 100 caractères')
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

    // Mettre à jour le profil avec le flag de changement de mot de passe
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        agence: agence || null,
        role_agence: roleAgence || null,
        must_change_password: true 
      })
      .eq('id', newUser.user.id)

    if (updateError) {
      console.error('Erreur mise à jour profil:', updateError)
      throw new Error('Erreur lors de la mise à jour du profil')
    }

    // Envoyer l'email avec le mot de passe temporaire
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
                <h1>🎉 Bienvenue sur Helpbox!</h1>
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
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovable.app')}" class="button">
                    Se connecter à Helpbox!
                  </a>
                </div>
                
                <div class="footer">
                  <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.</p>
                  <p>© ${new Date().getFullYear()} Helpbox! - Tous droits réservés</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `

      await resend.emails.send({
        from: 'Helpbox! <support@helpconfort.services>',
        to: [email],
        subject: '🎉 Bienvenue sur Helpbox! - Vos identifiants de connexion',
        html: emailHtml,
      })

      console.log('Email envoyé avec succès à:', email)
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError)
      // On continue même si l'email échoue
    }

    console.log('Utilisateur créé avec succès:', email)

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