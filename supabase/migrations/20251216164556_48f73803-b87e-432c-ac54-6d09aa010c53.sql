-- Fix RLS policy for apporteurs INSERT - allow N2+ to create in their agency
DROP POLICY IF EXISTS "Admin can insert apporteurs for their agency" ON public.apporteurs;

CREATE POLICY "Admin can insert apporteurs for their agency"
ON public.apporteurs
FOR INSERT
WITH CHECK (
  agency_id = get_user_agency_id(auth.uid())
  AND has_min_global_role(auth.uid(), 2)
);