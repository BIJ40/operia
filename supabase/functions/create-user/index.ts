import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { pseudo, password, firstName, lastName, agence, roleAgence } = await req.json()

    if (!pseudo || !password || !firstName || !lastName) {
      throw new Error('Pseudo, mot de passe, prénom et nom sont requis')
    }

    // Validation du pseudo
    const pseudoRegex = /^[a-zA-Z0-9_-]+$/
    if (!pseudoRegex.test(pseudo) || pseudo.length < 3 || pseudo.length > 30) {
      throw new Error('Le pseudo doit contenir 3-30 caractères (lettres, chiffres, - et _)')
    }

    // Validation du mot de passe
    if (password.length < 8 || password.length > 100) {
      throw new Error('Le mot de passe doit contenir entre 8 et 100 caractères')
    }

    // Vérifier si le pseudo existe déjà
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('pseudo')
      .eq('pseudo', pseudo)
      .maybeSingle()

    if (existingProfile) {
      throw new Error('Ce pseudo est déjà utilisé')
    }

    // Créer un email fictif interne basé sur le pseudo
    const internalEmail = `${pseudo}@internal.helpogee.local`

    // Créer l'utilisateur avec le service role
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        pseudo: pseudo
      }
    })

    if (createError) {
      console.error('Erreur création utilisateur:', createError)
      throw createError
    }

    if (!newUser.user) {
      throw new Error('Utilisateur non créé')
    }

    // Mettre à jour le profil avec le pseudo et le flag de changement de mot de passe
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        pseudo: pseudo,
        agence: agence || null,
        role_agence: roleAgence || null,
        must_change_password: true 
      })
      .eq('id', newUser.user.id)

    if (updateError) {
      console.error('Erreur mise à jour profil:', updateError)
      throw new Error('Erreur lors de la mise à jour du profil')
    }

    console.log('Utilisateur créé avec succès:', pseudo)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          pseudo: pseudo 
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
