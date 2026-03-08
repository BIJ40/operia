
-- Phase 5: Safe structural reinforcements
-- Remove duplicate indexes on collaborators table
-- idx_collaborators_user_id is a duplicate of collaborators_user_id_unique (both UNIQUE on user_id WHERE user_id IS NOT NULL)
DROP INDEX IF EXISTS public.idx_collaborators_user_id;

-- idx_collaborators_agency_id is a duplicate of idx_agency_collaborators_agency_id (both on agency_id)
DROP INDEX IF EXISTS public.idx_collaborators_agency_id;

-- Remove duplicate rate_limits cleanup index
-- idx_rate_limits_cleanup is identical to idx_rate_limits_created_at (both on created_at)
DROP INDEX IF EXISTS public.idx_rate_limits_cleanup;

-- Remove subset index on document_requests
-- document_requests_agency_status_idx (agency_id, status) is a subset of idx_document_requests_agency_status (agency_id, status, created_at DESC)
DROP INDEX IF EXISTS public.document_requests_agency_status_idx;

-- Add table comments for critical tables (documentation only, zero risk)
COMMENT ON TABLE public.profiles IS 'User profiles — source of truth for global_role, agency_id, agence slug. Synced bi-directionally with collaborators.';
COMMENT ON TABLE public.collaborators IS 'Agency collaborators (employees). Linked to profiles via user_id. Core of RH module.';
COMMENT ON TABLE public.apogee_tickets IS 'Development/product tickets (Apogee kanban). Not to be confused with support tickets.';
COMMENT ON TABLE public.user_modules IS 'Per-user module overrides. Combined with plan_tier_modules and module_registry by get_user_effective_modules().';
COMMENT ON TABLE public.module_registry IS 'Canonical module definitions. Source of truth for module deployment status, required plan, and min_role.';
COMMENT ON TABLE public.plan_tier_modules IS 'Legacy plan-based module grants. Being superseded by module_registry but still active in get_user_effective_modules().';
COMMENT ON TABLE public.agency_subscription IS 'Agency plan tier assignment (STARTER/PRO). Drives module access via get_user_effective_modules().';
COMMENT ON TABLE public.rate_limits IS 'Rate limiting entries for edge functions (create-user, reset-password, update-email). Purged daily.';
COMMENT ON TABLE public.activity_log IS 'Audit trail for entity changes. Written by track_entity_changes() trigger and log_activity() RPC.';
COMMENT ON TABLE public.rh_audit_log IS 'RH-specific audit log. Written by log_rh_action() RPC.';
COMMENT ON TABLE public.collaborator_sensitive_data IS 'Encrypted sensitive data (SSN, emergency contacts). Access only via sensitive-data Edge Function.';
COMMENT ON TABLE public.agency_rh_roles IS 'Per-agency RH role grants. Checked by has_agency_rh_role() function.';
COMMENT ON TABLE public.apogee_ticket_user_roles IS 'Ticket system role assignments (agent, admin, viewer). Checked by RLS policies.';
COMMENT ON TABLE public.blocks IS 'Knowledge base content blocks (guides). Largest table by size (~25MB).';
COMMENT ON TABLE public.apporteur_blocks IS 'Apporteur-specific content blocks (partner guides).';
COMMENT ON TABLE public.apporteur_sessions IS 'Autonomous auth sessions for apporteur managers. Custom token-based, not Supabase Auth.';
COMMENT ON TABLE public.apporteur_managers IS 'Apporteur company managers with autonomous OTP auth (not Supabase Auth users).';

-- Add comments on critical functions
COMMENT ON FUNCTION public.get_user_effective_modules(uuid) IS 'Computes effective module access for a user. Merges module_registry + plan_tier_modules + user_modules. N5+ bypasses min_role. Source of truth for module access.';
COMMENT ON FUNCTION public.has_min_global_role(uuid, integer) IS 'Checks if user has at least the given role level (0-6). Used extensively in RLS policies.';
COMMENT ON FUNCTION public.is_admin(uuid) IS 'Shorthand for has_min_global_role(uid, 5). Platform admin check.';
COMMENT ON FUNCTION public.is_support_agent(uuid) IS 'Checks aide.agent or support.agent module option. Used for support ticket access.';
COMMENT ON FUNCTION public.has_franchiseur_access(uuid) IS 'Checks reseau_franchiseur module or N3+ role. Used for network-level access.';
COMMENT ON FUNCTION public.has_apogee_tickets_access(uuid) IS 'Checks apogee_tickets or ticketing user_module, or N5+. Used for ticket RLS.';
