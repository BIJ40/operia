import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify CRON secret
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("X-CRON-SECRET");

    if (!cronSecret || !providedSecret || providedSecret !== cronSecret) {
      console.error("[purge-old-reports] Unauthorized: Invalid or missing CRON_SECRET");
      return jsonResponse(401, { error: "UNAUTHORIZED", message: "Invalid or missing CRON_SECRET" });
    }

    console.log("[purge-old-reports] Starting purge of reports older than 12 months...");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate cutoff date (12 months ago)
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    const cutoffStr = cutoff.toISOString();

    console.log(`[purge-old-reports] Cutoff date: ${cutoffStr}`);

    // 1. Fetch old reports
    const { data: oldReports, error: selectErr } = await supabaseAdmin
      .from("monthly_reports")
      .select("id, file_path, agency_id, year, month")
      .lt("created_at", cutoffStr);

    if (selectErr) {
      console.error("[purge-old-reports] DB select failed:", selectErr);
      return jsonResponse(500, { error: "DB_SELECT_FAILED", detail: selectErr.message });
    }

    if (!oldReports || oldReports.length === 0) {
      console.log("[purge-old-reports] No old reports to purge");
      return jsonResponse(200, { 
        ok: true, 
        deletedFiles: 0, 
        deletedRows: 0, 
        cutoff: cutoffStr,
        message: "No reports to purge" 
      });
    }

    console.log(`[purge-old-reports] Found ${oldReports.length} reports to purge`);

    // 2. Delete storage files
    const paths = oldReports
      .map((r) => r.file_path)
      .filter((p): p is string => Boolean(p));

    let filesDeleted = 0;
    if (paths.length > 0) {
      const { error: rmErr, data: rmData } = await supabaseAdmin.storage
        .from("monthly-reports")
        .remove(paths);

      if (rmErr) {
        console.error("[purge-old-reports] Storage remove failed:", rmErr);
        // Continue anyway - files may not exist
      } else {
        filesDeleted = rmData?.length ?? paths.length;
        console.log(`[purge-old-reports] Deleted ${filesDeleted} files from storage`);
      }
    }

    // 3. Also delete preview files for these agencies
    const previewPaths = oldReports.map((r) => `previews/${r.agency_id}/`);
    // Note: We can't easily list/delete preview folders, they'll expire naturally or be cleaned separately

    // 4. Delete DB rows
    const ids = oldReports.map((r) => r.id);
    const { error: delErr, count } = await supabaseAdmin
      .from("monthly_reports")
      .delete({ count: "exact" })
      .in("id", ids);

    if (delErr) {
      console.error("[purge-old-reports] DB delete failed:", delErr);
      return jsonResponse(500, { error: "DB_DELETE_FAILED", detail: delErr.message });
    }

    console.log(`[purge-old-reports] Purge complete. Files: ${filesDeleted}, Rows: ${count}`);

    return jsonResponse(200, {
      ok: true,
      deletedFiles: filesDeleted,
      deletedRows: count ?? oldReports.length,
      cutoff: cutoffStr,
      message: `Purge completed: ${count} reports deleted`,
    });

  } catch (err) {
    console.error("[purge-old-reports] Unexpected error:", err);
    return jsonResponse(500, { 
      error: "INTERNAL_ERROR", 
      detail: err instanceof Error ? err.message : String(err) 
    });
  }
});
