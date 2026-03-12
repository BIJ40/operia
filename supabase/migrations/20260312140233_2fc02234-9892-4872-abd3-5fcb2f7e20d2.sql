-- CRITICAL FIX: Ticketing access must be overwrite-only (plus platform bypass)
-- Prevent universal access for any authenticated profile.
CREATE OR REPLACE FUNCTION public.has_apogee_tickets_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_module_v2(_user_id, 'ticketing')
    OR public.has_min_global_role(_user_id, 5);
$$;