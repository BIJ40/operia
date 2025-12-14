-- ===============================================
-- P1: RLS POLICIES FOR EMPLOYEE PORTAL (N1)
-- ===============================================

-- 1) collaborator_documents: N1 can SELECT only their own visible documents
CREATE POLICY "employees_can_view_own_visible_documents"
ON public.collaborator_documents
FOR SELECT
USING (
  employee_visible = true 
  AND collaborator_id IN (
    SELECT c.id FROM public.collaborators c 
    WHERE c.user_id = auth.uid()
  )
);

-- 2) rh_requests: N1 can SELECT/INSERT/UPDATE/DELETE only their own requests
CREATE POLICY "employees_can_manage_own_requests"
ON public.rh_requests
FOR ALL
USING (employee_user_id = auth.uid())
WITH CHECK (employee_user_id = auth.uid());

-- 3) rh_requests: N2+ can view/manage requests for their agency
CREATE POLICY "n2_can_manage_agency_requests"
ON public.rh_requests
FOR ALL
USING (
  has_min_global_role(auth.uid(), 2)
  AND agency_id = get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_min_global_role(auth.uid(), 2)
  AND agency_id = get_user_agency_id(auth.uid())
);

-- 4) user_signatures: users can manage their own signature only
CREATE POLICY "users_can_manage_own_signature"
ON public.user_signatures
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5) planning_signatures: N1 can view signatures for their tech_id
-- N1 can view planning signatures matching their apogee_user_id
CREATE POLICY "employees_can_view_own_planning_signatures"
ON public.planning_signatures
FOR SELECT
USING (
  tech_id = (
    SELECT c.apogee_user_id FROM public.collaborators c 
    WHERE c.user_id = auth.uid()
  )
);

-- N1 can sign their own planning
CREATE POLICY "employees_can_sign_own_planning"
ON public.planning_signatures
FOR INSERT
WITH CHECK (
  tech_id = (
    SELECT c.apogee_user_id FROM public.collaborators c 
    WHERE c.user_id = auth.uid()
  )
);

-- N1 can update their own planning signature
CREATE POLICY "employees_can_update_own_planning_signature"
ON public.planning_signatures
FOR UPDATE
USING (
  tech_id = (
    SELECT c.apogee_user_id FROM public.collaborators c 
    WHERE c.user_id = auth.uid()
  )
);