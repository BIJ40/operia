import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify CRON secret
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("X-CRON-SECRET");

    if (!cronSecret || !providedSecret || providedSecret !== cronSecret) {
      console.error("[epi-generate-monthly-acks] Unauthorized: Invalid or missing CRON_SECRET");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    console.log("[epi-generate-monthly-acks] Starting monthly EPI acknowledgement generation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current month (1st of the month)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    console.log(`[epi-generate-monthly-acks] Generating for month: ${currentMonth}`);

    // Get all active agencies
    const { data: agencies, error: agenciesError } = await supabase
      .from("apogee_agencies")
      .select("id, label")
      .eq("is_active", true);

    if (agenciesError) {
      console.error("[epi-generate-monthly-acks] Error fetching agencies:", agenciesError);
      throw agenciesError;
    }

    console.log(`[epi-generate-monthly-acks] Found ${agencies?.length || 0} active agencies`);

    const results = {
      agencies_processed: 0,
      acks_created: 0,
      acks_skipped: 0,
      errors: [] as string[],
    };

    for (const agency of agencies || []) {
      try {
        console.log(`[epi-generate-monthly-acks] Processing agency: ${agency.label} (${agency.id})`);

        // Get active collaborators for this agency (type TECHNICIEN or all with EPI assignments)
        const { data: collaborators, error: collabError } = await supabase
          .from("collaborators")
          .select("id, first_name, last_name, type")
          .eq("agency_id", agency.id)
          .is("leaving_date", null);

        if (collabError) {
          console.error(`[epi-generate-monthly-acks] Error fetching collaborators for ${agency.label}:`, collabError);
          results.errors.push(`Agency ${agency.label}: ${collabError.message}`);
          continue;
        }

        console.log(`[epi-generate-monthly-acks] Found ${collaborators?.length || 0} active collaborators`);

        for (const collab of collaborators || []) {
          try {
            // Check if ack already exists for this month
            const { data: existingAck } = await supabase
              .from("epi_monthly_acknowledgements")
              .select("id")
              .eq("user_id", collab.id)
              .eq("month", currentMonth)
              .maybeSingle();

            if (existingAck) {
              console.log(`[epi-generate-monthly-acks] Ack already exists for ${collab.first_name} ${collab.last_name}`);
              results.acks_skipped++;
              continue;
            }

            // Get active EPI assignments for this collaborator
            const { data: assignments, error: assError } = await supabase
              .from("epi_assignments")
              .select("id, catalog_item_id, size")
              .eq("user_id", collab.id)
              .eq("status", "active");

            if (assError) {
              console.error(`[epi-generate-monthly-acks] Error fetching assignments for ${collab.id}:`, assError);
              continue;
            }

            // Skip if no EPI assigned
            if (!assignments || assignments.length === 0) {
              console.log(`[epi-generate-monthly-acks] No EPI assignments for ${collab.first_name} ${collab.last_name}, skipping`);
              continue;
            }

            console.log(`[epi-generate-monthly-acks] Creating ack for ${collab.first_name} ${collab.last_name} with ${assignments.length} items`);

            // Create the acknowledgement
            const { data: newAck, error: ackError } = await supabase
              .from("epi_monthly_acknowledgements")
              .insert({
                agency_id: agency.id,
                user_id: collab.id,
                month: currentMonth,
                status: "pending",
                generated_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (ackError) {
              console.error(`[epi-generate-monthly-acks] Error creating ack for ${collab.id}:`, ackError);
              results.errors.push(`Collab ${collab.id}: ${ackError.message}`);
              continue;
            }

            // Create ack items for each assignment
            const items = assignments.map((a) => ({
              ack_id: newAck.id,
              assignment_id: a.id,
              catalog_item_id: a.catalog_item_id,
              size: a.size,
              is_confirmed_present: false,
            }));

            const { error: itemsError } = await supabase
              .from("epi_monthly_ack_items")
              .insert(items);

            if (itemsError) {
              console.error(`[epi-generate-monthly-acks] Error creating ack items for ${collab.id}:`, itemsError);
              // Delete the ack if items failed
              await supabase.from("epi_monthly_acknowledgements").delete().eq("id", newAck.id);
              results.errors.push(`Collab ${collab.id} items: ${itemsError.message}`);
              continue;
            }

            results.acks_created++;
            console.log(`[epi-generate-monthly-acks] Successfully created ack for ${collab.first_name} ${collab.last_name}`);
          } catch (e: any) {
            console.error(`[epi-generate-monthly-acks] Error processing collaborator ${collab.id}:`, e);
            results.errors.push(`Collab ${collab.id}: ${e.message}`);
          }
        }

        results.agencies_processed++;
      } catch (e: any) {
        console.error(`[epi-generate-monthly-acks] Error processing agency ${agency.id}:`, e);
        results.errors.push(`Agency ${agency.id}: ${e.message}`);
      }
    }

    // Mark overdue acknowledgements from previous month
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthStr = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}-01`;
    
    const { data: overdueUpdate, error: overdueError } = await supabase
      .from("epi_monthly_acknowledgements")
      .update({ status: "overdue" })
      .eq("month", previousMonthStr)
      .eq("status", "pending")
      .select("id");

    if (overdueError) {
      console.error("[epi-generate-monthly-acks] Error marking overdue:", overdueError);
    } else {
      console.log(`[epi-generate-monthly-acks] Marked ${overdueUpdate?.length || 0} acknowledgements as overdue`);
    }

    console.log("[epi-generate-monthly-acks] Completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        month: currentMonth,
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[epi-generate-monthly-acks] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
