-- Fix RLS on rh_requests: use profiles.agency_id directly instead of get_user_agency_id()

-- Drop existing N2 policies if any
DROP POLICY IF EXISTS "n2_can_manage_agency_requests" ON public.rh_requests;
DROP POLICY IF EXISTS "n2_can_manage_agency_requests_v2" ON public.rh_requests;
DROP POLICY IF EXISTS "n2_can_select_agency_requests" ON public.rh_requests;
DROP POLICY IF EXISTS "n2_can_update_agency_requests" ON public.rh_requests;

-- N2+ can SELECT requests from their agency
CREATE POLICY "n2_can_select_agency_requests"
ON public.rh_requests
FOR SELECT
USING (
  has_min_global_role(auth.uid(), 2)
  AND agency_id = (SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- N2+ can UPDATE requests from their agency
CREATE POLICY "n2_can_update_agency_requests"
ON public.rh_requests
FOR UPDATE
USING (
  has_min_global_role(auth.uid(), 2)
  AND agency_id = (SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid())
)
WITH CHECK (
  has_min_global_role(auth.uid(), 2)
  AND agency_id = (SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid())
);