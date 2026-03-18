-- RLS Policy: N2 can manage user_modules for N1 users in their own agency
CREATE POLICY "N2 can manage N1 modules in own agency"
ON public.user_modules
FOR ALL
TO authenticated
USING (
  has_min_global_role(auth.uid(), 2)
  AND EXISTS (
    SELECT 1 FROM profiles p_target
    WHERE p_target.id = user_modules.user_id
      AND p_target.agency_id = get_user_agency_id(auth.uid())
      AND p_target.global_role = 'franchisee_user'
  )
)
WITH CHECK (
  has_min_global_role(auth.uid(), 2)
  AND EXISTS (
    SELECT 1 FROM profiles p_target
    WHERE p_target.id = user_modules.user_id
      AND p_target.agency_id = get_user_agency_id(auth.uid())
      AND p_target.global_role = 'franchisee_user'
  )
);