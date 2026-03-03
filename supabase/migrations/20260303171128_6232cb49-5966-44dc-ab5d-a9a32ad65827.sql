
-- Drop the blocking policy
DROP POLICY IF EXISTS "No direct access to apporteur_managers" ON public.apporteur_managers;

-- Allow authenticated users to read managers for their agency
CREATE POLICY "Users can read apporteur_managers of their agency"
ON public.apporteur_managers
FOR SELECT
TO authenticated
USING (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
  OR public.has_min_global_role(auth.uid(), 4)
);

-- Allow N2+ to insert/update managers for their agency
CREATE POLICY "N2plus can manage apporteur_managers"
ON public.apporteur_managers
FOR ALL
TO authenticated
USING (
  (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()) AND public.has_min_global_role(auth.uid(), 2))
  OR public.has_min_global_role(auth.uid(), 4)
)
WITH CHECK (
  (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()) AND public.has_min_global_role(auth.uid(), 2))
  OR public.has_min_global_role(auth.uid(), 4)
);
