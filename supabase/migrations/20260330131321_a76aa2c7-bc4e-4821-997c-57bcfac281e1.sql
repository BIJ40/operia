
-- Fix 1: agency_suivi_settings - restrict UPDATE to agency members with N2+ role
DROP POLICY IF EXISTS "Authenticated users can update agency_suivi_settings" ON public.agency_suivi_settings;
CREATE POLICY "Agency admins can update own suivi settings" ON public.agency_suivi_settings
  FOR UPDATE TO authenticated
  USING (
    slug = (SELECT slug FROM apogee_agencies WHERE id = get_user_agency_id(auth.uid()))
    OR has_min_global_role(auth.uid(), 4)
  )
  WITH CHECK (
    slug = (SELECT slug FROM apogee_agencies WHERE id = get_user_agency_id(auth.uid()))
    OR has_min_global_role(auth.uid(), 4)
  );

-- Fix 2: agency_map_zone_communes - restrict write to agency members
DROP POLICY IF EXISTS "Users can manage their agency zone" ON public.agency_map_zone_communes;
CREATE POLICY "Users can manage own agency zones" ON public.agency_map_zone_communes
  FOR ALL TO authenticated
  USING (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 3)
  )
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    OR has_min_global_role(auth.uid(), 3)
  );

-- Fix 3: payments_clients_suivi - restrict SELECT to own agency
DROP POLICY IF EXISTS "Authenticated users can read payments_clients_suivi" ON public.payments_clients_suivi;
CREATE POLICY "Users can read own agency payments" ON public.payments_clients_suivi
  FOR SELECT TO authenticated
  USING (
    agency_slug = (SELECT slug FROM apogee_agencies WHERE id = get_user_agency_id(auth.uid()))
    OR has_min_global_role(auth.uid(), 4)
  );
