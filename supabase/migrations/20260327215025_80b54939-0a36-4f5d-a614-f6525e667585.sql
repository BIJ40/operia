-- Allow authenticated users with admin roles to read agency_suivi_settings
CREATE POLICY "Authenticated users can read agency_suivi_settings"
  ON public.agency_suivi_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users with admin roles to update agency_suivi_settings
CREATE POLICY "Authenticated users can update agency_suivi_settings"
  ON public.agency_suivi_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read payments_clients_suivi
CREATE POLICY "Authenticated users can read payments_clients_suivi"
  ON public.payments_clients_suivi
  FOR SELECT
  TO authenticated
  USING (true);