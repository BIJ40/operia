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
      console.error("[trigger-monthly-reports] Unauthorized: Invalid or missing CRON_SECRET");
      return jsonResponse(401, { error: "UNAUTHORIZED", message: "Invalid or missing CRON_SECRET" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional agency_id override
    let requestBody: { agency_id?: string } = {};
    try {
      if (req.method === "POST") {
        const text = await req.text();
        if (text) {
          requestBody = JSON.parse(text);
        }
      }
    } catch {
      // Ignore JSON parse errors, use defaults
    }

    // Calculate previous month
    const now = new Date();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    console.log(`[trigger-monthly-reports] Generating reports for ${month}/${year}...`);

    let eligible: Array<{ agency_id: string; agency: { id: string; slug: string; label: string; is_active: boolean } }> = [];

    // If specific agency_id provided, generate for that agency only
    if (requestBody.agency_id) {
      console.log(`[trigger-monthly-reports] Specific agency requested: ${requestBody.agency_id}`);
      
      const { data: agency, error: agencyErr } = await supabaseAdmin
        .from("apogee_agencies")
        .select("id, slug, label, is_active")
        .eq("id", requestBody.agency_id)
        .single();

      if (agencyErr || !agency) {
        console.error("[trigger-monthly-reports] Agency not found:", agencyErr);
        return jsonResponse(404, { error: "AGENCY_NOT_FOUND", detail: "Agency not found" });
      }

      if (!agency.is_active) {
        return jsonResponse(400, { error: "AGENCY_INACTIVE", detail: "Agency is not active" });
      }

      eligible = [{ agency_id: agency.id, agency }];
    } else {
      // Get all agencies with report_settings configured (presence = enabled)
      const { data: enabledSettings, error: settingsErr } = await supabaseAdmin
        .from("report_settings")
        .select("agency_id, agency:apogee_agencies!inner(id, slug, label, is_active)");

      if (settingsErr) {
        console.error("[trigger-monthly-reports] Failed to fetch settings:", settingsErr);
        return jsonResponse(500, { error: "SETTINGS_FETCH_FAILED", detail: settingsErr.message });
      }

      // Filter to active agencies
      eligible = (enabledSettings ?? []).filter(
        (s) => s.agency && (s.agency as any).is_active === true
      ) as any;
    }

    console.log(`[trigger-monthly-reports] Found ${eligible.length} eligible agencies`);

    if (eligible.length === 0) {
      return jsonResponse(200, {
        ok: true,
        total: 0,
        generated: 0,
        failed: 0,
        month,
        year,
        message: "No agencies have report generation enabled",
      });
    }

    let generated = 0;
    let failed = 0;
    const errors: Array<{ agency: string; error: string }> = [];

    for (const setting of eligible) {
      const agency = setting.agency as any;
      const agencySlug = agency.slug;

      try {
        console.log(`[trigger-monthly-reports] Generating for ${agency.label}...`);

        const response = await fetch(`${supabaseUrl}/functions/v1/generate-monthly-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CRON-SECRET": cronSecret,
          },
          body: JSON.stringify({
            agencySlug,
            month,
            year,
            preview: false,
          }),
        });

        if (response.ok) {
          generated++;
          console.log(`[trigger-monthly-reports] ✓ ${agency.label} - Success`);
        } else {
          const errorBody = await response.text();
          failed++;
          errors.push({ agency: agency.label, error: errorBody.substring(0, 200) });
          console.error(`[trigger-monthly-reports] ✗ ${agency.label} - ${response.status}: ${errorBody.substring(0, 100)}`);
        }
      } catch (err) {
        failed++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push({ agency: agency.label, error: errorMsg });
        console.error(`[trigger-monthly-reports] ✗ ${agency.label} - Exception: ${errorMsg}`);
      }

      // Small delay between requests to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`[trigger-monthly-reports] Complete. Generated: ${generated}, Failed: ${failed}`);

    return jsonResponse(200, {
      ok: true,
      total: eligible.length,
      generated,
      failed,
      month,
      year,
      errors: errors.length > 0 ? errors : undefined,
      message: `Generated ${generated}/${eligible.length} reports for ${month}/${year}`,
    });

  } catch (err) {
    console.error("[trigger-monthly-reports] Unexpected error:", err);
    return jsonResponse(500, {
      error: "INTERNAL_ERROR",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
