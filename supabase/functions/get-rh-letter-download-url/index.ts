import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id, global_role')
      .eq('id', user.id)
      .single();

    if (!profile?.agency_id) {
      return new Response(JSON.stringify({ error: 'Utilisateur non rattaché à une agence' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roleLevel = getRoleLevel(profile.global_role);

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'request_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load request
    const { data: rhRequest, error: reqError } = await supabase
      .from('rh_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (reqError || !rhRequest) {
      return new Response(JSON.stringify({ error: 'Demande non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check access
    const isOwner = rhRequest.employee_user_id === user.id;
    const isN2Plus = roleLevel >= 2 && rhRequest.agency_id === profile.agency_id;
    const isAdmin = roleLevel >= 5;

    if (!isAdmin && !isN2Plus) {
      // N1: must be owner AND letter must be published
      if (!isOwner) {
        return new Response(JSON.stringify({ error: 'Accès refusé - cette demande ne vous appartient pas' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!rhRequest.employee_can_download) {
        return new Response(JSON.stringify({ error: 'La lettre n\'est pas encore disponible au téléchargement' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check letter exists
    if (!rhRequest.generated_letter_path) {
      return new Response(JSON.stringify({ error: 'Aucune lettre générée pour cette demande' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate signed URL (60 seconds)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('rh-documents')
      .createSignedUrl(rhRequest.generated_letter_path, 60);

    if (urlError || !signedUrl) {
      console.error('Signed URL error:', urlError);
      return new Response(JSON.stringify({ error: 'Erreur génération URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Download URL generated for request ${request_id} by user ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      url: signedUrl.signedUrl,
      file_name: rhRequest.generated_letter_file_name,
      expires_in: 60,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur interne';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getRoleLevel(role: string | null): number {
  const levels: Record<string, number> = {
    'base_user': 0,
    'franchisee_user': 1,
    'franchisee_admin': 2,
    'franchisor_user': 3,
    'franchisor_admin': 4,
    'platform_admin': 5,
    'superadmin': 6,
  };
  return levels[role || ''] ?? 0;
}
