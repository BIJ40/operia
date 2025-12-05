import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ));
    }

    const { 
      ticket_id_main, 
      ticket_id_duplicate, 
      merge_options = { merge_comments: true, merge_attachments: true, merge_tags: true } 
    } = await req.json();
    
    if (!ticket_id_main || !ticket_id_duplicate) {
      return withCors(req, new Response(
        JSON.stringify({ error: "ticket_id_main and ticket_id_duplicate are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user's auth for RLS
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Admin client for service operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    
    if (userError || !user) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Verify both tickets exist
    const { data: mainTicket, error: mainError } = await supabaseAdmin
      .from("apogee_tickets")
      .select("id, ticket_number, element_concerne, impact_tags")
      .eq("id", ticket_id_main)
      .single();

    const { data: duplicateTicket, error: dupError } = await supabaseAdmin
      .from("apogee_tickets")
      .select("id, ticket_number, element_concerne, impact_tags")
      .eq("id", ticket_id_duplicate)
      .single();

    if (mainError || !mainTicket || dupError || !duplicateTicket) {
      return withCors(req, new Response(
        JSON.stringify({ error: "One or both tickets not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Check if duplicate is already merged
    const { data: dupCheck } = await supabaseAdmin
      .from("apogee_tickets")
      .select("merged_into_ticket_id")
      .eq("id", ticket_id_duplicate)
      .single();

    if (dupCheck?.merged_into_ticket_id) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Ticket already merged" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Merge comments if requested
    if (merge_options.merge_comments) {
      const { data: comments } = await supabaseAdmin
        .from("apogee_ticket_comments")
        .select("*")
        .eq("ticket_id", ticket_id_duplicate);

      for (const comment of comments || []) {
        await supabaseAdmin.from("apogee_ticket_comments").insert({
          ticket_id: ticket_id_main,
          author_type: comment.author_type,
          author_name: comment.author_name,
          body: `[Fusionné depuis APO-${duplicateTicket.ticket_number}] ${comment.body}`,
          is_internal: comment.is_internal,
          created_by_user_id: comment.created_by_user_id,
        });
      }
    }

    // Merge attachments if requested
    if (merge_options.merge_attachments) {
      await supabaseAdmin
        .from("apogee_ticket_attachments")
        .update({ ticket_id: ticket_id_main })
        .eq("ticket_id", ticket_id_duplicate);
    }

    // Merge tags if requested
    if (merge_options.merge_tags) {
      const mainTags = mainTicket.impact_tags || [];
      const dupTags = duplicateTicket.impact_tags || [];
      const mergedTags = [...new Set([...mainTags, ...dupTags])];

      await supabaseAdmin
        .from("apogee_tickets")
        .update({ impact_tags: mergedTags })
        .eq("id", ticket_id_main);
    }

    // Update duplicate ticket
    await supabaseAdmin
      .from("apogee_tickets")
      .update({
        merged_into_ticket_id: ticket_id_main,
        kanban_status: "ARCHIVE",
      })
      .eq("id", ticket_id_duplicate);

    // Update suggestion status
    await supabaseAdmin
      .from("ticket_duplicate_suggestions")
      .update({
        status: "accepted",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .or(`and(ticket_id_source.eq.${ticket_id_main},ticket_id_candidate.eq.${ticket_id_duplicate}),and(ticket_id_source.eq.${ticket_id_duplicate},ticket_id_candidate.eq.${ticket_id_main})`);

    // Add history entry
    await supabaseAdmin.from("apogee_ticket_history").insert({
      ticket_id: ticket_id_main,
      user_id: user.id,
      action_type: "merge",
      new_value: `Fusionné avec APO-${duplicateTicket.ticket_number}`,
      metadata: {
        merged_from: ticket_id_duplicate,
        merged_from_number: duplicateTicket.ticket_number,
        merged_into: ticket_id_main,
        merged_into_number: mainTicket.ticket_number,
        merge_options,
      },
    });

    // Also add history to duplicate
    await supabaseAdmin.from("apogee_ticket_history").insert({
      ticket_id: ticket_id_duplicate,
      user_id: user.id,
      action_type: "merged_into",
      new_value: `Fusionné dans APO-${mainTicket.ticket_number}`,
      metadata: {
        merged_into: ticket_id_main,
        merged_into_number: mainTicket.ticket_number,
      },
    });

    console.log(`Tickets merged: ${duplicateTicket.ticket_number} -> ${mainTicket.ticket_number}`);
    
    return withCors(req, new Response(
      JSON.stringify({ 
        success: true, 
        main_ticket_id: ticket_id_main,
        duplicate_ticket_id: ticket_id_duplicate,
        message: `Ticket APO-${duplicateTicket.ticket_number} fusionné dans APO-${mainTicket.ticket_number}`
      }),
      { headers: { "Content-Type": "application/json" } }
    ));

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return withCors(req, new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});
