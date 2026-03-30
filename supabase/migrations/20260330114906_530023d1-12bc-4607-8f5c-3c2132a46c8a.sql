-- Drop function CASCADE (drops dependent policies)
DROP FUNCTION IF EXISTS public.has_module_option_v2(uuid, text, text) CASCADE;

-- Recreate function with new logic
CREATE OR REPLACE FUNCTION public.has_module_option_v2(_user_id uuid, _module_key text, _option_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM get_user_permissions(_user_id) p
    WHERE p.module_key = _module_key
    AND p.granted = true
    AND (p.options->>_option_key)::boolean = true
  )
$$;

-- Recreate RLS policies on collaborator_sensitive_data
CREATE POLICY sensitive_data_insert ON public.collaborator_sensitive_data
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collaborators c
    WHERE c.id = collaborator_sensitive_data.collaborator_id
    AND c.agency_id = get_user_agency_id(auth.uid())
    AND (has_module_option_v2(auth.uid(), 'rh', 'rh_admin') OR has_min_global_role(auth.uid(), 5))
  )
);

CREATE POLICY sensitive_data_rh_admin_access ON public.collaborator_sensitive_data
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM collaborators c
    WHERE c.id = collaborator_sensitive_data.collaborator_id
    AND c.agency_id = get_user_agency_id(auth.uid())
    AND (has_module_option_v2(auth.uid(), 'rh', 'rh_admin') OR has_min_global_role(auth.uid(), 5))
  )
);

CREATE POLICY sensitive_data_update ON public.collaborator_sensitive_data
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM collaborators c
    WHERE c.id = collaborator_sensitive_data.collaborator_id
    AND c.agency_id = get_user_agency_id(auth.uid())
    AND (has_module_option_v2(auth.uid(), 'rh', 'rh_admin') OR has_min_global_role(auth.uid(), 5))
  )
);

-- Recreate RLS policy on salary_history
CREATE POLICY salary_history_select ON public.salary_history
FOR SELECT TO authenticated
USING (
  has_min_global_role(auth.uid(), 6)
  OR EXISTS (
    SELECT 1 FROM employment_contracts ec
    WHERE ec.id = salary_history.contract_id
    AND (
      has_min_global_role(auth.uid(), 3)
      OR (
        ec.agency_id = get_user_agency_id(auth.uid())
        AND (has_min_global_role(auth.uid(), 2) OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin'))
      )
    )
  )
);

-- Recreate RLS policies on employee_salary_documents
CREATE POLICY esd_select ON public.employee_salary_documents
FOR SELECT TO authenticated
USING (
  agency_id = (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
  AND (has_min_global_role(auth.uid(), 2) OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin'))
);

CREATE POLICY esd_insert ON public.employee_salary_documents
FOR INSERT TO authenticated
WITH CHECK (
  agency_id = (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
  AND (has_min_global_role(auth.uid(), 2) OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin'))
);

CREATE POLICY esd_update ON public.employee_salary_documents
FOR UPDATE TO authenticated
USING (
  agency_id = (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
  AND (has_min_global_role(auth.uid(), 2) OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin'))
);

CREATE POLICY esd_delete ON public.employee_salary_documents
FOR DELETE TO authenticated
USING (
  agency_id = (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())
  AND (has_min_global_role(auth.uid(), 2) OR has_module_option_v2(auth.uid(), 'rh', 'rh_admin'))
);