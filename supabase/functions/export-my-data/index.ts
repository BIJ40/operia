/**
 * Edge Function: export-my-data
 * RGPD Article 20 - Droit à la portabilité des données
 * Permet aux utilisateurs d'exporter toutes leurs données personnelles en JSON
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

interface ExportedData {
  export_date: string;
  user_id: string;
  profile: Record<string, unknown> | null;
  collaborator: Record<string, unknown> | null;
  documents: Record<string, unknown>[];
  document_requests: Record<string, unknown>[];
  leave_requests: Record<string, unknown>[];
  support_tickets: Record<string, unknown>[];
  connection_logs: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  messages_sent: Record<string, unknown>[];
  favorites: Record<string, unknown>[];
  announcement_reads: Record<string, unknown>[];
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    // Initialize Supabase client with user's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ));
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[export-my-data] Auth error:", authError);
      return withCors(req, new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ));
    }

    const userId = user.id;
    console.log(`[export-my-data] Exporting data for user: ${userId}`);

    // Use service role for reading all user data
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all user data in parallel
    const [
      profileResult,
      collaboratorResult,
      documentsResult,
      documentRequestsResult,
      leaveRequestsResult,
      supportTicketsResult,
      connectionLogsResult,
      conversationsResult,
      messagesSentResult,
      favoritesResult,
      announcementReadsResult,
    ] = await Promise.all([
      // Profile data
      supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, email, phone, agence, role_agence, global_role, created_at, updated_at")
        .eq("id", userId)
        .single(),
      
      // Collaborator data (if linked)
      supabaseAdmin
        .from("collaborators")
        .select("id, first_name, last_name, email, phone, role, type, hiring_date, leaving_date, address, city, postal_code, birth_date, birth_place, notes, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
      
      // Documents uploaded or related to user
      supabaseAdmin
        .from("collaborator_documents")
        .select("id, title, doc_type, file_name, visibility, period_month, period_year, created_at")
        .eq("uploaded_by", userId),
      
      // Document requests made by user (via collaborator)
      supabaseAdmin
        .from("document_requests")
        .select("id, request_type, description, status, requested_at, processed_at, response_note")
        .eq("collaborator_id", (await supabaseAdmin.from("collaborators").select("id").eq("user_id", userId).maybeSingle()).data?.id ?? "00000000-0000-0000-0000-000000000000"),
      
      // Leave requests
      supabaseAdmin
        .from("leave_requests")
        .select("id, type, event_subtype, start_date, end_date, days_count, status, reason, created_at")
        .eq("collaborator_id", (await supabaseAdmin.from("collaborators").select("id").eq("user_id", userId).maybeSingle()).data?.id ?? "00000000-0000-0000-0000-000000000000"),
      
      // Support tickets created by user
      supabaseAdmin
        .from("support_tickets")
        .select("id, ticket_number, subject, description, type, status, heat_priority, created_at, resolved_at")
        .eq("user_id", userId),
      
      // Connection logs
      supabaseAdmin
        .from("user_connection_logs")
        .select("id, connected_at, ip_address, user_agent")
        .eq("user_id", userId)
        .order("connected_at", { ascending: false })
        .limit(100),
      
      // Conversations user is member of
      supabaseAdmin
        .from("conversation_members")
        .select("conversation_id, joined_at, role, conversations(id, name, type, created_at)")
        .eq("user_id", userId),
      
      // Messages sent by user
      supabaseAdmin
        .from("messages")
        .select("id, content, created_at, conversation_id")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(500),
      
      // Favorites
      supabaseAdmin
        .from("favorites")
        .select("id, block_title, category_slug, scope, created_at")
        .eq("user_id", userId),
      
      // Announcement reads
      supabaseAdmin
        .from("announcement_reads")
        .select("id, announcement_id, status, read_at")
        .eq("user_id", userId),
    ]);

    // Build export object
    const exportData: ExportedData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      profile: profileResult.data ? sanitizeForExport(profileResult.data) : null,
      collaborator: collaboratorResult.data ? sanitizeForExport(collaboratorResult.data) : null,
      documents: (documentsResult.data ?? []).map(sanitizeForExport),
      document_requests: (documentRequestsResult.data ?? []).map(sanitizeForExport),
      leave_requests: (leaveRequestsResult.data ?? []).map(sanitizeForExport),
      support_tickets: (supportTicketsResult.data ?? []).map(sanitizeForExport),
      connection_logs: (connectionLogsResult.data ?? []).map(sanitizeForExport),
      conversations: (conversationsResult.data ?? []).map(sanitizeForExport),
      messages_sent: (messagesSentResult.data ?? []).map(sanitizeForExport),
      favorites: (favoritesResult.data ?? []).map(sanitizeForExport),
      announcement_reads: (announcementReadsResult.data ?? []).map(sanitizeForExport),
    };

    // Log export for audit
    console.log(`[export-my-data] Export completed for user ${userId}. Profile: ${!!exportData.profile}, Collaborator: ${!!exportData.collaborator}, Documents: ${exportData.documents.length}, Tickets: ${exportData.support_tickets.length}`);

    // Return as downloadable JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    
    return withCors(req, new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mes-donnees-${new Date().toISOString().split('T')[0]}.json"`,
      },
    }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[export-my-data] Error:", errorMessage);
    return withCors(req, new Response(
      JSON.stringify({ error: "Erreur lors de l'export des données", details: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});

/**
 * Remove any sensitive internal fields from export
 */
function sanitizeForExport(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...obj };
  // Remove internal/technical fields that shouldn't be exported
  delete sanitized.search_vector;
  return sanitized;
}
