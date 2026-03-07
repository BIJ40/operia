-- ============================================================================
-- SPRINT: Performance & Scalability indexes (tables confirmées)
-- ============================================================================

-- Tickets
CREATE INDEX IF NOT EXISTS idx_apogee_tickets_kanban_status_created
  ON public.apogee_tickets (kanban_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apogee_tickets_created_by_user
  ON public.apogee_tickets (created_by_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apogee_tickets_support_initiator
  ON public.apogee_tickets (support_initiator_user_id)
  WHERE support_initiator_user_id IS NOT NULL;

-- Ticket relations
CREATE INDEX IF NOT EXISTS idx_apogee_ticket_comments_ticket_id
  ON public.apogee_ticket_comments (ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apogee_ticket_history_ticket_id
  ON public.apogee_ticket_history (ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_support_exchanges_ticket
  ON public.apogee_ticket_support_exchanges (ticket_id, created_at DESC);

-- Permissions
CREATE INDEX IF NOT EXISTS idx_user_modules_user_id
  ON public.user_modules (user_id);

-- Collaborators
CREATE INDEX IF NOT EXISTS idx_collaborators_agency_id
  ON public.collaborators (agency_id, last_name ASC);

-- Activity log
CREATE INDEX IF NOT EXISTS idx_activity_log_agency_module
  ON public.activity_log (agency_id, module, created_at DESC);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id
  ON public.profiles (agency_id)
  WHERE agency_id IS NOT NULL;

-- Document requests
CREATE INDEX IF NOT EXISTS idx_document_requests_agency_status
  ON public.document_requests (agency_id, status, created_at DESC);

-- Apporteur sessions
CREATE INDEX IF NOT EXISTS idx_apporteur_sessions_expires
  ON public.apporteur_sessions (expires_at)
  WHERE revoked_at IS NULL;

-- Rate limits cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at
  ON public.rate_limits (created_at);

-- Announcement reads
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
  ON public.announcement_reads (user_id, announcement_id);

-- Global role constraint
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_global_role
  CHECK (global_role IS NULL OR global_role IN (
    'base_user', 'franchisee_user', 'franchisee_admin',
    'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'
  ));
