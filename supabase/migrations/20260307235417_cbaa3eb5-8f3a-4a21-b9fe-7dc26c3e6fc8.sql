
-- ============================================================================
-- Phase 3: Purge & Archive strategy for high-growth tables
-- ============================================================================

-- 1. Enhanced purge function for activity_log (keep last 6 months by default)
CREATE OR REPLACE FUNCTION public.purge_old_activity_logs(p_retention_months integer DEFAULT 6)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_cutoff timestamp with time zone;
BEGIN
  v_cutoff := now() - (p_retention_months || ' months')::interval;
  
  -- Archive to a summary before deleting (optional: only delete)
  DELETE FROM public.activity_log
  WHERE created_at < v_cutoff;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 2. Purge function for ticket history (keep last 12 months)
CREATE OR REPLACE FUNCTION public.purge_old_ticket_history(p_retention_months integer DEFAULT 12)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_cutoff timestamp with time zone;
BEGIN
  v_cutoff := now() - (p_retention_months || ' months')::interval;
  
  DELETE FROM public.apogee_ticket_history
  WHERE created_at < v_cutoff;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 3. Purge expired apporteur sessions (already indexed on expires_at)
CREATE OR REPLACE FUNCTION public.purge_expired_apporteur_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.apporteur_sessions
  WHERE expires_at < now() - interval '7 days'
    OR revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 4. Composite index for cursor-based pagination on activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_cursor 
  ON public.activity_log (created_at DESC, id);

-- 5. Composite index for cursor-based pagination on ticket history
CREATE INDEX IF NOT EXISTS idx_ticket_history_cursor 
  ON public.apogee_ticket_history (created_at DESC, id);
