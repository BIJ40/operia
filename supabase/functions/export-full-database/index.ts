/**
 * Edge Function: export-full-database
 * Export de la base de données par batch pour éviter les limites mémoire
 * Usage: backup, migration, livraison client
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

const ALL_TABLES = [
  // Batch 0 - Core users
  "profiles", "apogee_agencies",
  // Batch 1 - Agency config
  "agency_commercial_profile", "agency_stamps",
  // Batch 2 - Agency roles
  "agency_rh_roles", "user_modules",
  // Batch 3 - Collaborators
  "collaborators", "collaborator_documents",
  // Batch 4 - Collaborator details
  "collaborator_sensitive_data", "collaborator_document_folders",
  // Batch 5 - HR contracts
  "employment_contracts", "leave_requests",
  // Batch 6 - Requests & logs
  "document_requests", "document_access_logs",
  // Batch 7 - Support
  "support_tickets", "support_ticket_actions",
  // Batch 8 - Apogee Tickets core (heavy)
  "apogee_tickets",
  // Batch 9 - Apogee Tickets comments
  "apogee_ticket_comments", "apogee_ticket_attachments",
  // Batch 10 - Apogee Tickets history
  "apogee_ticket_history", "apogee_ticket_views",
  // Batch 11 - Apogee Tickets config
  "apogee_ticket_statuses", "apogee_ticket_transitions",
  // Batch 12 - Apogee Tickets roles & permissions
  "apogee_ticket_user_roles", "apogee_ticket_field_permissions",
  // Batch 13 - Apogee Tickets tags
  "apogee_ticket_tags", "apogee_impact_tags",
  // Batch 14 - Apogee reference tables
  "apogee_modules", "apogee_priorities",
  // Batch 15 - Apogee reference tables 2
  "apogee_owner_sides", "apogee_reported_by",
  // Batch 16 - Apogee guides
  "apogee_guides",
  // Batch 17 - Blocks (heavy)
  "blocks",
  // Batch 18 - Apporteur blocks (heavy)
  "apporteur_blocks",
  // Batch 19 - Content
  "categories", "documents",
  // Batch 20 - Content 2
  "favorites",
  // Batch 21 - FAQ
  "faq_categories", "faq_items",
  // Batch 22 - Chatbot (heavy)
  "chatbot_queries",
  // Batch 23 - AI & cache
  "ai_search_cache",
  // Batch 24 - Royalty config
  "agency_royalty_config", "agency_royalty_tiers",
  // Batch 25 - Royalty calculations
  "agency_royalty_calculations",
  // Batch 26 - Messaging
  "conversations", "conversation_members",
  // Batch 27 - Messages
  "messages",
  // Batch 28 - Announcements
  "priority_announcements", "announcement_reads",
  // Batch 29 - Visits & expenses
  "animator_visits", "expense_requests",
  // Batch 30 - Fleet
  "fleet_vehicles",
  // Batch 31 - Settings
  "app_notification_settings", "diffusion_settings",
  // Batch 32 - Feature flags
  "feature_flags",
];

const BATCH_SIZE = 2;

serve(async (req) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ));
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    const adminRoles = ["platform_admin", "superadmin"];
    if (!profile || !adminRoles.includes(profile.global_role)) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Accès réservé aux administrateurs (N5+)" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ));
    }

    // Parse request to get batch number
    const url = new URL(req.url);
    const batchParam = url.searchParams.get("batch");
    
    // If no batch specified, return metadata about available batches
    if (!batchParam) {
      const totalBatches = Math.ceil(ALL_TABLES.length / BATCH_SIZE);
      return withCors(req, new Response(
        JSON.stringify({
          total_tables: ALL_TABLES.length,
          batch_size: BATCH_SIZE,
          total_batches: totalBatches,
          tables: ALL_TABLES,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    const batchNum = parseInt(batchParam, 10);
    const startIdx = batchNum * BATCH_SIZE;
    const tablesToExport = ALL_TABLES.slice(startIdx, startIdx + BATCH_SIZE);

    if (tablesToExport.length === 0) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Batch invalide" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ));
    }

    console.log(`[export-full-database] Batch ${batchNum}: exporting ${tablesToExport.join(", ")}`);

    const exportData: Record<string, unknown[]> = {};
    
    // Heavy tables with large content fields need smaller limits
    const HEAVY_TABLES = ["blocks", "apporteur_blocks", "apogee_tickets", "chatbot_queries", "faq_items"];

    for (const tableName of tablesToExport) {
      try {
        const isHeavy = HEAVY_TABLES.includes(tableName);
        const tableLimit = isHeavy ? 50 : 200;
        
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select("*")
          .limit(tableLimit);

        if (error) {
          console.warn(`[export-full-database] Error ${tableName}:`, error.message);
          exportData[tableName] = [{ _error: error.message }];
        } else {
          exportData[tableName] = data ?? [];
          console.log(`[export-full-database] ${tableName}: ${data?.length ?? 0} rows (limit: ${tableLimit})`);
        }
      } catch (tableError) {
        exportData[tableName] = [{ _error: "Table not found" }];
      }
    }

    return withCors(req, new Response(JSON.stringify({
      batch: batchNum,
      tables: tablesToExport,
      data: exportData,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[export-full-database] Error:", errorMessage);
    return withCors(req, new Response(
      JSON.stringify({ error: "Erreur lors de l'export", details: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    ));
  }
});