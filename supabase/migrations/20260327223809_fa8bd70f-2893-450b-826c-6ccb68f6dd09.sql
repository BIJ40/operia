-- Fix agency_features RLS: use has_min_global_role instead of has_role
-- N4+ (franchisor_admin) can write, consistent with project standard

DROP POLICY IF EXISTS "agency_features_admin_write" ON public.agency_features;
DROP POLICY IF EXISTS "agency_features_select" ON public.agency_features;

-- SELECT: own agency OR N4+
CREATE POLICY "agency_features_select"
ON public.agency_features
FOR SELECT
USING (
  agency_id IN (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
  OR has_min_global_role(auth.uid(), 4)
);

-- ALL writes: N4+
CREATE POLICY "agency_features_admin_write"
ON public.agency_features
FOR ALL
USING (has_min_global_role(auth.uid(), 4))
WITH CHECK (has_min_global_role(auth.uid(), 4));