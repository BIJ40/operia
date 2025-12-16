-- Add SELECT policy for admins to see their agency's apporteurs
CREATE POLICY "Admin can select apporteurs for their agency"
ON public.apporteurs
FOR SELECT
USING (
  agency_id = get_user_agency_id(auth.uid())
  AND has_min_global_role(auth.uid(), 2)
);

-- Also drop duplicate INSERT policy (keeping the original one)
DROP POLICY IF EXISTS "Admin can insert apporteurs for their agency" ON public.apporteurs;