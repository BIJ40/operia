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

    // Récupérer l'ID de l'utilisateur à supprimer
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('ID utilisateur requis')
    }

    // Ne pas permettre la suppression de son propre compte
    if (userId === user.id) {
      throw new Error('Impossible de supprimer votre propre compte')
    }

    // Supprimer l'utilisateur
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Erreur suppression utilisateur:', deleteError)
      throw deleteError
    }

    console.log('Utilisateur supprimé avec succès:', userId)

    return new Response(
      JSON.stringify({ success: true }),
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
