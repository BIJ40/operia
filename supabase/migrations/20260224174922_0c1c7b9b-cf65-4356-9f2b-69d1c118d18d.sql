-- Align ticketing module keys across backend checks
-- Users may have module_key = 'ticketing' (new) or 'apogee_tickets' (legacy)

CREATE OR REPLACE FUNCTION public.has_apogee_tickets_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- 1) profiles.enabled_modules (legacy cache)
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _user_id
        AND (
          COALESCE((enabled_modules->'apogee_tickets'->>'enabled')::boolean, false) = true
          OR COALESCE((enabled_modules->'ticketing'->>'enabled')::boolean, false) = true
        )
    )
    OR
    -- 2) user_modules (source of truth)
    EXISTS (
      SELECT 1
      FROM public.user_modules
      WHERE user_id = _user_id
        AND module_key IN ('apogee_tickets', 'ticketing')
    )
    OR
    -- 3) N5+ bypass
    public.has_min_global_role(_user_id, 5);
$$;