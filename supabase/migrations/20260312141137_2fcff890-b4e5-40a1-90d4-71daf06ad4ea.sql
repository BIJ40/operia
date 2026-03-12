-- MIGRATION: reseau_franchiseur is now a role-based interface, not a module.
-- Update has_franchiseur_access to be purely role-based (N3+).
-- No module check needed anymore.

CREATE OR REPLACE FUNCTION public.has_franchiseur_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_min_global_role(_user_id, 3);
$$;

-- Also clean up any user_modules overrides for reseau_franchiseur
-- (they are now meaningless since access is role-based)
-- NOTE: We keep the data for audit trail but mark in comments
COMMENT ON FUNCTION public.has_franchiseur_access IS 'Role-based access check for Franchiseur interface (N3+). Module-based access removed 2026-03-12.';