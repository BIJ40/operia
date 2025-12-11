/**
 * Edge Function: export-full-database
 * Export de la base de données par batch pour éviter les limites mémoire
 * Usage: backup, migration, livraison client
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

// Tables avec embeddings - EXCLUES car régénérables via RAG indexing
const EXCLUDED_EMBEDDING_TABLES = [
  "guide_chunks",        // embeddings volumineux - régénérable
  "ticket_embeddings",   // embeddings volumineux - régénérable  
  "knowledge_base",      // embeddings volumineux - régénérable
];

// 104 tables (107 - 3 embedding tables) organisées en batches de 2
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
  // Batch 7 - HR generated & payslips
  "hr_generated_documents", "payslip_data",
  // Batch 8 - Salary & audit
  "salary_history", "rh_audit_log",
  // Batch 9 - RH notifications & sensitive logs
  "rh_notifications", "sensitive_data_access_log",
  // Batch 10 - Support tickets core
  "support_tickets", "support_ticket_actions",
  // Batch 11 - Support tickets views & attachments
  "support_ticket_views", "support_attachments",
  // Batch 12 - Support messages (heavy)
  "support_messages", "support_presence",
  // Batch 13 - Live support
  "live_support_sessions", "live_support_messages",
  // Batch 14 - Typing & presence
  "typing_status", "user_presence",
  // Batch 15 - Apogee Tickets core (heavy)
  "apogee_tickets", "apogee_ticket_comments",
  // Batch 16 - Apogee Tickets attachments & history
  "apogee_ticket_attachments", "apogee_ticket_history",
  // Batch 17 - Apogee Tickets views & statuses
  "apogee_ticket_views", "apogee_ticket_statuses",
  // Batch 18 - Apogee Tickets transitions & roles
  "apogee_ticket_transitions", "apogee_ticket_user_roles",
  // Batch 19 - Apogee Tickets permissions & tags
  "apogee_ticket_field_permissions", "apogee_ticket_tags",
  // Batch 20 - Apogee impact tags & modules
  "apogee_impact_tags", "apogee_modules",
  // Batch 21 - Apogee priorities & owner_sides
  "apogee_priorities", "apogee_owner_sides",
  // Batch 22 - Apogee reported_by & guides
  "apogee_reported_by", "apogee_guides",
  // Batch 23 - Ticket duplicates & blocks
  "ticket_duplicate_suggestions", "blocks",
  // Batch 24 - Blocks apporteur
  "apporteur_blocks", "categories",
  // Batch 25 - Content documents
  "documents", "sections",
  // Batch 26 - Favorites & FAQ categories
  "favorites", "faq_categories",
  // Batch 27 - FAQ items (heavy)
  "faq_items", "chatbot_queries",
  // Batch 28 - AI cache
  "ai_search_cache", "rag_index_documents",
  // Batch 29 - RAG jobs
  "rag_index_jobs", "agency_royalty_config",
  // Batch 30 - Royalty tiers
  "agency_royalty_tiers", "agency_royalty_calculations",
  // Batch 31 - SAV overrides
  "sav_dossier_overrides", "conversations",
  // Batch 32 - Conversation members
  "conversation_members", "messages",
  // Batch 33 - Announcements
  "priority_announcements", "announcement_reads",
  // Batch 34 - Visits
  "animator_visits", "expense_requests",
  // Batch 35 - Fleet
  "fleet_vehicles", "french_holidays",
  // Batch 36 - Maintenance
  "maintenance_events", "maintenance_alerts",
  // Batch 37 - Maintenance plans
  "maintenance_plan_items", "maintenance_plan_templates",
  // Batch 38 - Metrics
  "metrics_definitions", "metrics_cache",
  // Batch 39 - StatIA
  "statia_custom_metrics", "statia_metric_validations",
  // Batch 40 - StatIA widgets
  "statia_widgets", "widget_templates",
  // Batch 41 - User widgets
  "user_widgets", "user_widget_preferences",
  // Batch 42 - User dashboard
  "user_dashboard_settings", "user_quick_notes",
  // Batch 43 - User actions
  "user_actions_config", "user_history",
  // Batch 44 - User connections
  "user_connection_logs", "user_calendar_connections",
  // Batch 45 - User creation
  "user_creation_requests", "user_consents",
  // Batch 46 - App settings
  "app_notification_settings", "diffusion_settings",
  // Batch 47 - Feature flags
  "feature_flags", "storage_quota_alerts",
  // Batch 48 - Rate limits
  "rate_limits", "page_metadata",
  // Batch 49 - Franchiseur
  "franchiseur_agency_assignments", "franchiseur_roles",
  // Batch 50 - Formation
  "formation_content", "tools",
  // Batch 51 - Home
  "home_cards", "planning_signatures",
];

const BATCH_SIZE = 2;

// Limites par table pour éviter les dépassements mémoire
const TABLE_LIMITS: Record<string, number> = {
  // Tables très lourdes - limite stricte
  "chatbot_queries": 30,
  "faq_items": 30,
  "support_messages": 30,
  "live_support_messages": 30,
  "messages": 30,
  "metrics_cache": 30,
  "blocks": 50,
  "apporteur_blocks": 50,
  "apogee_tickets": 100,
  "apogee_ticket_history": 100,
  "user_connection_logs": 100,
  "rag_index_documents": 30,
};

const DEFAULT_LIMIT = 200;

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

    for (const tableName of tablesToExport) {
      try {
        const tableLimit = TABLE_LIMITS[tableName] ?? DEFAULT_LIMIT;
        
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
