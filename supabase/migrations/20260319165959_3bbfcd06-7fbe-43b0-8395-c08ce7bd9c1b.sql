-- Allow ALL authenticated users to read module_registry (public catalog, not sensitive)
-- The old policy "N4+ can read module_registry" was too restrictive
-- and broke navigation for all non-admin users.

DROP POLICY IF EXISTS "N4+ can read module_registry" ON public.module_registry;

CREATE POLICY "Authenticated users can read module_registry"
  ON public.module_registry
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep the N5+ update policy as-is (only admins can modify)