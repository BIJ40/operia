-- Recreate salary document policies with role restriction (N2+ = level 2, or rh_admin option)
-- Previous migration dropped old policies but failed on recreation

DROP POLICY IF EXISTS esd_select ON public.employee_salary_documents;
DROP POLICY IF EXISTS esd_insert ON public.employee_salary_documents;
DROP POLICY IF EXISTS esd_update ON public.employee_salary_documents;
DROP POLICY IF EXISTS esd_delete ON public.employee_salary_documents;

CREATE POLICY "esd_select" ON public.employee_salary_documents
  FOR SELECT TO authenticated
  USING (
    agency_id = (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2)
      OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin')
    )
  );

CREATE POLICY "esd_insert" ON public.employee_salary_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    agency_id = (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2)
      OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin')
    )
  );

CREATE POLICY "esd_update" ON public.employee_salary_documents
  FOR UPDATE TO authenticated
  USING (
    agency_id = (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2)
      OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin')
    )
  );

CREATE POLICY "esd_delete" ON public.employee_salary_documents
  FOR DELETE TO authenticated
  USING (
    agency_id = (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2)
      OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin')
    )
  );