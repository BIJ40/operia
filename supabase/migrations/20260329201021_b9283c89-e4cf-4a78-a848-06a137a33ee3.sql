-- Migration: Complete agence → agency_id migration (single transaction)
-- Drop ALL 6 policies depending on get_user_agency or profiles.agence

-- 1. Drop all dependent policies
DROP POLICY IF EXISTS "N1 can view same agency profiles" ON public.profiles;
DROP POLICY IF EXISTS "N2 can view same agency profiles" ON public.profiles;
DROP POLICY IF EXISTS statia_custom_metrics_insert ON public.statia_custom_metrics;
DROP POLICY IF EXISTS statia_custom_metrics_select ON public.statia_custom_metrics;
DROP POLICY IF EXISTS "N2+ users can manage their agency SAV overrides" ON public.sav_dossier_overrides;
DROP POLICY IF EXISTS "Users can view their agency SAV overrides" ON public.sav_dossier_overrides;
DROP POLICY IF EXISTS "N3 can insert requests for assigned agencies" ON public.user_creation_requests;
DROP POLICY IF EXISTS "N3 can view their agency requests" ON public.user_creation_requests;

-- 2. Drop and recreate get_user_agency as uuid
DROP FUNCTION IF EXISTS public.get_user_agency(uuid);
CREATE FUNCTION public.get_user_agency(_user_id uuid)
  RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$ SELECT agency_id FROM profiles WHERE id = _user_id $$;

-- 3. Recreate profiles policies
CREATE POLICY "N1 can view same agency profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (get_user_global_role_level(auth.uid()) = 1 AND agency_id IS NOT NULL AND agency_id = get_user_agency(auth.uid()));

CREATE POLICY "N2 can view same agency profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (get_user_global_role_level(auth.uid()) = 2 AND agency_id IS NOT NULL AND agency_id = get_user_agency(auth.uid()));

-- 4. Recreate sav_dossier_overrides policies (using agency_id)
CREATE POLICY "Users can view their agency SAV overrides" ON public.sav_dossier_overrides
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid() AND p.agency_id IS NOT NULL));

CREATE POLICY "N2+ users can manage their agency SAV overrides" ON public.sav_dossier_overrides
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid() AND p.agency_id IS NOT NULL
    AND p.global_role IN ('franchisee_admin','franchisor_user','franchisor_admin','platform_admin','superadmin')))
  WITH CHECK (agency_id IN (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid() AND p.agency_id IS NOT NULL
    AND p.global_role IN ('franchisee_admin','franchisor_user','franchisor_admin','platform_admin','superadmin')));

-- 5. Recreate user_creation_requests policies (using agency_id)
CREATE POLICY "N3 can insert requests for assigned agencies" ON public.user_creation_requests
  FOR INSERT TO authenticated
  WITH CHECK (has_min_global_role(auth.uid(), 2) AND (
    has_min_global_role(auth.uid(), 5)
    OR (has_min_global_role(auth.uid(), 2) AND agency_id IN (SELECT faa.agency_id FROM franchiseur_agency_assignments faa WHERE faa.user_id = auth.uid()))
    OR agency_id IN (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid() AND p.agency_id IS NOT NULL)
  ));

CREATE POLICY "N3 can view their agency requests" ON public.user_creation_requests
  FOR SELECT TO authenticated
  USING (
    has_min_global_role(auth.uid(), 5)
    OR requested_by = auth.uid()
    OR agency_id IN (SELECT faa.agency_id FROM franchiseur_agency_assignments faa WHERE faa.user_id = auth.uid())
    OR agency_id IN (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid() AND p.agency_id IS NOT NULL)
  );

-- 6. Drop legacy agence column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS agence;