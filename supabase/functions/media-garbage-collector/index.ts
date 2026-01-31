import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrphanedAsset {
  id: string;
  storage_bucket: string;
  storage_path: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin (via cron or manual trigger with service key)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Non authentifié' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is N5+
      const { data: profile } = await supabase
        .from('profiles')
        .select('global_role')
        .eq('id', user.id)
        .single();

      const roleLevels: Record<string, number> = {
        'superadmin': 6,
        'platform_admin': 5,
        'franchisor_admin': 4,
        'franchisor_user': 3,
        'franchisee_admin': 2,
        'franchisee_user': 1,
        'base_user': 0,
      };
      const roleLevel = roleLevels[profile?.global_role || 'base_user'] || 0;

      if (roleLevel < 5) {
        return new Response(
          JSON.stringify({ success: false, error: 'Accès réservé aux administrateurs' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // Default to dry run for safety
    const olderThanDays = body.older_than_days || 30; // Default 30 days retention

    console.log(`[GC] Starting garbage collection (dry_run: ${dryRun}, older_than_days: ${olderThanDays})`);

    // Find orphaned assets (soft-deleted with no active links, older than retention period)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Step 1: Find assets where ALL links are soft-deleted
    const { data: orphanedAssets, error: queryError } = await supabase
      .from('media_assets')
      .select(`
        id,
        storage_bucket,
        storage_path,
        deleted_at,
        media_links!inner(id, deleted_at)
      `)
      .not('media_links.deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate.toISOString());

    if (queryError) {
      console.error('[GC] Query error:', queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Filter to only assets where ALL links are deleted
    const { data: allAssets } = await supabase
      .from('media_assets')
      .select('id, storage_bucket, storage_path')
      .lt('deleted_at', cutoffDate.toISOString())
      .not('deleted_at', 'is', null);

    const assetsToDelete: OrphanedAsset[] = [];

    for (const asset of allAssets || []) {
      // Check if this asset has any active links
      const { count } = await supabase
        .from('media_links')
        .select('id', { count: 'exact', head: true })
        .eq('asset_id', asset.id)
        .is('deleted_at', null);

      if (count === 0) {
        assetsToDelete.push(asset);
      }
    }

    console.log(`[GC] Found ${assetsToDelete.length} orphaned assets to delete`);

    const results = {
      total_found: assetsToDelete.length,
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!dryRun && assetsToDelete.length > 0) {
      for (const asset of assetsToDelete) {
        try {
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from(asset.storage_bucket)
            .remove([asset.storage_path]);

          if (storageError) {
            console.warn(`[GC] Storage delete failed for ${asset.id}:`, storageError);
            // Continue anyway - file might already be deleted
          }

          // Hard delete the asset record
          const { error: dbError } = await supabase
            .from('media_assets')
            .delete()
            .eq('id', asset.id);

          if (dbError) {
            throw dbError;
          }

          // Hard delete associated links
          await supabase
            .from('media_links')
            .delete()
            .eq('asset_id', asset.id);

          results.deleted++;
          console.log(`[GC] Deleted asset ${asset.id}`);
        } catch (err: unknown) {
          results.failed++;
          const errorMessage = err instanceof Error ? err.message : String(err);
          results.errors.push(`Asset ${asset.id}: ${errorMessage}`);
          console.error(`[GC] Failed to delete asset ${asset.id}:`, err);
        }
      }
    }

    // Also clean up empty folders (soft-deleted, no children)
    const { data: emptyFolders } = await supabase
      .from('media_folders')
      .select('id, name, path')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate.toISOString())
      .eq('is_system', false);

    let foldersDeleted = 0;

    if (!dryRun && emptyFolders) {
      for (const folder of emptyFolders) {
        // Check for children
        const { count: childCount } = await supabase
          .from('media_folders')
          .select('id', { count: 'exact', head: true })
          .eq('parent_id', folder.id)
          .is('deleted_at', null);

        const { count: linkCount } = await supabase
          .from('media_links')
          .select('id', { count: 'exact', head: true })
          .eq('folder_id', folder.id)
          .is('deleted_at', null);

        if (childCount === 0 && linkCount === 0) {
          const { error } = await supabase
            .from('media_folders')
            .delete()
            .eq('id', folder.id);

          if (!error) {
            foldersDeleted++;
            console.log(`[GC] Deleted empty folder ${folder.id}`);
          }
        }
      }
    }

    const response = {
      success: true,
      dry_run: dryRun,
      assets: results,
      folders_deleted: foldersDeleted,
      message: dryRun 
        ? `Dry run: ${results.total_found} assets and ${emptyFolders?.length || 0} folders would be deleted`
        : `Deleted ${results.deleted} assets and ${foldersDeleted} folders`,
    };

    console.log('[GC] Completed:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[GC] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
