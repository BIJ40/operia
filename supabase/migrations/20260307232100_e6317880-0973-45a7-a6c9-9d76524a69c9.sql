-- ============================================================================
-- DB HYGIENE: Purge functions + constraints + indexes
-- ============================================================================

-- 1. Function to purge expired rate limits (older than 1 day)
CREATE OR REPLACE FUNCTION public.purge_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < (now() - interval '1 day');
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 2. Function to purge expired AI search cache
CREATE OR REPLACE FUNCTION public.purge_expired_ai_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.ai_search_cache
  WHERE created_at + (ttl_seconds || ' seconds')::interval < now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 3. CHECK constraint on heat_priority (apogee_tickets)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'apogee_tickets_heat_priority_range'
  ) THEN
    ALTER TABLE public.apogee_tickets
    ADD CONSTRAINT apogee_tickets_heat_priority_range
    CHECK (heat_priority >= 0 AND heat_priority <= 100);
  END IF;
END $$;

-- 4. Index on ai_search_cache.created_at for purge performance
CREATE INDEX IF NOT EXISTS idx_ai_search_cache_created_at
ON public.ai_search_cache (created_at);