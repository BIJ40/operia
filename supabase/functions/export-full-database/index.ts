/**
 * Edge Function: export-full-database
 * Export de la base de données en 3 parties pour éviter les limites mémoire
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

// 104 tables divisées en 3 parties (~35 tables chacune)
const TABLES_PART_1 = [
  // Core users & agencies
  "profiles", "apogee_agencies", "agency_commercial_profile", "agency_stamps",
  "agency_rh_roles", "user_modules",
  // Collaborators & HR
  "collaborators", "collaborator_documents", "collaborator_sensitive_data", 
  "collaborator_document_folders", "employment_contracts", "leave_requests",
  "document_requests", "document_access_logs", "hr_generated_documents", 
  "payslip_data", "salary_history", "rh_audit_log", "rh_notifications", 
  "sensitive_data_access_log",
  // Support tickets
  "support_tickets", "support_ticket_actions", "support_ticket_views", 
  "support_attachments", "support_messages", "support_presence",
  // Live support
  "live_support_sessions", "live_support_messages", "typing_status", "user_presence",
  // Royalty
  "agency_royalty_config", "agency_royalty_tiers", "agency_royalty_calculations",
];

const TABLES_PART_2 = [
  // Apogee Tickets
  "apogee_tickets", "apogee_ticket_comments", "apogee_ticket_attachments", 
  "apogee_ticket_history", "apogee_ticket_views", "apogee_ticket_statuses",
  "apogee_ticket_transitions", "apogee_ticket_user_roles", 
  "apogee_ticket_field_permissions", "apogee_ticket_tags",
  "apogee_impact_tags", "apogee_modules", "apogee_priorities", "apogee_owner_sides",
  "apogee_reported_by", "apogee_guides", "ticket_duplicate_suggestions",
  // Content & blocks
  "blocks", "apporteur_blocks", "categories", "documents", "sections", "favorites",
  // FAQ & chatbot
  "faq_categories", "faq_items", "chatbot_queries", "ai_search_cache",
  // RAG
  "rag_index_documents", "rag_index_jobs",
  // SAV
  "sav_dossier_overrides",
];

const TABLES_PART_3 = [
  // Messaging
  "conversations", "conversation_members", "messages",
  // Announcements
  "priority_announcements", "announcement_reads",
  // Visits & expenses
  "animator_visits", "expense_requests",
  // Fleet & holidays
  "fleet_vehicles", "french_holidays",
  // Maintenance
  "maintenance_events", "maintenance_alerts", "maintenance_plan_items", 
  "maintenance_plan_templates",
  // StatIA & metrics
  "metrics_definitions", "metrics_cache", "statia_custom_metrics", 
  "statia_metric_validations", "statia_widgets", "widget_templates",
  // User widgets & settings
  "user_widgets", "user_widget_preferences", "user_dashboard_settings", 
  "user_quick_notes", "user_actions_config", "user_history",
  "user_connection_logs", "user_calendar_connections", "user_creation_requests", 
  "user_consents",
  // App settings
  "app_notification_settings", "diffusion_settings", "feature_flags", 
  "storage_quota_alerts", "rate_limits", "page_metadata",
  // Franchiseur
  "franchiseur_agency_assignments", "franchiseur_roles",
  // Formation & tools
  "formation_content", "tools", "home_cards", "planning_signatures",
];

// Limites par table pour éviter les dépassements mémoire
const TABLE_LIMITS: Record<string, number> = {
  // Tables très lourdes - limite stricte
  "profiles": 100,
  "collaborators": 100,
  "collaborator_documents": 50,
  "support_tickets": 50,
  "support_messages": 30,
  "support_ticket_actions": 50,
  "live_support_sessions": 50,
  "live_support_messages": 30,
  "chatbot_queries": 50,
  "faq_items": 50,
  "messages": 30,
  "metrics_cache": 0, // Skip - regenerable
  "blocks": 100,
  "apporteur_blocks": 100,
  "apogee_tickets": 200,
  "apogee_ticket_comments": 500,
  "apogee_ticket_history": 200,
  "apogee_guides": 500,
  "user_connection_logs": 200,
  "rag_index_documents": 50,
  "rh_audit_log": 200,
  "document_access_logs": 100,
  "payslip_data": 200,
};

const DEFAULT_LIMIT = 300;

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

    // Parse request to get part number (1, 2, or 3)
    const url = new URL(req.url);
    const partParam = url.searchParams.get("part");
    
    // If no part specified, return metadata
    if (!partParam) {
      return withCors(req, new Response(
        JSON.stringify({
          total_parts: 3,
          parts: [
            { part: 1, tables_count: TABLES_PART_1.length, tables: TABLES_PART_1 },
            { part: 2, tables_count: TABLES_PART_2.length, tables: TABLES_PART_2 },
            { part: 3, tables_count: TABLES_PART_3.length, tables: TABLES_PART_3 },
          ],
          total_tables: TABLES_PART_1.length + TABLES_PART_2.length + TABLES_PART_3.length,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    const partNum = parseInt(partParam, 10);
    let tablesToExport: string[] = [];
    
    switch (partNum) {
      case 1:
        tablesToExport = TABLES_PART_1;
        break;
      case 2:
        tablesToExport = TABLES_PART_2;
        break;
      case 3:
        tablesToExport = TABLES_PART_3;
        break;
      default:
        return withCors(req, new Response(
          JSON.stringify({ error: "Part invalide (1, 2 ou 3)" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        ));
    }

    console.log(`[export-full-database] Part ${partNum}: exporting ${tablesToExport.length} tables`);

    const exportData: Record<string, unknown[]> = {
      _meta: [{
        export_date: new Date().toISOString(),
        part: partNum,
        tables_count: tablesToExport.length,
      }],
    };

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
          console.log(`[export-full-database] ${tableName}: ${data?.length ?? 0} rows`);
        }
      } catch (tableError) {
        exportData[tableName] = [{ _error: "Table not found" }];
      }
    }

    return withCors(req, new Response(JSON.stringify(exportData), {
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
