/**
 * Edge Function: export-full-database
 * Export de la base de données par batch pour éviter les limites mémoire
 * Usage: backup, migration, livraison client
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

// 107 tables - Liste complète organisée en batches de 2
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
  // Batch 23 - Ticket embeddings & duplicates (heavy)
  "ticket_embeddings", "ticket_duplicate_suggestions",
  // Batch 24 - Blocks (heavy)
  "blocks", "apporteur_blocks",
  // Batch 25 - Content categories & documents
  "categories", "documents",
  // Batch 26 - Content sections & favorites
  "sections", "favorites",
  // Batch 27 - FAQ
  "faq_categories", "faq_items",
  // Batch 28 - Chatbot (heavy)
  "chatbot_queries", "ai_search_cache",
  // Batch 29 - Guide chunks & knowledge base (heavy - embeddings)
  "guide_chunks", "knowledge_base",
  // Batch 30 - RAG index
  "rag_index_documents", "rag_index_jobs",
  // Batch 31 - Royalty config
  "agency_royalty_config", "agency_royalty_tiers",
  // Batch 32 - Royalty calculations
  "agency_royalty_calculations", "sav_dossier_overrides",
  // Batch 33 - Messaging conversations
  "conversations", "conversation_members",
  // Batch 34 - Messages (heavy)
  "messages",
  // Batch 35 - Announcements
  "priority_announcements", "announcement_reads",
  // Batch 36 - Visits & expenses
  "animator_visits", "expense_requests",
  // Batch 37 - Fleet
  "fleet_vehicles", "french_holidays",
  // Batch 38 - Maintenance core
  "maintenance_events", "maintenance_alerts",
  // Batch 39 - Maintenance plans
  "maintenance_plan_items", "maintenance_plan_templates",
  // Batch 40 - StatIA metrics
  "metrics_definitions", "metrics_cache",
  // Batch 41 - StatIA custom & validations
  "statia_custom_metrics", "statia_metric_validations",
  // Batch 42 - StatIA widgets
  "statia_widgets", "widget_templates",
  // Batch 43 - User widgets
  "user_widgets", "user_widget_preferences",
  // Batch 44 - User dashboard
  "user_dashboard_settings", "user_quick_notes",
  // Batch 45 - User actions & history
  "user_actions_config", "user_history",
  // Batch 46 - User connections
  "user_connection_logs", "user_calendar_connections",
  // Batch 47 - User creation & consents
  "user_creation_requests", "user_consents",
  // Batch 48 - App settings
  "app_notification_settings", "diffusion_settings",
  // Batch 49 - Feature flags & storage
  "feature_flags", "storage_quota_alerts",
  // Batch 50 - Rate limits & page metadata
  "rate_limits", "page_metadata",
  // Batch 51 - Franchiseur
  "franchiseur_agency_assignments", "franchiseur_roles",
  // Batch 52 - Formation & tools
  "formation_content", "tools",
  // Batch 53 - Home cards
  "home_cards", "planning_signatures",
];

const BATCH_SIZE = 2;

// Tables avec beaucoup de données ou champs volumineux (embeddings, content)
const HEAVY_TABLES = [
  "blocks", 
  "apporteur_blocks", 
  "apogee_tickets", 
  "chatbot_queries", 
  "faq_items",
  "guide_chunks",        // embeddings
  "knowledge_base",      // embeddings
  "ticket_embeddings",   // embeddings
  "support_messages",    // messages volumineux
  "live_support_messages",
  "messages",            // messages potentiellement nombreux
  "metrics_cache",       // cache potentiellement volumineux
];

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
