-- Add SELECT policy for agency admins on apporteur_intervention_requests
DROP POLICY IF EXISTS "apporteur_requests_select_admin" ON public.apporteur_intervention_requests;
CREATE POLICY "apporteur_requests_select_admin"
ON public.apporteur_intervention_requests FOR SELECT
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);