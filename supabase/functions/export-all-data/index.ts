import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

// Complete list of all public tables
const ALL_TABLES = [
  // Part 1 - Core users & agencies
  "profiles", "apogee_agencies", "agency_commercial_profile", "agency_stamps",
  "agency_rh_roles", "user_modules", "user_consents", "user_creation_requests",
  "franchiseur_roles", "franchiseur_agency_assignments", "agency_royalty_config",
  "agency_royalty_tiers", "agency_royalty_calculations", "french_holidays",
  "categories", "feature_flags", "page_metadata",
  // Part 2 - Collaborators & HR
  "collaborators", "collaborator_documents", "collaborator_sensitive_data",
  "collaborator_document_folders", "employment_contracts", "document_requests",
  "document_access_logs", "hr_generated_documents", "payslip_data", "salary_history",
  "rh_audit_log", "rh_notifications", "sensitive_data_access_log",
  "leave_requests", "leave_balances", "user_connection_logs", "user_history",
  // Part 3 - Support
  "support_tickets", "support_ticket_actions", "support_ticket_views",
  "support_attachments", "support_messages", "support_presence",
  "live_support_sessions", "live_support_messages", "typing_status",
  "user_presence", "chatbot_queries", "faq_categories", "faq_items",
  "ai_search_cache", "rag_index_documents", "rag_index_jobs", "formation_content",
  // Part 4 - Apogee Tickets
  "apogee_tickets", "apogee_ticket_comments", "apogee_ticket_attachments",
  "apogee_ticket_history", "apogee_ticket_views", "apogee_ticket_statuses",
  "apogee_ticket_transitions", "apogee_ticket_user_roles",
  "apogee_ticket_field_permissions", "apogee_ticket_tags", "apogee_impact_tags",
  "apogee_modules", "apogee_priorities", "apogee_owner_sides",
  "apogee_reported_by", "apogee_guides", "ticket_duplicate_suggestions",
  // Part 5 - Content & Messaging
  "blocks", "apporteur_blocks", "documents", "sections", "favorites",
  "conversations", "conversation_members", "messages", "priority_announcements",
  "announcement_reads", "home_cards", "tools", "planning_signatures",
  "sav_dossier_overrides", "user_calendar_connections", "user_actions_config",
  "user_quick_notes",
  // Part 6 - Fleet, Maintenance, StatIA & Settings
  "animator_visits", "expense_requests", "fleet_vehicles", "maintenance_events",
  "maintenance_alerts", "maintenance_plan_items", "maintenance_plan_templates",
  "metrics_definitions", "metrics_cache", "statia_custom_metrics",
  "statia_metric_validations", "statia_widgets", "widget_templates",
  "user_widgets", "user_widget_preferences", "user_dashboard_settings",
  "app_notification_settings", "diffusion_settings", "storage_quota_alerts",
  "rate_limits",
  // Apporteurs
  "apporteurs", "apporteur_contacts", "apporteur_users", "apporteur_managers",
  "apporteur_sessions", "apporteur_otp_codes", "apporteur_intervention_requests",
  "apporteur_invitation_links", "apporteur_project_links", "apporteur_access_logs",
  // Subscriptions & modules
  "agency_subscription", "agency_module_overrides", "plan_tiers", "plan_tier_modules",
  // EPI
  "epi_types", "epi_assignments", "epi_monthly_acks",
  // Misc
  "guide_chunks", "doc_templates", "doc_template_instances",
  "maintenance_settings", "activity_log", "agency_admin_documents",
  "apogee_ticket_support_exchanges", "monthly_reports",
  "technician_capacity_config", "push_subscriptions",
];

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    // Auth: require N5+
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return withCors(req, new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with anon client
    const anonClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims?.sub) {
      return withCors(req, new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    // Check N5+
    const serviceClient = createClient(supabaseUrl, supabaseService);
    const { data: profile } = await serviceClient.from('profiles').select('global_role').eq('id', claimsData.claims.sub).single();
    const level = { superadmin: 6, platform_admin: 5 }[profile?.global_role as string] ?? 0;
    if (level < 5) {
      return withCors(req, new Response(JSON.stringify({ error: 'Accès réservé N5+' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    }

    const url = new URL(req.url);
    const tableParam = url.searchParams.get('table');
    const countOnly = url.searchParams.get('countOnly');

    // Mode 1: List all tables (no counts - fast)
    if (!tableParam && !countOnly) {
      return withCors(req, new Response(JSON.stringify({ tables: ALL_TABLES.map(name => ({ name })), total: ALL_TABLES.length }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // Mode 2: Count rows for a batch of tables (max 20 at a time)
    if (countOnly) {
      const tableNames = countOnly.split(',').filter(t => ALL_TABLES.includes(t)).slice(0, 20);
      const results: { name: string; count: number }[] = [];
      for (const name of tableNames) {
        try {
          const { count } = await serviceClient.from(name).select('*', { count: 'exact', head: true });
          results.push({ name, count: count ?? 0 });
        } catch {
          results.push({ name, count: -1 });
        }
      }
      return withCors(req, new Response(JSON.stringify({ tables: results }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // Mode 3: Export a specific table page (paginated, not buffered)
    if (!ALL_TABLES.includes(tableParam)) {
      return withCors(req, new Response(JSON.stringify({ error: `Table "${tableParam}" non autorisée` }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const page = parseInt(url.searchParams.get('page') ?? '0', 10);
    if (!Number.isInteger(page) || page < 0) {
      return withCors(req, new Response(JSON.stringify({ error: 'Paramètre page invalide' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const isHeavyTable = tableParam === 'blocks';
    const defaultPageSize = isHeavyTable ? 25 : 100;
    const requestedPageSize = parseInt(url.searchParams.get('pageSize') ?? String(defaultPageSize), 10);
    const maxPageSize = isHeavyTable ? 50 : 200;
    const PAGE_SIZE = Math.min(Math.max(Number.isFinite(requestedPageSize) ? requestedPageSize : defaultPageSize, 10), maxPageSize);
    const offset = page * PAGE_SIZE;

    const { data, error } = await serviceClient
      .from(tableParam)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return withCors(req, new Response(JSON.stringify({ error: error.message, table: tableParam }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const rows = data ?? [];
    return withCors(req, new Response(JSON.stringify({ table: tableParam, page, pageSize: PAGE_SIZE, count: rows.length, hasMore: rows.length === PAGE_SIZE, data: rows }), {
      headers: { 'Content-Type': 'application/json' },
    }));

  } catch (err) {
    return withCors(req, new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
  }
});
