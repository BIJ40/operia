import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';

interface RequestBody {
  asset_id: string;
  link_id?: string;
}

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

serve(async (req) => {
  // P2: Use centralized CORS instead of wildcard
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('agency_id, global_role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { asset_id, link_id } = body;

    if (!asset_id) {
      return new Response(
        JSON.stringify({ error: 'asset_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get asset
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('media_assets')
      .select('id, storage_bucket, storage_path, file_name, agency_id, deleted_at')
      .eq('id', asset_id)
      .single();

    if (assetError || !asset) {
      console.error('Asset fetch error:', assetError);
      return new Response(
        JSON.stringify({ error: 'Asset non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (asset.deleted_at) {
      return new Response(
        JSON.stringify({ error: 'Asset supprimé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roleLevel = getRoleLevel(profile.global_role);
    const isN5Plus = roleLevel >= 5;

    // B1 FIX: Verify agency match before anything else (except N5+ bypass)
    if (!isN5Plus && asset.agency_id !== profile.agency_id) {
      console.warn(`Agency mismatch: user ${userId} (agency ${profile.agency_id}) tried to access asset ${asset_id} (agency ${asset.agency_id})`);
      return new Response(
        JSON.stringify({ error: 'Accès refusé - agence différente' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check access via link
    let canAccess = isN5Plus;

    if (!canAccess) {
      // If link_id provided, verify via that specific link
      if (link_id) {
        const { data: link, error: linkError } = await supabaseAdmin
          .from('media_links')
          .select(`
            id,
            folder_id,
            deleted_at
          `)
          .eq('id', link_id)
          .eq('asset_id', asset_id)
          .is('deleted_at', null)
          .single();

        if (link && !linkError) {
          // Get folder to check scope
          const { data: folder } = await supabaseAdmin
            .from('media_folders')
            .select('id, agency_id, access_scope, deleted_at')
            .eq('id', link.folder_id)
            .is('deleted_at', null)
            .single();

          if (folder && folder.agency_id === profile.agency_id) {
            // Check scope access via DB function
            const { data: scopeOk } = await supabaseAdmin.rpc('can_access_folder_scope', {
              p_user_id: userId,
              p_scope: folder.access_scope,
            });
            canAccess = scopeOk === true;
          }
        }
      } else {
        // No link_id: check if ANY accessible link exists for this asset
        const { data: links } = await supabaseAdmin
          .from('media_links')
          .select(`
            id,
            folder:media_folders!folder_id(id, agency_id, access_scope, deleted_at)
          `)
          .eq('asset_id', asset_id)
          .is('deleted_at', null);

        if (links && links.length > 0) {
          for (const link of links) {
            const folder = link.folder as any;
            if (folder && !folder.deleted_at && folder.agency_id === profile.agency_id) {
              const { data: scopeOk } = await supabaseAdmin.rpc('can_access_folder_scope', {
                p_user_id: userId,
                p_scope: folder.access_scope,
              });
              if (scopeOk === true) {
                canAccess = true;
                break;
              }
            }
          }
        }
      }
    }

    if (!canAccess) {
      console.warn(`Access denied: user ${userId} cannot access asset ${asset_id}`);
      return new Response(
        JSON.stringify({ error: 'Accès refusé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL via Storage API
    const expiresIn = 300; // 5 minutes
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_path, expiresIn);

    if (urlError || !signedUrlData) {
      console.error('Signed URL generation error:', urlError);
      return new Response(
        JSON.stringify({ error: 'Erreur génération URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log access (fire and forget)
    try {
      await supabaseAdmin.from('document_access_logs').insert({
        document_id: asset_id,
        accessed_by: userId,
        access_type: 'download',
      });
      console.log(`Access logged for asset ${asset_id} by user ${userId}`);
    } catch (logError) {
      console.warn('Failed to log access:', logError);
    }

    console.log(`Signed URL generated for asset ${asset_id} by user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: signedUrlData.signedUrl,
        file_name: asset.file_name,
        expires_in: expiresIn,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
