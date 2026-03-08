/**
 * Edge Function: export-full-database
 * Export de la base de données en 6 parties pour éviter les limites mémoire
 * Usage: backup, migration, livraison client
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";
import { requireAal2 } from '../_shared/mfa.ts';
import { getRoleLevel } from '../_shared/roles.ts';

// Tables avec embeddings - EXCLUES car régénérables via RAG indexing
const EXCLUDED_EMBEDDING_TABLES = [
  "guide_chunks",
  "ticket_embeddings",
  "knowledge_base",
];

// Part 1 - Core users & agencies (~17 tables)
const TABLES_PART_1 = [
  "profiles",
  "apogee_agencies",
  "agency_commercial_profile",
  "agency_stamps",
  "agency_rh_roles",
  "user_modules",
  "user_consents",
  "user_creation_requests",
  "franchiseur_roles",
  "franchiseur_agency_assignments",
  "agency_royalty_config",
  "agency_royalty_tiers",
  "agency_royalty_calculations",
  "french_holidays",
  "categories",
  "feature_flags",
  "page_metadata",
];

// Part 2 - Collaborators & HR Documents (~17 tables)
const TABLES_PART_2 = [
  "collaborators",
  "collaborator_documents",
  "collaborator_sensitive_data",
  "collaborator_document_folders",
  "employment_contracts",
  "document_requests",
  "document_access_logs",
  "hr_generated_documents",
  "payslip_data",
  "salary_history",
  "rh_audit_log",
  "rh_notifications",
  "sensitive_data_access_log",
  "leave_requests",
  "leave_balances",
  "user_connection_logs",
  "user_history",
];

// Part 3 - Support & Live Support (~17 tables)
const TABLES_PART_3 = [
  "support_tickets",
  "support_ticket_actions",
  "support_ticket_views",
  "support_attachments",
  "support_messages",
  "support_presence",
  "live_support_sessions",
  "live_support_messages",
  "typing_status",
  "user_presence",
  "chatbot_queries",
  "faq_categories",
  "faq_items",
  "ai_search_cache",
  "rag_index_documents",
  "rag_index_jobs",
  "formation_content",
];

// Part 4 - Apogee Tickets (~17 tables)
const TABLES_PART_4 = [
  "apogee_tickets",
  "apogee_ticket_comments",
  "apogee_ticket_attachments",
  "apogee_ticket_history",
  "apogee_ticket_views",
  "apogee_ticket_statuses",
  "apogee_ticket_transitions",
  "apogee_ticket_user_roles",
  "apogee_ticket_field_permissions",
  "apogee_ticket_tags",
  "apogee_impact_tags",
  "apogee_modules",
  "apogee_priorities",
  "apogee_owner_sides",
  "apogee_reported_by",
  "apogee_guides",
  "ticket_duplicate_suggestions",
];

// Part 5 - Content Blocks & Messaging (~17 tables)
const TABLES_PART_5 = [
  "blocks",
  "apporteur_blocks",
  "documents",
  "sections",
  "favorites",
  "conversations",
  "conversation_members",
  "messages",
  "priority_announcements",
  "announcement_reads",
  "home_cards",
  "tools",
  "planning_signatures",
  "sav_dossier_overrides",
  "user_calendar_connections",
  "user_actions_config",
  "user_quick_notes",
];

// Part 6 - Fleet, Maintenance, StatIA & Settings (~17 tables)
const TABLES_PART_6 = [
  "animator_visits",
  "expense_requests",
  "fleet_vehicles",
  "maintenance_events",
  "maintenance_alerts",
  "maintenance_plan_items",
  "maintenance_plan_templates",
  "metrics_definitions",
  "metrics_cache",
  "statia_custom_metrics",
  "statia_metric_validations",
  "statia_widgets",
  "widget_templates",
  "user_widgets",
  "user_widget_preferences",
  "user_dashboard_settings",
  "app_notification_settings",
  "diffusion_settings",
  "storage_quota_alerts",
  "rate_limits",
];

// Limites par table pour éviter les dépassements mémoire
// CRITICAL: blocks contient du HTML volumineux, limites très basses
const TABLE_LIMITS: Record<string, number> = {
  "profiles": 200,
  "collaborators": 200,
  "collaborator_documents": 100,
  "support_tickets": 100,
  "support_messages": 50,
  "support_ticket_actions": 100,
  "live_support_sessions": 100,
  "live_support_messages": 50,
  "chatbot_queries": 100,
  "faq_items": 100,
  "messages": 50,
  "metrics_cache": 0, // Skip - regenerable
  // Part 5 - Tables volumineuses avec HTML/contenu
  "blocks": 50, // Contenu HTML très volumineux
  "apporteur_blocks": 50, // Contenu HTML très volumineux
  "documents": 100,
  // Part 4 - Tickets
  "apogee_tickets": 200,
  "apogee_ticket_comments": 200,
  "apogee_ticket_history": 200,
  "apogee_guides": 200,
  // Autres
  "user_connection_logs": 200,
  "rag_index_documents": 100,
  "rh_audit_log": 200,
  "document_access_logs": 100,
  "payslip_data": 200,
  "formation_content": 50, // Contenu volumineux
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

    const url = new URL(req.url);
    const partParam = url.searchParams.get("part");
    
    // If no part specified, return metadata
    if (!partParam) {
      return withCors(req, new Response(
        JSON.stringify({
          total_parts: 6,
          parts: [
            { part: 1, tables_count: TABLES_PART_1.length, description: "Core users & agencies" },
            { part: 2, tables_count: TABLES_PART_2.length, description: "Collaborators & HR Documents" },
            { part: 3, tables_count: TABLES_PART_3.length, description: "Support & Live Support" },
            { part: 4, tables_count: TABLES_PART_4.length, description: "Apogee Tickets" },
            { part: 5, tables_count: TABLES_PART_5.length, description: "Content Blocks & Messaging" },
            { part: 6, tables_count: TABLES_PART_6.length, description: "Fleet, Maintenance, StatIA & Settings" },
          ],
          total_tables: TABLES_PART_1.length + TABLES_PART_2.length + TABLES_PART_3.length + 
                        TABLES_PART_4.length + TABLES_PART_5.length + TABLES_PART_6.length,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ));
    }

    const partNum = parseInt(partParam, 10);
    const partsMap: Record<number, string[]> = {
      1: TABLES_PART_1,
      2: TABLES_PART_2,
      3: TABLES_PART_3,
      4: TABLES_PART_4,
      5: TABLES_PART_5,
      6: TABLES_PART_6,
    };

    const tablesToExport = partsMap[partNum];
    if (!tablesToExport) {
      return withCors(req, new Response(
        JSON.stringify({ error: "Part invalide (1-6)" }),
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
        
        // Skip tables with limit 0
        if (tableLimit === 0) {
          exportData[tableName] = [{ _skipped: "regenerable" }];
          continue;
        }
        
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
